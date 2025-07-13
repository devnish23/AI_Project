const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'), false);
    }
  }
});

// Upload and process file
router.post('/applications', auth, upload.single('file'), [
  body('updateExisting').optional().isBoolean().withMessage('updateExisting must be a boolean'),
  body('skipErrors').optional().isBoolean().withMessage('skipErrors must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { updateExisting = false, skipErrors = false } = req.body;
    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

    let applications = [];

    // Parse file based on extension
    if (['xlsx', 'xls'].includes(fileExtension)) {
      applications = await parseExcelFile(filePath);
    } else if (fileExtension === 'csv') {
      applications = await parseCSVFile(filePath);
    } else {
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    // Validate applications
    const validationResults = validateApplications(applications);
    
    if (!skipErrors && validationResults.errors.length > 0) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      
      return res.status(400).json({
        error: 'Validation failed',
        errors: validationResults.errors,
        validCount: validationResults.validCount,
        totalCount: applications.length
      });
    }

    // Process applications
    const results = await processApplications(
      validationResults.validApplications,
      req.user._id,
      updateExisting
    );

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: 'File processed successfully',
      results: {
        total: applications.length,
        valid: validationResults.validCount,
        created: results.created,
        updated: results.updated,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to process file' });
  }
});

// Parse Excel file
async function parseExcelFile(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    const headers = data[0];
    const applications = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const application = {};

      headers.forEach((header, index) => {
        if (header && row[index] !== undefined) {
          application[header.toLowerCase().replace(/\s+/g, '_')] = row[index];
        }
      });

      if (Object.keys(application).length > 0) {
        applications.push(application);
      }
    }

    return applications;
  } catch (error) {
    throw new Error(`Error parsing Excel file: ${error.message}`);
  }
}

// Parse CSV file
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const applications = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const application = {};
        
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
          application[normalizedKey] = row[key];
        });
        
        applications.push(application);
      })
      .on('end', () => {
        resolve(applications);
      })
      .on('error', (error) => {
        reject(new Error(`Error parsing CSV file: ${error.message}`));
      });
  });
}

// Validate applications
function validateApplications(applications) {
  const errors = [];
  const validApplications = [];

  applications.forEach((app, index) => {
    const rowErrors = [];

    // Required fields
    if (!app.name || !app.name.trim()) {
      rowErrors.push('Application name is required');
    }
    if (!app.version || !app.version.trim()) {
      rowErrors.push('Version is required');
    }
    if (!app.vendor || !app.vendor.trim()) {
      rowErrors.push('Vendor is required');
    }

    // Optional field validation
    if (app.status && !['active', 'deprecated', 'eol', 'eosl', 'unknown'].includes(app.status.toLowerCase())) {
      rowErrors.push('Invalid status value');
    }

    if (app.category && !['operating_system', 'database', 'web_server', 'application_server', 'framework', 'library', 'tool', 'other'].includes(app.category.toLowerCase())) {
      rowErrors.push('Invalid category value');
    }

    if (app.environment && !['production', 'staging', 'development', 'testing'].includes(app.environment.toLowerCase())) {
      rowErrors.push('Invalid environment value');
    }

    if (app.criticality && !['critical', 'high', 'medium', 'low'].includes(app.criticality.toLowerCase())) {
      rowErrors.push('Invalid criticality value');
    }

    // Date validation
    if (app.eol_date) {
      const eolDate = new Date(app.eol_date);
      if (isNaN(eolDate.getTime())) {
        rowErrors.push('Invalid EOL date format');
      }
    }

    if (app.eosl_date) {
      const eoslDate = new Date(app.eosl_date);
      if (isNaN(eoslDate.getTime())) {
        rowErrors.push('Invalid EOSL date format');
      }
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: index + 2, // +2 because of 0-based index and header row
        errors: rowErrors,
        data: app
      });
    } else {
      validApplications.push(normalizeApplication(app));
    }
  });

  return {
    errors,
    validApplications,
    validCount: validApplications.length
  };
}

// Normalize application data
function normalizeApplication(app) {
  return {
    name: app.name.trim(),
    version: app.version.trim(),
    vendor: app.vendor.trim(),
    status: app.status ? app.status.toLowerCase() : 'unknown',
    eolDate: app.eol_date ? new Date(app.eol_date) : null,
    eoslDate: app.eosl_date ? new Date(app.eosl_date) : null,
    latestMajorVersion: app.latest_major_version || app.latestMajorVersion || null,
    metadata: {
      category: app.category ? app.category.toLowerCase() : 'other',
      environment: app.environment ? app.environment.toLowerCase() : 'production',
      criticality: app.criticality ? app.criticality.toLowerCase() : 'medium',
      tags: app.tags ? app.tags.split(',').map(tag => tag.trim()) : []
    },
    notes: app.notes || null
  };
}

// Process applications
async function processApplications(applications, userId, updateExisting) {
  const results = {
    created: 0,
    updated: 0,
    errors: []
  };

  for (const appData of applications) {
    try {
      if (updateExisting) {
        // Try to find existing application
        const existingApp = await Application.findOne({
          name: appData.name,
          vendor: appData.vendor
        });

        if (existingApp) {
          // Update existing application
          Object.assign(existingApp, appData, { lastUpdatedBy: userId });
          await existingApp.save();
          results.updated++;
        } else {
          // Create new application
          const newApp = new Application({
            ...appData,
            createdBy: userId,
            lastUpdatedBy: userId
          });
          await newApp.save();
          results.created++;
        }
      } else {
        // Always create new application
        const newApp = new Application({
          ...appData,
          createdBy: userId,
          lastUpdatedBy: userId
        });
        await newApp.save();
        results.created++;
      }
    } catch (error) {
      results.errors.push({
        application: appData,
        error: error.message
      });
    }
  }

  return results;
}

// Get upload template
router.get('/template', auth, (req, res) => {
  const template = [
    {
      name: 'Example Application',
      version: '1.0.0',
      vendor: 'Example Vendor',
      status: 'active',
      category: 'framework',
      environment: 'production',
      criticality: 'high',
      eol_date: '2024-12-31',
      eosl_date: '2024-06-30',
      latest_major_version: '2.0.0',
      notes: 'Example notes'
    }
  ];

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(template);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Applications');

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=applications_template.xlsx');
  res.send(buffer);
});

// Validate file before upload
router.post('/validate', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();

    let applications = [];

    // Parse file
    if (['xlsx', 'xls'].includes(fileExtension)) {
      applications = await parseExcelFile(filePath);
    } else if (fileExtension === 'csv') {
      applications = await parseCSVFile(filePath);
    } else {
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    // Validate applications
    const validationResults = validateApplications(applications);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      totalCount: applications.length,
      validCount: validationResults.validCount,
      errorCount: validationResults.errors.length,
      errors: validationResults.errors,
      sample: validationResults.validApplications.slice(0, 3) // First 3 valid applications as sample
    });

  } catch (error) {
    console.error('File validation error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to validate file' });
  }
});

module.exports = router; 