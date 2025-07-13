const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  version: {
    type: String,
    required: true,
    trim: true
  },
  vendor: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'deprecated', 'eol', 'eosl', 'unknown'],
    default: 'unknown'
  },
  eolDate: {
    type: Date,
    default: null
  },
  eoslDate: {
    type: Date,
    default: null
  },
  latestMajorVersion: {
    type: String,
    default: null
  },
  criticalCVEs: [{
    cveId: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true
    },
    description: String,
    publishedDate: Date,
    lastModifiedDate: Date,
    cvssScore: Number
  }],
  patchHistory: [{
    version: String,
    releaseDate: Date,
    description: String,
    securityFixes: [String],
    bugFixes: [String]
  }],
  vendorPortalData: {
    lastFetched: {
      type: Date,
      default: Date.now
    },
    portalUrl: String,
    apiEndpoint: String,
    requiresAuth: {
      type: Boolean,
      default: false
    },
    authCredentials: {
      username: String,
      apiKey: String
    }
  },
  metadata: {
    category: {
      type: String,
      enum: ['operating_system', 'database', 'web_server', 'application_server', 'framework', 'library', 'tool', 'other'],
      default: 'other'
    },
    environment: {
      type: String,
      enum: ['production', 'staging', 'development', 'testing'],
      default: 'production'
    },
    criticality: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium'
    },
    tags: [String]
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
applicationSchema.index({ vendor: 1, status: 1 });
applicationSchema.index({ 'criticalCVEs.severity': 1 });
applicationSchema.index({ eolDate: 1 });
applicationSchema.index({ 'metadata.category': 1, 'metadata.environment': 1 });

// Virtual for days until EOL
applicationSchema.virtual('daysUntilEOL').get(function() {
  if (!this.eolDate) return null;
  const now = new Date();
  const diffTime = this.eolDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for security risk score
applicationSchema.virtual('securityRiskScore').get(function() {
  let score = 0;
  
  // Add points for critical CVEs
  const criticalCount = this.criticalCVEs.filter(cve => cve.severity === 'critical').length;
  const highCount = this.criticalCVEs.filter(cve => cve.severity === 'high').length;
  
  score += criticalCount * 10;
  score += highCount * 5;
  
  // Add points for EOL status
  if (this.status === 'eol') score += 20;
  if (this.status === 'eosl') score += 15;
  
  // Add points for approaching EOL
  if (this.daysUntilEOL && this.daysUntilEOL <= 30) score += 10;
  if (this.daysUntilEOL && this.daysUntilEOL <= 90) score += 5;
  
  return Math.min(score, 100);
});

// Ensure virtuals are included in JSON output
applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Application', applicationSchema); 