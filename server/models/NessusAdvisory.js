const mongoose = require('mongoose');

const nessusAdvisorySchema = new mongoose.Schema({
  advisoryId: String,
  title: String,
  severity: String,
  products: String,
  version: String,
  publishDate: String,
  cves: [String],
  link: String
}, { strict: false });

module.exports = mongoose.models.NessusAdvisory || mongoose.model('NessusAdvisory', nessusAdvisorySchema); 