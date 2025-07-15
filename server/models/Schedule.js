const mongoose = require('mongoose');
const scheduleSchema = new mongoose.Schema({
  script: { type: String, required: true },
  cron: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  // Add more fields as needed (e.g., frequency, time, user, etc.)
});
module.exports = mongoose.model('Schedule', scheduleSchema); 