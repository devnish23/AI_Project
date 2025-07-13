const axios = require('axios');
const VendorPortal = require('../models/VendorPortal');

class VendorService {
  constructor() {
    this.rateLimiters = new Map();
    this.retryDelays = new Map();
  }

  // Fetch vendor data with retry mechanism
  async fetchVendorData(vendor, product, version) {
    try {
      // Get vendor portal configuration
      const vendorPortal = await VendorPortal.findOne({ 
        vendorName: new RegExp(vendor, 'i'),
        isActive: true 
      });

      if (!vendorPortal) {
        console.log(`No vendor portal configuration found for ${vendor}`);
        // Return mock data for demonstration purposes
        return {
          status: 'unknown',
          eolDate: null,
          eoslDate: null,
          latestMajorVersion: null,
          criticalCVEs: [],
          patchHistory: []
        };
      }

      // Check rate limiting
      if (!this.checkRateLimit(vendorPortal)) {
        throw new Error('Rate limit exceeded');
      }

      // Prepare request
      const requestConfig = this.prepareRequest(vendorPortal, product, version);
      
      // Make request with retry
      const response = await this.makeRequestWithRetry(requestConfig, vendorPortal.retryConfig);
      
      // Parse and map response
      const vendorData = this.parseVendorResponse(response.data, vendorPortal.dataMapping);
      
      // Update last sync
      vendorPortal.lastSync = new Date();
      vendorPortal.syncStatus = 'completed';
      await vendorPortal.save();

      return vendorData;
    } catch (error) {
      console.error(`Error fetching vendor data for ${vendor}/${product}:`, error);
      
      // Update vendor portal with error
      await this.updateVendorPortalError(vendor, error);
      
      return null;
    }
  }

  // Prepare request configuration
  prepareRequest(vendorPortal, product, version) {
    const config = {
      method: 'GET',
      url: vendorPortal.apiEndpoint,
      timeout: 30000,
      headers: {
        'User-Agent': 'InfraTracker/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...vendorPortal.authentication.headers
      }
    };

    // Add authentication
    if (vendorPortal.authentication.type !== 'none') {
      this.addAuthentication(config, vendorPortal.authentication);
    }

    // Add query parameters
    config.params = {
      product: product,
      version: version,
      ...vendorPortal.dataMapping
    };

    return config;
  }

  // Add authentication to request
  addAuthentication(config, auth) {
    switch (auth.type) {
      case 'basic':
        config.auth = {
          username: auth.credentials.username,
          password: auth.credentials.password
        };
        break;
      
      case 'bearer':
        config.headers.Authorization = `Bearer ${auth.credentials.apiKey}`;
        break;
      
      case 'api_key':
        config.headers['X-API-Key'] = auth.credentials.apiKey;
        break;
      
      case 'oauth2':
        // For OAuth2, you would typically get a token first
        config.headers.Authorization = `Bearer ${auth.credentials.accessToken}`;
        break;
    }
  }

  // Make request with retry mechanism
  async makeRequestWithRetry(config, retryConfig) {
    let lastError;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios(config);
        return response;
      } catch (error) {
        lastError = error;
        
        if (attempt === retryConfig.maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  // Parse vendor response and map to our schema
  parseVendorResponse(data, mapping) {
    try {
      const result = {
        status: this.extractValue(data, mapping.statusField),
        eolDate: this.parseDate(this.extractValue(data, mapping.eolDateField)),
        eoslDate: this.parseDate(this.extractValue(data, mapping.eoslDateField)),
        latestMajorVersion: this.extractValue(data, mapping.latestVersionField),
        criticalCVEs: this.parseCVEs(this.extractValue(data, mapping.cveField)),
        patchHistory: this.parsePatchHistory(data)
      };

      return result;
    } catch (error) {
      console.error('Error parsing vendor response:', error);
      return null;
    }
  }

  // Extract value from nested object
  extractValue(obj, path) {
    if (!path) return null;
    
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  // Parse date string
  parseDate(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  // Parse CVEs from vendor data
  parseCVEs(cveData) {
    if (!cveData || !Array.isArray(cveData)) return [];
    
    return cveData.map(cve => ({
      cveId: cve.id || cve.cve_id || cve.cveId,
      severity: this.normalizeSeverity(cve.severity || cve.cvss_severity),
      description: cve.description || cve.summary,
      publishedDate: this.parseDate(cve.published_date || cve.publishedDate),
      lastModifiedDate: this.parseDate(cve.last_modified_date || cve.lastModifiedDate),
      cvssScore: parseFloat(cve.cvss_score || cve.cvssScore) || null
    })).filter(cve => cve.cveId && cve.severity);
  }

  // Normalize severity levels
  normalizeSeverity(severity) {
    if (!severity) return 'unknown';
    
    const normalized = severity.toLowerCase();
    
    if (['critical', 'high', 'medium', 'low'].includes(normalized)) {
      return normalized;
    }
    
    // Map common variations
    const severityMap = {
      'crit': 'critical',
      'high': 'high',
      'med': 'medium',
      'medium': 'medium',
      'low': 'low',
      'info': 'low'
    };
    
    return severityMap[normalized] || 'unknown';
  }

  // Parse patch history
  parsePatchHistory(data) {
    if (!data.patches || !Array.isArray(data.patches)) return [];
    
    return data.patches.map(patch => ({
      version: patch.version,
      releaseDate: this.parseDate(patch.release_date || patch.releaseDate),
      description: patch.description || patch.summary,
      securityFixes: patch.security_fixes || patch.securityFixes || [],
      bugFixes: patch.bug_fixes || patch.bugFixes || []
    })).filter(patch => patch.version);
  }

  // Check rate limiting
  checkRateLimit(vendorPortal) {
    const now = Date.now();
    const key = vendorPortal.vendorName;
    
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, []);
    }
    
    const requests = this.rateLimiters.get(key);
    
    // Remove old requests outside the window
    const windowMs = 60 * 1000; // 1 minute
    const filteredRequests = requests.filter(time => now - time < windowMs);
    
    if (filteredRequests.length >= vendorPortal.rateLimiting.requestsPerMinute) {
      return false;
    }
    
    filteredRequests.push(now);
    this.rateLimiters.set(key, filteredRequests);
    
    return true;
  }

  // Update vendor portal with error
  async updateVendorPortalError(vendor, error) {
    try {
      await VendorPortal.findOneAndUpdate(
        { vendorName: new RegExp(vendor, 'i') },
        {
          $set: { syncStatus: 'failed' },
          $push: {
            syncErrors: {
              timestamp: new Date(),
              error: error.message,
              details: {
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText
              }
            }
          }
        }
      );
    } catch (updateError) {
      console.error('Error updating vendor portal error:', updateError);
    }
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Bulk fetch vendor data for multiple applications
  async bulkFetchVendorData(applications) {
    const results = [];
    
    for (const app of applications) {
      try {
        const vendorData = await this.fetchVendorData(app.vendor, app.name, app.version);
        results.push({
          applicationId: app._id,
          success: true,
          data: vendorData
        });
      } catch (error) {
        results.push({
          applicationId: app._id,
          success: false,
          error: error.message
        });
      }
      
      // Add delay between requests to respect rate limits
      await this.sleep(1000);
    }
    
    return results;
  }

  // Get vendor portal status
  async getVendorPortalStatus(vendorName) {
    try {
      const portal = await VendorPortal.findOne({ 
        vendorName: new RegExp(vendorName, 'i') 
      });
      
      if (!portal) {
        return { status: 'not_configured' };
      }
      
      return {
        status: portal.syncStatus,
        lastSync: portal.lastSync,
        isActive: portal.isActive,
        errorCount: portal.syncErrors.length,
        lastError: portal.syncErrors.length > 0 ? portal.syncErrors[portal.syncErrors.length - 1] : null
      };
    } catch (error) {
      console.error('Error getting vendor portal status:', error);
      return { status: 'error', error: error.message };
    }
  }
}

// Export singleton instance
const vendorService = new VendorService();
module.exports = vendorService;

// Export individual functions for backward compatibility
module.exports.fetchVendorData = (vendor, product, version) => 
  vendorService.fetchVendorData(vendor, product, version);

module.exports.bulkFetchVendorData = (applications) => 
  vendorService.bulkFetchVendorData(applications);

module.exports.getVendorPortalStatus = (vendorName) => 
  vendorService.getVendorPortalStatus(vendorName); 