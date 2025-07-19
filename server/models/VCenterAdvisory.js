const mongoose = require('mongoose');

const vcenterAdvisorySchema = new mongoose.Schema({
  advisoryId: String,
  title: String,
  severity: String,
  products: String,
  version: String,
  publishDate: String,
  cves: [String],
  link: String
}, { strict: false });

module.exports = mongoose.models.VCenterAdvisory || mongoose.model('VCenterAdvisory', vcenterAdvisorySchema); 