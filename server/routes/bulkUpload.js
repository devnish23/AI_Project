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

// Helper: Apply column mapping to a row object
function mapRow(row, mapping) {
  if (!mapping) return row;
  const mapped = {};
  for (const [userCol, sysCol] of Object.entries(mapping)) {
    mapped[sysCol] = row[userCol];
  }
  // Add any unmapped system columns as empty
  for (const sysCol of REQUIRED_COLUMNS) {
    if (!(sysCol in mapped)) mapped[sysCol] = '';
  }
  return mapped;
}

// Helper: Parse tab-delimited TXT with mapping
function parseTabDelimitedTxt(buffer, mapping) {
  const content = buffer.toString('utf8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { data: [], errors: ['File is empty.'] };
  let headers = lines[0].split('\t').map(h => h.trim());
  if (mapping) headers = headers.map(h => mapping[h] || h);
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

// Helper: Parse XLSX with mapping
function parseXlsx(buffer, mapping) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  let json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (mapping) {
    json = json.map(row => mapRow(row, mapping));
  }
  const errors = [];
  for (const col of REQUIRED_COLUMNS) {
    if (!Object.keys(json[0] || {}).includes(col)) {
      errors.push(`Missing required column: ${col}`);
    }
  }
  return { data: json, errors };
}

// Helper: Parse CSV with mapping
function parseCsv(buffer, mapping) {
  const content = buffer.toString('utf8');
  let records = [];
  let errors = [];
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    if (mapping) {
      records = records.map(row => mapRow(row, mapping));
    }
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

// Helper: Generate CSV error report
function generateErrorReport(rows, errors) {
  if (!rows.length) return '';
  const header = [...Object.keys(rows[0]), 'Error'];
  const lines = [header.join(',')];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const error = errors[i] || '';
    const values = header.map(h => (row[h] !== undefined ? String(row[h]).replace(/,/g, ' ') : ''));
    values[values.length - 1] = error;
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

// POST /api/bulk-upload/applications (supports txt, xlsx, csv, column mapping, error report)
router.post('/applications', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ errors: ['No file uploaded.'] });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    let mapping = undefined;
    if (req.body.columnMapping) {
      try {
        mapping = JSON.parse(req.body.columnMapping);
      } catch (e) {
        return res.status(400).json({ errors: ['Invalid column mapping JSON.'] });
      }
    }
    let parsed = { data: [], errors: [] };
    if (ext === '.txt') {
      parsed = parseTabDelimitedTxt(req.file.buffer, mapping);
    } else if (ext === '.xlsx') {
      parsed = parseXlsx(req.file.buffer, mapping);
    } else if (ext === '.csv') {
      parsed = parseCsv(req.file.buffer, mapping);
    } else {
      return res.status(400).json({ errors: ['Only .txt, .xlsx, and .csv files are supported.'] });
    }
    // Basic row validation (required fields not empty)
    const rowErrors = [];
    const failedRows = [];
    parsed.data.forEach((row, idx) => {
      let rowHasError = false;
      REQUIRED_COLUMNS.forEach(col => {
        if (!row[col] || row[col].length === 0) {
          rowErrors.push(`Row ${idx + 2}: Missing value for '${col}'.`);
          rowHasError = true;
        }
      });
      if (rowHasError) failedRows.push(row);
    });
    const allErrors = (parsed.errors || []).concat(rowErrors);
    if (allErrors.length) {
      // Generate error report CSV
      const errorReport = generateErrorReport(failedRows, rowErrors);
      const errorReportBase64 = Buffer.from(errorReport).toString('base64');
      return res.status(400).json({ errors: allErrors, preview: parsed.data, errorReport: errorReportBase64 });
    }
    // Save to DB: map fields and skip duplicates (name+version+vendor)
    const toInsert = [];
    for (const row of parsed.data) {
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