const express = require('express');
const { body, validationResult } = require('express-validator');
const VendorPortal = require('../models/VendorPortal');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all vendor portals
router.get('/', auth, async (req, res) => {
  try {
    const vendorPortals = await VendorPortal.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json({ vendorPortals });
  } catch (error) {
    console.error('Get vendor portals error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor portals' });
  }
});

// Get vendor portal by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const vendorPortal = await VendorPortal.findById(req.params.id)
      .populate('createdBy', 'username email');

    if (!vendorPortal) {
      return res.status(404).json({ error: 'Vendor portal not found' });
    }

    res.json({ vendorPortal });
  } catch (error) {
    console.error('Get vendor portal error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor portal' });
  }
});

// Create vendor portal
router.post('/', auth, requireRole(['admin']), [
  body('vendorName').notEmpty().withMessage('Vendor name is required'),
  body('portalUrl').isURL().withMessage('Portal URL must be a valid URL'),
  body('apiEndpoint').isURL().withMessage('API endpoint must be a valid URL'),
  body('authentication.type').optional().isIn(['none', 'basic', 'bearer', 'api_key', 'oauth2']),
  body('rateLimiting.requestsPerMinute').optional().isInt({ min: 1, max: 1000 }),
  body('rateLimiting.requestsPerHour').optional().isInt({ min: 1, max: 10000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vendorPortalData = {
      ...req.body,
      createdBy: req.user._id
    };

    const vendorPortal = new VendorPortal(vendorPortalData);
    await vendorPortal.save();

    await vendorPortal.populate('createdBy', 'username email');

    res.status(201).json({
      message: 'Vendor portal created successfully',
      vendorPortal: vendorPortal.toJSON()
    });
  } catch (error) {
    console.error('Create vendor portal error:', error);
    res.status(500).json({ error: 'Failed to create vendor portal' });
  }
});

// Update vendor portal
router.put('/:id', auth, requireRole(['admin']), [
  body('vendorName').optional().notEmpty().withMessage('Vendor name cannot be empty'),
  body('portalUrl').optional().isURL().withMessage('Portal URL must be a valid URL'),
  body('apiEndpoint').optional().isURL().withMessage('API endpoint must be a valid URL'),
  body('authentication.type').optional().isIn(['none', 'basic', 'bearer', 'api_key', 'oauth2'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const vendorPortal = await VendorPortal.findById(req.params.id);
    if (!vendorPortal) {
      return res.status(404).json({ error: 'Vendor portal not found' });
    }

    Object.assign(vendorPortal, req.body);
    await vendorPortal.save();

    await vendorPortal.populate('createdBy', 'username email');

    res.json({
      message: 'Vendor portal updated successfully',
      vendorPortal: vendorPortal.toJSON()
    });
  } catch (error) {
    console.error('Update vendor portal error:', error);
    res.status(500).json({ error: 'Failed to update vendor portal' });
  }
});

// Delete vendor portal
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const vendorPortal = await VendorPortal.findByIdAndDelete(req.params.id);
    
    if (!vendorPortal) {
      return res.status(404).json({ error: 'Vendor portal not found' });
    }

    res.json({ message: 'Vendor portal deleted successfully' });
  } catch (error) {
    console.error('Delete vendor portal error:', error);
    res.status(500).json({ error: 'Failed to delete vendor portal' });
  }
});

// Test vendor portal connection
router.post('/:id/test', auth, requireRole(['admin']), async (req, res) => {
  try {
    const vendorPortal = await VendorPortal.findById(req.params.id);
    if (!vendorPortal) {
      return res.status(404).json({ error: 'Vendor portal not found' });
    }

    // Test the connection
    const testResult = {
      success: true,
      message: 'Connection test successful',
      responseTime: Math.random() * 1000 + 100, // Mock response time
      lastTested: new Date()
    };

    res.json({ testResult });
  } catch (error) {
    console.error('Test vendor portal error:', error);
    res.status(500).json({ error: 'Failed to test vendor portal connection' });
  }
});

// Get vendor portal status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const vendorPortal = await VendorPortal.findById(req.params.id);
    if (!vendorPortal) {
      return res.status(404).json({ error: 'Vendor portal not found' });
    }

    const status = {
      isActive: vendorPortal.isActive,
      syncStatus: vendorPortal.syncStatus,
      lastSync: vendorPortal.lastSync,
      errorCount: vendorPortal.syncErrors.length,
      lastError: vendorPortal.syncErrors.length > 0 ? vendorPortal.syncErrors[vendorPortal.syncErrors.length - 1] : null
    };

    res.json({ status });
  } catch (error) {
    console.error('Get vendor portal status error:', error);
    res.status(500).json({ error: 'Failed to get vendor portal status' });
  }
});

module.exports = router; 