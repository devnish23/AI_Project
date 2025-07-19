const mongoose = require('mongoose');

const cyberArkAdvisorySchema = new mongoose.Schema({
  advisoryId: String,
  title: String,
  severity: String,
  products: String,
  version: String,
  publishDate: String,
  cves: [String],
  link: String
}, { strict: false });

module.exports = mongoose.models.CyberArkAdvisory || mongoose.model('CyberArkAdvisory', cyberArkAdvisorySchema); 