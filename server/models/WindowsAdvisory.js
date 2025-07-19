const mongoose = require('mongoose');

const windowsAdvisorySchema = new mongoose.Schema({
  kbNumber: String,
  title: String,
  severity: String,
  products: String,
  publishDate: String,
  cves: [String],
  link: String
}, { strict: false });

module.exports = mongoose.models.WindowsAdvisory || mongoose.model('WindowsAdvisory', windowsAdvisorySchema); 