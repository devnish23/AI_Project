const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const advisorySchema = new mongoose.Schema({ advisoryId: String }, { strict: false });
const Advisory = mongoose.models.RedHatAdvisory || mongoose.model('RedHatAdvisory', advisorySchema);

// GET /api/patches/redhat - latest advisories
router.get('/redhat', async (req, res) => {
  try {
    const advisories = await Advisory.find().sort({ issued: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 