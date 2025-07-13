const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Application = require('../models/Application');
const { auth, requireRole } = require('../middleware/auth');
const { fetchVendorData } = require('../services/vendorService');

const router = express.Router();

// Get all applications with filtering and pagination
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('vendor').optional().isString().withMessage('Vendor must be a string'),
  query('status').optional().isIn(['active', 'deprecated', 'eol', 'eosl', 'unknown']).withMessage('Invalid status'),
  query('cveSeverity').optional().isIn(['critical', 'high', 'medium', 'low']).withMessage('Invalid CVE severity'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('environment').optional().isString().withMessage('Environment must be a string'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('sortBy').optional().isString().withMessage('Sort field must be a string'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      vendor,
      status,
      cveSeverity,
      category,
      environment,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = {};
    
    if (vendor) filter.vendor = new RegExp(vendor, 'i');
    if (status) filter.status = status;
    if (category) filter['metadata.category'] = category;
    if (environment) filter['metadata.environment'] = environment;
    
    if (cveSeverity) {
      filter['criticalCVEs.severity'] = cveSeverity;
    }
    
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { version: new RegExp(search, 'i') },
        { vendor: new RegExp(search, 'i') }
      ];
    }

    // Build sort query
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const applications = await Application.find(filter)
      .populate('createdBy', 'username email')
      .populate('lastUpdatedBy', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(filter);

    res.json({
      applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get application by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('lastUpdatedBy', 'username email');

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Create new application
router.post('/', auth, [
  body('name').notEmpty().withMessage('Application name is required'),
  body('version').notEmpty().withMessage('Version is required'),
  body('vendor').notEmpty().withMessage('Vendor is required'),
  body('status').optional().isIn(['active', 'deprecated', 'eol', 'eosl', 'unknown']),
  body('eolDate').optional().isISO8601().withMessage('EOL date must be a valid date'),
  body('eoslDate').optional().isISO8601().withMessage('EOSL date must be a valid date'),
  body('latestMajorVersion').optional().isString(),
  body('metadata.category').optional().isIn(['operating_system', 'database', 'web_server', 'application_server', 'framework', 'library', 'tool', 'other']),
  body('metadata.environment').optional().isIn(['production', 'staging', 'development', 'testing']),
  body('metadata.criticality').optional().isIn(['critical', 'high', 'medium', 'low']),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const applicationData = {
      ...req.body,
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id
    };

    const application = new Application(applicationData);
    await application.save();

    // Populate user data
    await application.populate('createdBy', 'username email');

    res.status(201).json({
      message: 'Application created successfully',
      application: application.toJSON()
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Update application
router.put('/:id', auth, [
  body('name').optional().notEmpty().withMessage('Application name cannot be empty'),
  body('version').optional().notEmpty().withMessage('Version cannot be empty'),
  body('vendor').optional().notEmpty().withMessage('Vendor cannot be empty'),
  body('status').optional().isIn(['active', 'deprecated', 'eol', 'eosl', 'unknown']),
  body('eolDate').optional().isISO8601().withMessage('EOL date must be a valid date'),
  body('eoslDate').optional().isISO8601().withMessage('EOSL date must be a valid date'),
  body('latestMajorVersion').optional().isString(),
  body('metadata.category').optional().isIn(['operating_system', 'database', 'web_server', 'application_server', 'framework', 'library', 'tool', 'other']),
  body('metadata.environment').optional().isIn(['production', 'staging', 'development', 'testing']),
  body('metadata.criticality').optional().isIn(['critical', 'high', 'medium', 'low']),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application
    Object.assign(application, req.body, { lastUpdatedBy: req.user._id });
    await application.save();

    await application.populate('lastUpdatedBy', 'username email');

    res.json({
      message: 'Application updated successfully',
      application: application.toJSON()
    });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Delete application
router.delete('/:id', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Fetch vendor data for application
router.post('/:id/fetch-vendor-data', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Fetch vendor data
    const vendorData = await fetchVendorData(application.vendor, application.name, application.version);
    
    // Update application with vendor data (even if it's mock data)
    Object.assign(application, {
      status: vendorData.status || application.status,
      eolDate: vendorData.eolDate || application.eolDate,
      eoslDate: vendorData.eoslDate || application.eoslDate,
      latestMajorVersion: vendorData.latestMajorVersion || application.latestMajorVersion,
      criticalCVEs: vendorData.criticalCVEs || application.criticalCVEs,
      patchHistory: vendorData.patchHistory || application.patchHistory,
      'vendorPortalData.lastFetched': new Date(),
      lastUpdatedBy: req.user._id
    });

    await application.save();
    await application.populate('lastUpdatedBy', 'username email');

    res.json({
      message: 'Vendor data fetched and updated successfully',
      application: application.toJSON(),
      vendorData
    });
  } catch (error) {
    console.error('Fetch vendor data error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor data' });
  }
});

// Bulk update applications
router.put('/bulk/update', auth, requireRole(['admin', 'manager']), [
  body('applications').isArray().withMessage('Applications must be an array'),
  body('applications.*.id').isMongoId().withMessage('Invalid application ID'),
  body('updates').isObject().withMessage('Updates must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { applications, updates } = req.body;
    const applicationIds = applications.map(app => app.id);

    const result = await Application.updateMany(
      { _id: { $in: applicationIds } },
      { 
        $set: { 
          ...updates, 
          lastUpdatedBy: req.user._id 
        } 
      }
    );

    res.json({
      message: 'Bulk update completed successfully',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to perform bulk update' });
  }
});

// Get application statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Application.aggregate([
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          byStatus: {
            $push: '$status'
          },
          byVendor: {
            $push: '$vendor'
          },
          byCategory: {
            $push: '$metadata.category'
          },
          criticalCVEs: {
            $sum: { $size: { $filter: { input: '$criticalCVEs', cond: { $eq: ['$$this.severity', 'critical'] } } } }
          },
          highCVEs: {
            $sum: { $size: { $filter: { input: '$criticalCVEs', cond: { $eq: ['$$this.severity', 'high'] } } } }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalApplications: 1,
          statusBreakdown: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: '$byStatus' },
                as: 'status',
                in: {
                  k: '$$status',
                  v: { $size: { $filter: { input: '$byStatus', cond: { $eq: ['$$this', '$$status'] } } } }
                }
              }
            }
          },
          vendorBreakdown: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: '$byVendor' },
                as: 'vendor',
                in: {
                  k: '$$vendor',
                  v: { $size: { $filter: { input: '$byVendor', cond: { $eq: ['$$this', '$$vendor'] } } } }
                }
              }
            }
          },
          categoryBreakdown: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: '$byCategory' },
                as: 'category',
                in: {
                  k: '$$category',
                  v: { $size: { $filter: { input: '$byCategory', cond: { $eq: ['$$this', '$$category'] } } } }
                }
              }
            }
          },
          criticalCVEs: 1,
          highCVEs: 1
        }
      }
    ]);

    res.json({ stats: stats[0] || {} });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router; 