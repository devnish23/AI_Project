// scripts/importAdvisoriesToMongo.js
// Imports advisories from JSON to MongoDB (infra-tracker.redhatadvisories)

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://localhost:5000';
const DB_NAME = 'infra-tracker';
const COLLECTION = 'redhatadvisories';

// Try both possible output files
const possibleFiles = [
  'rhel_security_advisories.json',
  path.join('client', 'public', 'rhel_security_advisories.json'),
];

function findInputFile() {
  for (const file of possibleFiles) {
    if (fs.existsSync(file)) return file;
  }
  return null;
}

async function main() {
  const inputFile = findInputFile();
  if (!inputFile) {
    console.error('❌ No advisories JSON file found.');
    process.exit(1);
  }
  console.log(`📂 Using input file: ${inputFile}`);

  let data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  let advisories = Array.isArray(data) ? data : (data.advisories || []);
  if (!Array.isArray(advisories) || advisories.length === 0) {
    console.error('❌ No advisories found in the input file.');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URL, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    let inserted = 0, skipped = 0;
    for (const adv of advisories) {
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
    }
    console.log(`✅ Import complete. Inserted: ${inserted}, Skipped (duplicates/missing ID): ${skipped}`);
  } catch (err) {
    console.error('💥 Error during import:', err.message);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main();
} 