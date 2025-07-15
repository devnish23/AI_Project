// scripts/scrapeRedHatAdvisories.js
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infra-tracker';

// MongoDB model
const advisorySchema = new mongoose.Schema({ advisoryId: String }, { strict: false });
const Advisory = mongoose.model('RedHatAdvisory', advisorySchema);

async function connectDB() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
}

async function scrapeAdvisoriesPage(page = 1) {
  const url = `https://access.redhat.com/security/security-updates/security-advisories?page=${page}`;
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (InfraTrackerBot)' }
  });
  const $ = cheerio.load(data);

  const advisories = [];
  $('table tbody tr').each((_, el) => {
    const tds = $(el).find('td');
    const advisoryId = $(tds[0]).text().trim();
    const advisoryLink = 'https://access.redhat.com' + $(tds[0]).find('a').attr('href');
    const synopsis = $(tds[1]).text().trim();
    const severity = $(tds[2]).text().trim();
    const product = $(tds[3]).text().trim();
    const issued = $(tds[4]).text().trim();

    advisories.push({
      advisoryId,
      advisoryLink,
      synopsis,
      severity,
      product,
      issued
    });
  });
  return advisories;
}

async function saveAdvisories(advisories) {
  for (const adv of advisories) {
    await Advisory.updateOne({ advisoryId: adv.advisoryId }, adv, { upsert: true });
  }
  console.log(`Saved/updated ${advisories.length} advisories`);
}

async function main() {
  await connectDB();

  // Scrape first 3 pages (change as needed)
  let allAdvisories = [];
  for (let page = 1; page <= 3; page++) {
    console.log(`Scraping page ${page}...`);
    const advisories = await scrapeAdvisoriesPage(page);
    allAdvisories = allAdvisories.concat(advisories);
  }
  await saveAdvisories(allAdvisories);

  mongoose.disconnect();
  console.log('Done!');
}

module.exports = async function scrapeRedHatAdvisories() {
  await connectDB();

  // Scrape first 3 pages (change as needed)
  let allAdvisories = [];
  for (let page = 1; page <= 3; page++) {
    console.log(`Scraping page ${page}...`);
    const advisories = await scrapeAdvisoriesPage(page);
    allAdvisories = allAdvisories.concat(advisories);
  }
  await saveAdvisories(allAdvisories);

  mongoose.disconnect();
  console.log('Done!');
};

if (require.main === module) {
  scrapeRedHatAdvisories().then(() => process.exit(0));
}