const express = require('express');
const router = express.Router();
const { addOrUpdateSchedule, removeSchedule } = require('../scheduler');
const Schedule = require('../models/Schedule');
const scrapeRedHatAdvisories = require('../../scripts/scrapeRedHatAdvisories');

// Create or update a schedule
router.post('/', async (req, res) => {
  const schedule = req.body;
  await addOrUpdateSchedule(schedule);
  res.json({ success: true });
});

// Delete a schedule
router.delete('/:id', async (req, res) => {
  await removeSchedule(req.params.id);
  res.json({ success: true });
});

// List all schedules
router.get('/', async (req, res) => {
  const schedules = await Schedule.find();
  res.json(schedules);
});

// Run a schedule immediately
router.post('/:id/run', async (req, res) => {
  const schedule = await Schedule.findById(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  if (schedule.script === 'scrapeRedHatAdvisories') {
    await scrapeRedHatAdvisories();
    return res.json({ success: true, message: 'Red Hat Advisories script executed.' });
  }
  // Add more scripts as needed
  res.status(400).json({ error: 'Script not supported.' });
});

module.exports = router; 