// Feature extraction for locally-available email signals
// Maps to a subset of Kaggle dataset features that can be computed from Gmail UI

class FeatureExtractor {
  constructor() {
    // Suspicious TLDs
    this.suspiciousTLDs = new Set([
      'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'click', 'download', 
      'stream', 'online', 'site', 'website', 'space', 'tech', 'store'
    ]);
    
    // Shortener domains
    this.shortenerDomains = new Set([
      'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'buff.ly',
      'is.gd', 'v.gd', 'short.link', 'cutt.ly', 'rebrand.ly'
    ]);
    
    // Urgency keywords
    this.urgencyKeywords = [
      'urgent', 'immediately', 'asap', 'expire', 'expired', 'expiring',
      'verify', 'verify now', 'confirm', 'action required', 'suspended',
      'locked', 'security', 'unauthorized', 'breach', 'compromised'
    ];
    
    // Credential request keywords
    this.credentialKeywords = [
      'password', 'login', 'credentials', 'account', 'verify account',
      'update account', 'confirm identity', 'security check'
    ];
  }
  
  /**
   * Extract URL lexical features
   */
  extractURLFeatures(url) {
    if (!url || typeof url !== 'string') {
      return this.getDefaultURLFeatures();
    }
    
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      const search = urlObj.search;
      
      return {
        NumDots: (url.match(/\./g) || []).length,
        SubdomainLevel: (hostname.match(/\./g) || []).length - 1,
        PathLevel: (pathname.match(/\//g) || []).length - 1,
        UrlLength: url.length,
        NumDash: (url.match(/-/g) || []).length,
        NumDashInHostname: (hostname.match(/-/g) || []).length,
        AtSymbol: url.includes('@') ? 1 : 0,
        NumUnderscore: (url.match(/_/g) || []).length,
        NumPercent: (url.match(/%/g) || []).length,
        NumQueryComponents: search ? (search.match(/[?&]/g) || []).length : 0,
        NumAmpersand: (url.match(/&/g) || []).length,
        NumHash: (url.match(/#/g) || []).length,
        NumNumericChars: (url.match(/[0-9]/g) || []).length,
        NoHttps: urlObj.protocol !== 'https:' ? 1 : 0,
        IpAddress: this.isIPAddress(hostname) ? 1 : 0,
        HostnameLength: hostname.length,
        PathLength: pathname.length,
        QueryLength: search.length,
        DoubleSlashInPath: pathname.includes('//') ? 1 : 0,
        SuspiciousTLD: this.hasSuspiciousTLD(hostname) ? 1 : 0,
        ShortenerDomain: this.isShortenerDomain(hostname) ? 1 : 0,
        Punycode: hostname.includes('xn--') ? 1 : 0
      };
    } catch (e) {
      return this.getDefaultURLFeatures();
    }
  }
  
  /**
   * Extract features from email content
   */
  extractEmailFeatures(emailData) {
    const features = {
      // URL features (aggregated from all links)
      ...this.aggregateURLFeatures(emailData.links || []),
      
      // Link mismatch features
      LinkMismatchCount: this.countLinkMismatches(emailData.links || []),
      LinkMismatchRatio: this.calculateLinkMismatchRatio(emailData.links || []),
      
      // Header mismatch
      HeaderMismatch: this.detectHeaderMismatch(emailData.senderDisplayName, emailData.senderDomain),
      
      // Text features
      NumSensitiveWords: this.countSensitiveWords(emailData.text || ''),
      UrgencyScore: this.calculateUrgencyScore(emailData.text || ''),
      CredentialRequestScore: this.calculateCredentialRequestScore(emailData.text || ''),
      
      // Basic counts
      LinkCount: (emailData.links || []).length,
      AttachmentCount: (emailData.attachments || []).length
    };
    
    return features;
  }
  
  /**
   * Aggregate URL features from multiple links
   */
  aggregateURLFeatures(links) {
    if (!links || links.length === 0) {
      return this.getDefaultURLFeatures();
    }
    
    const urlFeatures = links.map(link => 
      this.extractURLFeatures(link.href || link.url)
    );
    
    // Average the features
    const aggregated = {};
    const featureKeys = Object.keys(urlFeatures[0]);
    
    featureKeys.forEach(key => {
      const values = urlFeatures.map(f => f[key]).filter(v => !isNaN(v));
      aggregated[key] = values.length > 0 
        ? values.reduce((a, b) => a + b, 0) / values.length 
        : 0;
    });
    
    return aggregated;
  }
  
  /**
   * Count link mismatches (anchor text domain vs href domain)
   */
  countLinkMismatches(links) {
    let mismatchCount = 0;
    
    links.forEach(link => {
      const anchorDomain = this.extractDomain(link.anchorText || '');
      const hrefDomain = this.extractDomain(link.href || link.url || '');
      
      if (anchorDomain && hrefDomain && anchorDomain !== hrefDomain) {
        mismatchCount++;
      }
    });
    
    return mismatchCount;
  }
  
  /**
   * Calculate link mismatch ratio
   */
  calculateLinkMismatchRatio(links) {
    if (!links || links.length === 0) return 0;
    return this.countLinkMismatches(links) / links.length;
  }
  
  /**
   * Detect header mismatch (display name vs domain pattern)
   */
  detectHeaderMismatch(displayName, domain) {
    if (!displayName || !domain) return 0;
    
    const domainBase = domain.split('.')[0].toLowerCase();
    const displayNameLower = displayName.toLowerCase();
    
    // Check if domain base appears in display name
    if (displayNameLower.includes(domainBase)) {
      return 0; // Match found
    }
    
    // Check for common patterns
    const commonPatterns = ['noreply', 'no-reply', 'mail', 'email', 'support', 'service'];
    const hasCommonPattern = commonPatterns.some(pattern => 
      displayNameLower.includes(pattern) && !domain.includes(pattern)
    );
    
    return hasCommonPattern ? 1 : 0;
  }
  
  /**
   * Count sensitive words in text
   */
  countSensitiveWords(text) {
    const lowerText = text.toLowerCase();
    const allKeywords = [...this.urgencyKeywords, ...this.credentialKeywords];
    return allKeywords.filter(keyword => lowerText.includes(keyword)).length;
  }
  
  /**
   * Calculate urgency score
   */
  calculateUrgencyScore(text) {
    const lowerText = text.toLowerCase();
    return this.urgencyKeywords.filter(keyword => lowerText.includes(keyword)).length;
  }
  
  /**
   * Calculate credential request score
   */
  calculateCredentialRequestScore(text) {
    const lowerText = text.toLowerCase();
    return this.credentialKeywords.filter(keyword => lowerText.includes(keyword)).length;
  }
  
  /**
   * Extract domain from URL or text
   */
  extractDomain(input) {
    if (!input) return null;
    
    try {
      if (input.startsWith('http')) {
        return new URL(input).hostname;
      }
      // Try to extract domain-like pattern
      const match = input.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  }
  
  /**
   * Check if hostname is an IP address
   */
  isIPAddress(hostname) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipv4Regex.test(hostname);
  }
  
  /**
   * Check if hostname has suspicious TLD
   */
  hasSuspiciousTLD(hostname) {
    const parts = hostname.split('.');
    if (parts.length < 2) return false;
    const tld = parts[parts.length - 1].toLowerCase();
    return this.suspiciousTLDs.has(tld);
  }
  
  /**
   * Check if hostname is a shortener domain
   */
  isShortenerDomain(hostname) {
    return this.shortenerDomains.has(hostname.toLowerCase());
  }
  
  /**
   * Get default URL features (for missing/invalid URLs)
   */
  getDefaultURLFeatures() {
    return {
      NumDots: 0,
      SubdomainLevel: 0,
      PathLevel: 0,
      UrlLength: 0,
      NumDash: 0,
      NumDashInHostname: 0,
      AtSymbol: 0,
      NumUnderscore: 0,
      NumPercent: 0,
      NumQueryComponents: 0,
      NumAmpersand: 0,
      NumHash: 0,
      NumNumericChars: 0,
      NoHttps: 1,
      IpAddress: 0,
      HostnameLength: 0,
      PathLength: 0,
      QueryLength: 0,
      DoubleSlashInPath: 0,
      SuspiciousTLD: 0,
      ShortenerDomain: 0,
      Punycode: 0
    };
  }
  
  /**
   * Map extracted features to model input format
   * This should match the features used in model training
   */
  mapToModelInput(features) {
    // Return features in the order expected by the model
    // This will be finalized after model training
    return [
      features.NumDots || 0,
      features.SubdomainLevel || 0,
      features.PathLevel || 0,
      features.UrlLength || 0,
      features.NumDash || 0,
      features.NumDashInHostname || 0,
      features.AtSymbol || 0,
      features.NumUnderscore || 0,
      features.NumPercent || 0,
      features.NumQueryComponents || 0,
      features.NumAmpersand || 0,
      features.NumHash || 0,
      features.NumNumericChars || 0,
      features.NoHttps || 0,
      features.IpAddress || 0,
      features.HostnameLength || 0,
      features.PathLength || 0,
      features.QueryLength || 0,
      features.DoubleSlashInPath || 0,
      features.SuspiciousTLD || 0,
      features.ShortenerDomain || 0,
      features.Punycode || 0,
      features.LinkMismatchCount || 0,
      features.LinkMismatchRatio || 0,
      features.HeaderMismatch || 0,
      features.NumSensitiveWords || 0,
      features.UrgencyScore || 0,
      features.CredentialRequestScore || 0,
      features.LinkCount || 0,
      features.AttachmentCount || 0
    ];
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeatureExtractor;
}
