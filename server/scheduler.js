const cron = require('node-cron');
const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');
const scrapeRedHatAdvisories = require('../scripts/scrapeRedHatAdvisories');

const jobs = {};

async function loadSchedulesAndStart() {
  const schedules = await Schedule.find({ enabled: true });
  schedules.forEach(schedule => {
    if (jobs[schedule._id]) jobs[schedule._id].stop();
    jobs[schedule._id] = cron.schedule(schedule.cron, async () => {
      if (schedule.script === 'scrapeRedHatAdvisories') {
        await scrapeRedHatAdvisories();
      }
      // Add more scripts as needed
    });
  });
}

async function addOrUpdateSchedule(schedule) {
  if (schedule._id) {
    await Schedule.findOneAndUpdate({ _id: schedule._id }, schedule, { upsert: true });
  } else {
    await Schedule.create(schedule);
  }
  await loadSchedulesAndStart();
}

async function removeSchedule(scheduleId) {
  if (jobs[scheduleId]) {
    jobs[scheduleId].stop();
    delete jobs[scheduleId];
  }
  await Schedule.deleteOne({ _id: scheduleId });
}

module.exports = { loadSchedulesAndStart, addOrUpdateSchedule, removeSchedule }; 