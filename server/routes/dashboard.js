const express = require('express');
const Application = require('../models/Application');
const VendorPortal = require('../models/VendorPortal');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard overview statistics
router.get('/overview', auth, async (req, res) => {
  try {
    // Get application statistics
    const appStats = await Application.aggregate([
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          byStatus: { $push: '$status' },
          byVendor: { $push: '$vendor' },
          byCategory: { $push: '$metadata.category' },
          criticalCVEs: {
            $sum: { $size: { $filter: { input: '$criticalCVEs', cond: { $eq: ['$$this.severity', 'critical'] } } } }
          },
          highCVEs: {
            $sum: { $size: { $filter: { input: '$criticalCVEs', cond: { $eq: ['$$this.severity', 'high'] } } } }
          },
          eolApplications: {
            $sum: { $cond: [{ $eq: ['$status', 'eol'] }, 1, 0] }
          },
          approachingEol: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$eolDate', null] },
                    { $lte: ['$eolDate', { $add: [new Date(), 90 * 24 * 60 * 60 * 1000] }] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get vendor portal statistics
    const vendorStats = await VendorPortal.aggregate([
      {
        $group: {
          _id: null,
          totalPortals: { $sum: 1 },
          activePortals: { $sum: { $cond: ['$isActive', 1, 0] } },
          failedSyncs: { $sum: { $cond: [{ $eq: ['$syncStatus', 'failed'] }, 1, 0] } }
        }
      }
    ]);

    // Get recent applications
    const recentApplications = await Application.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get critical applications (high security risk)
    const criticalApplications = await Application.find({
      $or: [
        { 'criticalCVEs.severity': 'critical' },
        { status: 'eol' },
        { 'metadata.criticality': 'critical' }
      ]
    })
    .populate('createdBy', 'username')
    .sort({ securityRiskScore: -1 })
    .limit(5);

    const stats = {
      applications: appStats[0] || {
        totalApplications: 0,
        byStatus: {},
        byVendor: {},
        byCategory: {},
        criticalCVEs: 0,
        highCVEs: 0,
        eolApplications: 0,
        approachingEol: 0
      },
      vendors: vendorStats[0] || {
        totalPortals: 0,
        activePortals: 0,
        failedSyncs: 0
      },
      recentApplications,
      criticalApplications
    };

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// Get applications by status chart data
router.get('/charts/status', auth, async (req, res) => {
  try {
    const statusData = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({ statusData });
  } catch (error) {
    console.error('Status chart error:', error);
    res.status(500).json({ error: 'Failed to fetch status chart data' });
  }
});

// Get applications by vendor chart data
router.get('/charts/vendors', auth, async (req, res) => {
  try {
    const vendorData = await Application.aggregate([
      {
        $group: {
          _id: '$vendor',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({ vendorData });
  } catch (error) {
    console.error('Vendor chart error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor chart data' });
  }
});

// Get CVE severity distribution
router.get('/charts/cves', auth, async (req, res) => {
  try {
    const cveData = await Application.aggregate([
      {
        $unwind: '$criticalCVEs'
      },
      {
        $group: {
          _id: '$criticalCVEs.severity',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({ cveData });
  } catch (error) {
    console.error('CVE chart error:', error);
    res.status(500).json({ error: 'Failed to fetch CVE chart data' });
  }
});

// Get applications approaching EOL
router.get('/eol-alerts', auth, async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const eolAlerts = await Application.find({
      eolDate: { $lte: thirtyDaysFromNow },
      eolDate: { $ne: null }
    })
    .populate('createdBy', 'username')
    .sort({ eolDate: 1 })
    .limit(10);

    res.json({ eolAlerts });
  } catch (error) {
    console.error('EOL alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch EOL alerts' });
  }
});

// Get security risk summary
router.get('/security-summary', auth, async (req, res) => {
  try {
    const securitySummary = await Application.aggregate([
      {
        $group: {
          _id: null,
          averageRiskScore: { $avg: '$securityRiskScore' },
          highRiskCount: {
            $sum: { $cond: [{ $gte: ['$securityRiskScore', 70] }, 1, 0] }
          },
          mediumRiskCount: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$securityRiskScore', 30] }, { $lt: ['$securityRiskScore', 70] }] },
                1,
                0
              ]
            }
          },
          lowRiskCount: {
            $sum: { $cond: [{ $lt: ['$securityRiskScore', 30] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({ securitySummary: securitySummary[0] || {} });
  } catch (error) {
    console.error('Security summary error:', error);
    res.status(500).json({ error: 'Failed to fetch security summary' });
  }
});

module.exports = router; 