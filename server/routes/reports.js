const express = require('express');
const xlsx = require('xlsx');
const pptxgen = require('pptxgenjs');
const { body, query, validationResult } = require('express-validator');
const Application = require('../models/Application');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Generate Excel report
router.post('/excel', auth, [
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('includeCharts').optional().isBoolean().withMessage('includeCharts must be a boolean'),
  body('includeCVEs').optional().isBoolean().withMessage('includeCVEs must be a boolean'),
  body('includePatchHistory').optional().isBoolean().withMessage('includePatchHistory must be a boolean'),
  body('format').optional().isIn(['xlsx', 'csv']).withMessage('Format must be xlsx or csv')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      filters = {},
      includeCharts = true,
      includeCVEs = true,
      includePatchHistory = true,
      format = 'xlsx'
    } = req.body;

    // Build filter query
    const filter = buildFilterQuery(filters);
    
    // Fetch applications
    const applications = await Application.find(filter)
      .populate('createdBy', 'username email')
      .populate('lastUpdatedBy', 'username email')
      .sort({ createdAt: -1 });

    // Generate Excel workbook
    const workbook = generateExcelWorkbook(applications, {
      includeCharts,
      includeCVEs,
      includePatchHistory
    });

    // Set response headers
    const filename = `infra_report_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send file
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: format });
    res.send(buffer);

  } catch (error) {
    console.error('Excel report generation error:', error);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// Generate PowerPoint report
router.post('/powerpoint', auth, [
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('template').optional().isString().withMessage('Template must be a string'),
  body('includeCharts').optional().isBoolean().withMessage('includeCharts must be a boolean'),
  body('includeSummary').optional().isBoolean().withMessage('includeSummary must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      filters = {},
      template = 'default',
      includeCharts = true,
      includeSummary = true
    } = req.body;

    // Build filter query
    const filter = buildFilterQuery(filters);
    
    // Fetch applications
    const applications = await Application.find(filter)
      .populate('createdBy', 'username email')
      .populate('lastUpdatedBy', 'username email')
      .sort({ createdAt: -1 });

    // Generate PowerPoint presentation
    const presentation = generatePowerPointPresentation(applications, {
      template,
      includeCharts,
      includeSummary
    });

    // Set response headers
    const filename = `infra_presentation_${new Date().toISOString().split('T')[0]}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send file
    const buffer = await presentation.write('nodebuffer');
    res.send(buffer);

  } catch (error) {
    console.error('PowerPoint report generation error:', error);
    res.status(500).json({ error: 'Failed to generate PowerPoint report' });
  }
});

// Get report templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = {
      excel: [
        {
          id: 'comprehensive',
          name: 'Comprehensive Report',
          description: 'Full report with all data including CVEs and patch history',
          includes: ['applications', 'cves', 'patch_history', 'charts', 'summary']
        },
        {
          id: 'executive',
          name: 'Executive Summary',
          description: 'High-level summary for management',
          includes: ['summary', 'charts', 'critical_items']
        },
        {
          id: 'security',
          name: 'Security Focus',
          description: 'Security-focused report with CVE details',
          includes: ['applications', 'cves', 'security_summary']
        }
      ],
      powerpoint: [
        {
          id: 'default',
          name: 'Default Template',
          description: 'Standard presentation template',
          includes: ['title', 'summary', 'charts', 'details']
        },
        {
          id: 'executive',
          name: 'Executive Template',
          description: 'Executive-friendly presentation',
          includes: ['title', 'summary', 'key_metrics', 'recommendations']
        },
        {
          id: 'technical',
          name: 'Technical Template',
          description: 'Technical deep-dive presentation',
          includes: ['title', 'technical_details', 'cves', 'patch_history']
        }
      ]
    };

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Build filter query from request filters
function buildFilterQuery(filters) {
  const filter = {};
  
  if (filters.vendor) {
    filter.vendor = new RegExp(filters.vendor, 'i');
  }
  
  if (filters.status) {
    filter.status = filters.status;
  }
  
  if (filters.category) {
    filter['metadata.category'] = filters.category;
  }
  
  if (filters.environment) {
    filter['metadata.environment'] = filters.environment;
  }
  
  if (filters.cveSeverity) {
    filter['criticalCVEs.severity'] = filters.cveSeverity;
  }
  
  if (filters.search) {
    filter.$or = [
      { name: new RegExp(filters.search, 'i') },
      { version: new RegExp(filters.search, 'i') },
      { vendor: new RegExp(filters.search, 'i') }
    ];
  }
  
  if (filters.dateFrom || filters.dateTo) {
    filter.createdAt = {};
    if (filters.dateFrom) {
      filter.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      filter.createdAt.$lte = new Date(filters.dateTo);
    }
  }
  
  return filter;
}

// Generate Excel workbook
function generateExcelWorkbook(applications, options) {
  const workbook = xlsx.utils.book_new();
  
  // Main applications sheet
  const mainData = applications.map(app => ({
    'Application Name': app.name,
    'Version': app.version,
    'Vendor': app.vendor,
    'Status': app.status,
    'EOL Date': app.eolDate ? app.eolDate.toISOString().split('T')[0] : '',
    'EOSL Date': app.eoslDate ? app.eoslDate.toISOString().split('T')[0] : '',
    'Latest Major Version': app.latestMajorVersion || '',
    'Category': app.metadata.category,
    'Environment': app.metadata.environment,
    'Criticality': app.metadata.criticality,
    'Security Risk Score': app.securityRiskScore,
    'Days Until EOL': app.daysUntilEOL || '',
    'Critical CVEs': app.criticalCVEs.filter(cve => cve.severity === 'critical').length,
    'High CVEs': app.criticalCVEs.filter(cve => cve.severity === 'high').length,
    'Created By': app.createdBy?.username || '',
    'Created Date': app.createdAt.toISOString().split('T')[0],
    'Last Updated': app.updatedAt.toISOString().split('T')[0],
    'Notes': app.notes || ''
  }));
  
  const mainSheet = xlsx.utils.json_to_sheet(mainData);
  xlsx.utils.book_append_sheet(workbook, mainSheet, 'Applications');
  
  // CVEs sheet
  if (options.includeCVEs) {
    const cveData = [];
    applications.forEach(app => {
      app.criticalCVEs.forEach(cve => {
        cveData.push({
          'Application': app.name,
          'Vendor': app.vendor,
          'CVE ID': cve.cveId,
          'Severity': cve.severity,
          'Description': cve.description || '',
          'CVSS Score': cve.cvssScore || '',
          'Published Date': cve.publishedDate ? cve.publishedDate.toISOString().split('T')[0] : '',
          'Last Modified': cve.lastModifiedDate ? cve.lastModifiedDate.toISOString().split('T')[0] : ''
        });
      });
    });
    
    if (cveData.length > 0) {
      const cveSheet = xlsx.utils.json_to_sheet(cveData);
      xlsx.utils.book_append_sheet(workbook, cveSheet, 'CVEs');
    }
  }
  
  // Patch history sheet
  if (options.includePatchHistory) {
    const patchData = [];
    applications.forEach(app => {
      app.patchHistory.forEach(patch => {
        patchData.push({
          'Application': app.name,
          'Vendor': app.vendor,
          'Version': patch.version,
          'Release Date': patch.releaseDate ? patch.releaseDate.toISOString().split('T')[0] : '',
          'Description': patch.description || '',
          'Security Fixes': patch.securityFixes.join(', '),
          'Bug Fixes': patch.bugFixes.join(', ')
        });
      });
    });
    
    if (patchData.length > 0) {
      const patchSheet = xlsx.utils.json_to_sheet(patchData);
      xlsx.utils.book_append_sheet(workbook, patchSheet, 'Patch History');
    }
  }
  
  // Summary sheet
  const summaryData = generateSummaryData(applications);
  const summarySheet = xlsx.utils.json_to_sheet(summaryData);
  xlsx.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  return workbook;
}

// Generate PowerPoint presentation
function generatePowerPointPresentation(applications, options) {
  const presentation = new pptxgen();
  
  // Set presentation properties
  presentation.author = 'Infra Tracker';
  presentation.company = 'Your Company';
  presentation.title = 'Infrastructure Tracking Report';
  presentation.subject = 'Application and Vendor Management Report';
  
  // Title slide
  const titleSlide = presentation.addSlide();
  titleSlide.addText('Infrastructure Tracking Report', {
    x: 1, y: 1, w: 8, h: 1,
    fontSize: 24,
    bold: true,
    align: 'center'
  });
  
  titleSlide.addText(`Generated on ${new Date().toLocaleDateString()}`, {
    x: 1, y: 2.5, w: 8, h: 0.5,
    fontSize: 14,
    align: 'center',
    color: '666666'
  });
  
  titleSlide.addText(`Total Applications: ${applications.length}`, {
    x: 1, y: 3.5, w: 8, h: 0.5,
    fontSize: 16,
    align: 'center'
  });
  
  // Summary slide
  if (options.includeSummary) {
    const summarySlide = presentation.addSlide();
    summarySlide.addText('Executive Summary', {
      x: 0.5, y: 0.5, w: 9, h: 0.5,
      fontSize: 20,
      bold: true
    });
    
    const summaryData = generateSummaryData(applications);
    const summaryText = summaryData.map(item => 
      `${item.Metric}: ${item.Value}`
    ).join('\n');
    
    summarySlide.addText(summaryText, {
      x: 0.5, y: 1.5, w: 9, h: 5,
      fontSize: 14,
      bullet: { type: 'number' }
    });
  }
  
  // Applications by status slide
  const statusSlide = presentation.addSlide();
  statusSlide.addText('Applications by Status', {
    x: 0.5, y: 0.5, w: 9, h: 0.5,
    fontSize: 20,
    bold: true
  });
  
  const statusData = {};
  applications.forEach(app => {
    statusData[app.status] = (statusData[app.status] || 0) + 1;
  });
  
  const statusText = Object.entries(statusData)
    .map(([status, count]) => `${status}: ${count}`)
    .join('\n');
  
  statusSlide.addText(statusText, {
    x: 0.5, y: 1.5, w: 4, h: 5,
    fontSize: 14,
    bullet: { type: 'number' }
  });
  
  // Critical applications slide
  const criticalSlide = presentation.addSlide();
  criticalSlide.addText('Critical Applications', {
    x: 0.5, y: 0.5, w: 9, h: 0.5,
    fontSize: 20,
    bold: true
  });
  
  const criticalApps = applications
    .filter(app => app.metadata.criticality === 'critical')
    .slice(0, 10); // Limit to top 10
  
  const criticalText = criticalApps.map(app => 
    `${app.name} (${app.vendor}) - ${app.status}`
  ).join('\n');
  
  criticalSlide.addText(criticalText, {
    x: 0.5, y: 1.5, w: 9, h: 5,
    fontSize: 12,
    bullet: { type: 'number' }
  });
  
  // Security vulnerabilities slide
  const securitySlide = presentation.addSlide();
  securitySlide.addText('Security Vulnerabilities', {
    x: 0.5, y: 0.5, w: 9, h: 0.5,
    fontSize: 20,
    bold: true
  });
  
  const criticalCVEs = applications.reduce((total, app) => 
    total + app.criticalCVEs.filter(cve => cve.severity === 'critical').length, 0
  );
  
  const highCVEs = applications.reduce((total, app) => 
    total + app.criticalCVEs.filter(cve => cve.severity === 'high').length, 0
  );
  
  securitySlide.addText(`Critical CVEs: ${criticalCVEs}\nHigh CVEs: ${highCVEs}`, {
    x: 0.5, y: 1.5, w: 9, h: 2,
    fontSize: 16,
    bullet: { type: 'number' }
  });
  
  return presentation;
}

// Generate summary data
function generateSummaryData(applications) {
  const totalApplications = applications.length;
  const byStatus = {};
  const byVendor = {};
  const byCategory = {};
  let criticalCVEs = 0;
  let highCVEs = 0;
  let eolApplications = 0;
  let approachingEol = 0;
  
  applications.forEach(app => {
    // Status breakdown
    byStatus[app.status] = (byStatus[app.status] || 0) + 1;
    
    // Vendor breakdown
    byVendor[app.vendor] = (byVendor[app.vendor] || 0) + 1;
    
    // Category breakdown
    byCategory[app.metadata.category] = (byCategory[app.metadata.category] || 0) + 1;
    
    // CVE counts
    criticalCVEs += app.criticalCVEs.filter(cve => cve.severity === 'critical').length;
    highCVEs += app.criticalCVEs.filter(cve => cve.severity === 'high').length;
    
    // EOL applications
    if (app.status === 'eol') eolApplications++;
    if (app.daysUntilEOL && app.daysUntilEOL <= 90) approachingEol++;
  });
  
  return [
    { Metric: 'Total Applications', Value: totalApplications },
    { Metric: 'Active Applications', Value: byStatus.active || 0 },
    { Metric: 'EOL Applications', Value: eolApplications },
    { Metric: 'Applications Approaching EOL', Value: approachingEol },
    { Metric: 'Critical CVEs', Value: criticalCVEs },
    { Metric: 'High CVEs', Value: highCVEs },
    { Metric: 'Top Vendor', Value: Object.entries(byVendor).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A' },
    { Metric: 'Most Common Category', Value: Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A' }
  ];
}

module.exports = router; 