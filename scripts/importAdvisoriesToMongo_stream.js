// scripts/importAdvisoriesToMongo_stream.js
// Stream advisories from rhel_security_advisories.json into MongoDB using stream-json

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Streaming JSON parser
let StreamArray;
try {
  StreamArray = require('stream-json/streamers/StreamArray');
} catch (e) {
  console.error('❌ stream-json not found. Please run: npm install stream-json');
  process.exit(1);
}

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'infra-tracker';
const COLLECTION = 'redhatadvisories';
const INPUT_FILE = 'rhel_security_advisories.json';

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  // Open MongoDB connection
  const client = new MongoClient(MONGO_URL, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  let inserted = 0, skipped = 0, total = 0;

  // First, find the start of the advisories array
  const fileStream = fs.createReadStream(INPUT_FILE);
  let foundArray = false;
  let advisoriesStream;

  // Find the start of the advisories array
  const readline = require('readline');
  const rl = readline.createInterface({ input: fileStream });
  let startPos = 0;
  for await (const line of rl) {
    if (line.includes('"advisories"')) {
      foundArray = true;
      startPos = fileStream.bytesRead;
      break;
    }
  }
  rl.close();
  fileStream.close();

  if (!foundArray) {
    console.error('❌ Could not find advisories array in input file.');
    process.exit(1);
  }

  // Now stream the advisories array
  const { chain } = require('stream-chain');
  const { parser } = require('stream-json');
  const { pick } = require('stream-json/filters/Pick');
  const { streamArray } = require('stream-json/streamers/StreamArray');

  const pipeline = chain([
    fs.createReadStream(INPUT_FILE),
    parser(),
    pick({ filter: 'advisories' }),
    streamArray()
  ]);

  for await (const { value: adv } of pipeline) {
    total++;
    const advisoryId = adv.advisoryId || adv.advisory;
    if (!advisoryId) {
      skipped++;
      continue;
    }
    // Check document size (in bytes)
    const docSize = Buffer.byteLength(JSON.stringify(adv), 'utf8');
    if (docSize > 15 * 1024 * 1024) { // 15MB
      console.warn(`⚠️  Skipping oversized advisory: ${advisoryId} (${docSize} bytes)`);
      skipped++;
      continue;
    }
    // Avoid duplicates
    const exists = await collection.findOne({ $or: [
      { advisoryId },
      { advisory: advisoryId },
    ] });
    if (exists) {
      skipped++;
      continue;
    }
    await collection.insertOne(adv);
    inserted++;
    if (inserted % 10 === 0) {
      console.log(`Inserted: ${inserted}, Skipped: ${skipped}, Processed: ${total}`);
    }
  }

  await client.close();
  console.log(`\n✅ Import complete. Inserted: ${inserted}, Skipped: ${skipped}, Total processed: ${total}`);
}

if (require.main === module) {
  main();
} 