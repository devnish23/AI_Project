const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const advisorySchema = new mongoose.Schema({ advisoryId: String }, { strict: false });
const Advisory = mongoose.models.RedHatAdvisory || mongoose.model('RedHatAdvisory', advisorySchema);
const WindowsAdvisory = require('../models/WindowsAdvisory');
const ESXiAdvisory = require('../models/ESXiAdvisory');
const VCenterAdvisory = require('../models/VCenterAdvisory');
const CyberArkAdvisory = require('../models/CyberArkAdvisory');
const RSAAdvisory = require('../models/RSAAdvisory');
const SolarWindsAdvisory = require('../models/SolarWindsAdvisory');
const McAfeeAdvisory = require('../models/McAfeeAdvisory');
const NessusAdvisory = require('../models/NessusAdvisory');

// GET /api/patches/redhat - latest advisories
router.get('/redhat', async (req, res) => {
  try {
    const advisories = await Advisory.find().sort({ issued: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patches/windows - latest Windows advisories
router.get('/windows', async (req, res) => {
  try {
    const advisories = await WindowsAdvisory.find().sort({ publishDate: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patches/esxi
router.get('/esxi', async (req, res) => {
  try {
    const advisories = await ESXiAdvisory.find().sort({ publishDate: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/patches/vcenter
router.get('/vcenter', async (req, res) => {
  try {
    const advisories = await VCenterAdvisory.find().sort({ publishDate: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/patches/cyberark
router.get('/cyberark', async (req, res) => {
  try {
    const advisories = await CyberArkAdvisory.find().sort({ publishDate: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/patches/rsa
router.get('/rsa', async (req, res) => {
  try {
    const advisories = await RSAAdvisory.find().sort({ publishDate: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/patches/solarwinds
router.get('/solarwinds', async (req, res) => {
  try {
    const advisories = await SolarWindsAdvisory.find().sort({ publishDate: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/patches/mcafee
router.get('/mcafee', async (req, res) => {
  try {
    const advisories = await McAfeeAdvisory.find().sort({ publishDate: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/patches/nessus
router.get('/nessus', async (req, res) => {
  try {
    const advisories = await NessusAdvisory.find().sort({ publishDate: -1 }).limit(100);
    res.json(advisories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 