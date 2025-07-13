const express = require('express');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const Application = require('../models/Application');

const router = express.Router();

// Multer setup: store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Required columns for Application
const REQUIRED_COLUMNS = ['Application Name', 'Vendor', 'Product', 'Version', 'Status'];

// Helper: Parse tab-delimited TXT
function parseTabDelimitedTxt(buffer) {
  const content = buffer.toString('utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { data: [], errors: ['File is empty.'] };

  const headers = lines[0].split('\t').map(h => h.trim());
  const errors = [];
  // Check required columns
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      errors.push(`Missing required column: ${col}`);
    }
  }
  if (errors.length) return { data: [], errors };

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split('\t');
    if (row.length !== headers.length) {
      errors.push(`Row ${i + 1}: Column count mismatch.`);
      continue;
    }
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx].trim();
    });
    data.push(obj);
  }
  return { data, errors };
}

// Helper: Parse XLSX
function parseXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const errors = [];
  // Check required columns
  for (const col of REQUIRED_COLUMNS) {
    if (!Object.keys(json[0] || {}).includes(col)) {
      errors.push(`Missing required column: ${col}`);
    }
  }
  return { data: json, errors };
}

// Helper: Parse CSV
function parseCsv(buffer) {
  const content = buffer.toString('utf8');
  let records = [];
  let errors = [];
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    // Check required columns
    for (const col of REQUIRED_COLUMNS) {
      if (!Object.keys(records[0] || {}).includes(col)) {
        errors.push(`Missing required column: ${col}`);
      }
    }
  } catch (err) {
    errors.push('CSV parsing error: ' + err.message);
  }
  return { data: records, errors };
}

// POST /api/bulk-upload/applications (supports txt, xlsx, csv)
router.post('/applications', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ errors: ['No file uploaded.'] });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    let parsed = { data: [], errors: [] };
    if (ext === '.txt') {
      parsed = parseTabDelimitedTxt(req.file.buffer);
    } else if (ext === '.xlsx') {
      parsed = parseXlsx(req.file.buffer);
    } else if (ext === '.csv') {
      parsed = parseCsv(req.file.buffer);
    } else {
      return res.status(400).json({ errors: ['Only .txt, .xlsx, and .csv files are supported.'] });
    }
    // Basic row validation (required fields not empty)
    const rowErrors = [];
    parsed.data.forEach((row, idx) => {
      REQUIRED_COLUMNS.forEach(col => {
        if (!row[col] || row[col].length === 0) {
          rowErrors.push(`Row ${idx + 2}: Missing value for '${col}'.`);
        }
      });
    });
    const allErrors = (parsed.errors || []).concat(rowErrors);
    if (allErrors.length) {
      return res.status(400).json({ errors: allErrors, preview: parsed.data });
    }
    // Save to DB: map fields and skip duplicates (name+version+vendor)
    const toInsert = [];
    for (const row of parsed.data) {
      // Normalize status to lowercase
      const status = row['Status'] ? row['Status'].toLowerCase() : 'unknown';
      toInsert.push({
        name: row['Application Name'],
        vendor: row['Vendor'],
        product: row['Product'],
        version: String(row['Version']),
        status,
        createdBy: '687343b584dff78b71a49edf'
      });
    }
    // Find existing (by name+version+vendor)
    const existing = await Application.find({
      $or: toInsert.map(app => ({
        name: app.name,
        version: app.version,
        vendor: app.vendor
      }))
    });
    const existingSet = new Set(existing.map(e => `${e.name}|${e.version}|${e.vendor}`));
    const filtered = toInsert.filter(app => !existingSet.has(`${app.name}|${app.version}|${app.vendor}`));
    let inserted = [];
    if (filtered.length > 0) {
      inserted = await Application.insertMany(filtered);
    }
    return res.json({
      inserted: inserted.length,
      skipped: toInsert.length - inserted.length,
      preview: inserted,
      message: `Inserted ${inserted.length}, skipped ${toInsert.length - inserted.length} (duplicates).`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ errors: ['Server error.'] });
  }
});

module.exports = router; 