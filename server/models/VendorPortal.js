const mongoose = require('mongoose');

const vendorPortalSchema = new mongoose.Schema({
  vendorName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  portalUrl: {
    type: String,
    required: true,
    trim: true
  },
  apiEndpoint: {
    type: String,
    required: true,
    trim: true
  },
  authentication: {
    type: {
      type: String,
      enum: ['none', 'basic', 'bearer', 'api_key', 'oauth2'],
      default: 'none'
    },
    credentials: {
      username: String,
      password: String,
      apiKey: String,
      clientId: String,
      clientSecret: String
    },
    headers: {
      'User-Agent': String,
      'Accept': String,
      'Content-Type': String
    }
  },
  dataMapping: {
    productField: {
      type: String,
      default: 'product'
    },
    versionField: {
      type: String,
      default: 'version'
    },
    statusField: {
      type: String,
      default: 'status'
    },
    eolDateField: {
      type: String,
      default: 'eol_date'
    },
    eoslDateField: {
      type: String,
      default: 'eosl_date'
    },
    latestVersionField: {
      type: String,
      default: 'latest_version'
    },
    cveField: {
      type: String,
      default: 'cves'
    }
  },
  rateLimiting: {
    requestsPerMinute: {
      type: Number,
      default: 60
    },
    requestsPerHour: {
      type: Number,
      default: 1000
    }
  },
  retryConfig: {
    maxRetries: {
      type: Number,
      default: 3
    },
    retryDelay: {
      type: Number,
      default: 1000
    },
    backoffMultiplier: {
      type: Number,
      default: 2
    }
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  syncStatus: {
    type: String,
    enum: ['idle', 'running', 'failed', 'completed'],
    default: 'idle'
  },
  syncErrors: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    error: String,
    details: mongoose.Schema.Types.Mixed
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
vendorPortalSchema.index({ vendorName: 1, isActive: 1 });
vendorPortalSchema.index({ syncStatus: 1 });

// Virtual for sync status summary
vendorPortalSchema.virtual('syncStatusSummary').get(function() {
  if (this.syncStatus === 'failed' && this.syncErrors.length > 0) {
    return {
      status: this.syncStatus,
      lastError: this.syncErrors[this.syncErrors.length - 1].error,
      errorCount: this.syncErrors.length
    };
  }
  return {
    status: this.syncStatus,
    lastSync: this.lastSync
  };
});

// Ensure virtuals are included in JSON output
vendorPortalSchema.set('toJSON', { virtuals: true });
vendorPortalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('VendorPortal', vendorPortalSchema); 