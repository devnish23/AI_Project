// scripts/checkAdvisoriesInMongo.js
// Checks and prints summary of advisories in MongoDB

const { MongoClient } = require('mongodb');

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'infra-tracker';
const COLLECTION = 'redhatadvisories';

async function main() {
  const client = new MongoClient(MONGO_URL, { useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    const total = await collection.countDocuments();
    console.log(`Total advisories in DB: ${total}`);

    const first5 = await collection.find({}, { projection: { _id: 0 } }).limit(40).toArray();
    console.log('\nFirst 5 advisories:');
    first5.forEach((adv, idx) => {
      console.log(`\n#${idx + 1}`);
      console.log(`Advisory: ${adv.advisory || adv.advisoryId}`);
      console.log(`Severity: ${adv.severity}`);
      console.log(`Publish Date: ${adv.publishDate}`);
      console.log(`Link: ${adv.link}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main();
} 