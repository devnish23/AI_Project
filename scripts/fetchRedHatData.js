const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// --- MongoDB Models ---
const advisorySchema = new mongoose.Schema({ errata_id: String }, { strict: false });
const cveSchema = new mongoose.Schema({ cve: String }, { strict: false });
const eolSchema = new mongoose.Schema({ product_name: String }, { strict: false });

const Advisory = mongoose.model('RedHatAdvisory', advisorySchema);
const CVE = mongoose.model('RedHatCVE', cveSchema);
const EOL = mongoose.model('RedHatEOL', eolSchema);

// --- Connect to MongoDB ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infra-tracker';

async function connectDB() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
}

const axiosConfig = { headers: { 'User-Agent': 'Mozilla/5.0 (InfraTrackerBot)' } };

// --- Fetch Red Hat Advisories ---
async function fetchAdvisories(product = 'Red Hat Enterprise Linux', limit = 20) {
  const url = `https://access.redhat.com/labs/securitydataapi/errata.json?product=${encodeURIComponent(product)}&per_page=${limit}`;
  const { data } = await axios.get(url, axiosConfig);
  return data;
}

// --- Fetch Red Hat CVEs ---
async function fetchCVEs(product = 'Red Hat Enterprise Linux', limit = 20) {
  const url = `https://access.redhat.com/labs/securitydataapi/cve.json?product=${encodeURIComponent(product)}&per_page=${limit}`;
  const { data } = await axios.get(url, axiosConfig);
  return data;
}

// --- Fetch Red Hat EOL/EOSL ---
async function fetchEOL(product = 'Red Hat Enterprise Linux') {
  const url = `https://access.redhat.com/labs/securitydataapi/lifecycle.json?product=${encodeURIComponent(product)}`;
  const { data } = await axios.get(url, axiosConfig);
  return data;
}

// --- Save to MongoDB ---
async function saveAdvisories(advisories) {
  for (const adv of advisories) {
    await Advisory.updateOne({ errata_id: adv.errata_id }, adv, { upsert: true });
  }
  console.log(`Saved ${advisories.length} advisories`);
}

async function saveCVEs(cves) {
  for (const cve of cves) {
    await CVE.updateOne({ cve: cve.cve }, cve, { upsert: true });
  }
  console.log(`Saved ${cves.length} CVEs`);
}

async function saveEOL(eolList) {
  for (const eol of eolList) {
    await EOL.updateOne({ product_name: eol.product_name }, eol, { upsert: true });
  }
  console.log(`Saved ${eolList.length} EOL/EOSL records`);
}

// --- Main ---
async function main() {
  await connectDB();

  const advisories = await fetchAdvisories();
  await saveAdvisories(advisories);

  const cves = await fetchCVEs();
  await saveCVEs(cves);

  const eolList = await fetchEOL();
  await saveEOL(eolList);

  mongoose.disconnect();
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 