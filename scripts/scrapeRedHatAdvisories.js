// scripts/scrapeRedHatAdvisories.js
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
require('dotenv').config();
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infra-tracker';

// MongoDB model
const advisorySchema = new mongoose.Schema({ advisoryId: String }, { strict: false });
const Advisory = mongoose.models.RedHatAdvisory || mongoose.model('RedHatAdvisory', advisorySchema);

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
    const products = $(tds[3]).text().trim();
    const publishDate = $(tds[4]).text().trim();

    advisories.push({
      advisoryId,
      advisoryLink,
      synopsis,
      severity,
      products,
      publishDate
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

  // Scrape only the first page for testing
  let allAdvisories = [];
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  for (let page = 1; page <= 1; page++) {
    console.log(`Scraping page ${page}...`);
    const advisories = await scrapeAdvisoriesPage(page);
    console.log('Advisories found:', advisories.length);
    // Filter for Red Hat Enterprise Linux and published today
    const filtered = advisories.filter(adv =>
      adv.products && adv.products.includes('Red Hat Enterprise Linux') &&
      adv.publishDate && adv.publishDate.includes(today)
    );
    allAdvisories = allAdvisories.concat(filtered);
  }
  // Output to text file
  fs.writeFileSync('rhel_advisories_today.txt', JSON.stringify(allAdvisories, null, 2));
  console.log(`Saved ${allAdvisories.length} advisories to rhel_advisories_today.txt`);

  mongoose.disconnect();
  console.log('Done!');
}

const scrapeRedHatAdvisories = main;
module.exports = scrapeRedHatAdvisories;

if (require.main === module) {
  scrapeRedHatAdvisories().then(() => process.exit(0));
}