// =====================================================================
// GoPhishFree - Feature Extraction Module (Unified Schema)
//
// Three classes for extracting phishing signals at different tiers:
//
//   FeatureExtractor  (Tier 1)  - URL/email features + BEC/attachment
//   DnsChecker        (Tier 2)  - DNS-over-HTTPS features
//   PageAnalyzer      (Tier 3)  - Page structure features from HTML
//
// All features feed into ONE unified model (64 features total).
// When a tier hasn't run, its features are default-filled with 0 and
// context flags (dns_ran, deep_scan_ran) tell the model what's missing.
//
// Feature order in buildUnifiedVector() MUST match UNIFIED_FEATURES
// in train_model.py.
// =====================================================================

// -----------------------------------------------------------------
// FeatureExtractor - Tier 1 Email/URL + BEC + Attachment Features
//
// Extracts 25 URL features, 9 custom-rule features, 5 BEC/linkless
// features, and 5 attachment features from email content visible in
// the Gmail DOM. No external requests.
// -----------------------------------------------------------------

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

    // Financial request keywords (BEC)
    this.financialKeywords = [
      'wire', 'wire transfer', 'invoice', 'ach', 'payment', 'transfer',
      'remittance', 'bank account', 'routing number', 'direct deposit',
      'purchase order', 'overdue payment', 'outstanding balance'
    ];

    // Authority/impersonation keywords (BEC)
    this.authorityKeywords = [
      'ceo', 'cfo', 'cto', 'coo', 'president', 'director', 'vice president',
      'payroll', 'it department', 'hr department', 'human resources',
      'executive', 'managing director', 'board of directors', 'chairman'
    ];

    // Risky attachment extensions
    this.riskyExtensions = new Set([
      'exe', 'bat', 'scr', 'cmd', 'ps1', 'vbs', 'js', 'wsf', 'msi',
      'com', 'pif', 'hta', 'cpl', 'reg', 'inf', 'lnk',
      'zip', 'rar', '7z', 'tar', 'gz', 'iso', 'img', 'dmg'
    ]);
  }

  // ================================================================
  //  URL Feature Extraction (25 features)
  // ================================================================

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
        TildeSymbol: url.includes('~') ? 1 : 0,
        NumUnderscore: (url.match(/_/g) || []).length,
        NumPercent: (url.match(/%/g) || []).length,
        NumQueryComponents: search ? (search.match(/[?\u0026]/g) || []).length : 0,
        NumAmpersand: (url.match(/\u0026/g) || []).length,
        NumHash: (url.match(/#/g) || []).length,
        NumNumericChars: (url.match(/[0-9]/g) || []).length,
        NoHttps: urlObj.protocol !== 'https:' ? 1 : 0,
        IpAddress: this.isIPAddress(hostname) ? 1 : 0,
        DomainInSubdomains: this.checkDomainInSubdomains(hostname) ? 1 : 0,
        DomainInPaths: this.checkDomainInPaths(hostname, pathname) ? 1 : 0,
        HttpsInHostname: hostname.toLowerCase().includes('https') ? 1 : 0,
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

  // ================================================================
  //  Email Feature Extraction (all local features)
  // ================================================================

  /**
   * Extract all email-level features (URL, custom, BEC, attachment).
   * Returns a flat object with all feature keys.
   */
  extractEmailFeatures(emailData) {
    const text = emailData.text || '';
    const links = emailData.links || [];
    const attachments = emailData.attachments || [];

    const features = {
      // URL features (aggregated from all links)
      ...this.aggregateURLFeatures(links),

      // Link mismatch features
      LinkMismatchCount: this.countLinkMismatches(links),
      LinkMismatchRatio: this.calculateLinkMismatchRatio(links),
      FrequentDomainNameMismatch: this.countLinkMismatches(links) > 0 ? 1 : 0,

      // Header mismatch
      HeaderMismatch: this.detectHeaderMismatch(emailData.senderDisplayName, emailData.senderDomain),

      // Text features
      NumSensitiveWords: this.countSensitiveWords(text),
      UrgencyScore: this.calculateUrgencyScore(text),
      CredentialRequestScore: this.calculateCredentialRequestScore(text),

      // Basic counts
      LinkCount: links.length,

      // -- BEC / Linkless features --
      FinancialRequestScore: this.calculateFinancialRequestScore(text),
      AuthorityImpersonationScore: this.calculateAuthorityImpersonationScore(text),
      PhoneCallbackPattern: this.detectPhoneCallbackPattern(text),
      ReplyToMismatch: this.detectReplyToMismatch(
        emailData.replyTo || '', emailData.senderDomain || ''
      ),
      IsLinkless: links.length === 0 ? 1 : 0,

      // -- Attachment features --
      HasAttachment: attachments.length > 0 ? 1 : 0,
      AttachmentCount: attachments.length,
      RiskyAttachmentExtension: this.hasRiskyAttachmentExtension(attachments),
      DoubleExtensionFlag: this.hasDoubleExtension(attachments),
      AttachmentNameEntropy: this.calculateAttachmentNameEntropy(attachments)
    };

    return features;
  }

  // ================================================================
  //  BEC / Linkless Feature Methods
  // ================================================================

  /**
   * Count financial request keywords (wire, invoice, ACH, etc.)
   */
  calculateFinancialRequestScore(text) {
    const lower = text.toLowerCase();
    return this.financialKeywords.filter(kw => lower.includes(kw)).length;
  }

  /**
   * Count authority/impersonation keywords (CEO, payroll, IT dept, etc.)
   */
  calculateAuthorityImpersonationScore(text) {
    const lower = text.toLowerCase();
    return this.authorityKeywords.filter(kw => lower.includes(kw)).length;
  }

  /**
   * Detect phone callback lure patterns ("call" + phone number)
   */
  detectPhoneCallbackPattern(text) {
    const lower = text.toLowerCase();
    // Check for "call" near a phone number pattern
    const hasCallKeyword = /\b(call|phone|dial|ring|contact)\b/.test(lower);
    const hasPhoneNumber = /(\+?\d[\d\s\-().]{7,}\d)/.test(text);
    return (hasCallKeyword && hasPhoneNumber) ? 1 : 0;
  }

  /**
   * Detect reply-to domain mismatch (reply-to domain != sender domain)
   */
  detectReplyToMismatch(replyTo, senderDomain) {
    if (!replyTo || !senderDomain) return 0;
    try {
      const replyDomain = replyTo.includes('@')
        ? replyTo.split('@')[1].toLowerCase().trim()
        : replyTo.toLowerCase().trim();
      if (!replyDomain) return 0;
      return replyDomain !== senderDomain.toLowerCase() ? 1 : 0;
    } catch (e) {
      return 0;
    }
  }

  // ================================================================
  //  Attachment Feature Methods
  // ================================================================

  /**
   * Check if any attachment has a risky file extension
   */
  hasRiskyAttachmentExtension(attachments) {
    if (!attachments || attachments.length === 0) return 0;
    for (const att of attachments) {
      const name = (att.filename || att.name || '').toLowerCase();
      const ext = name.split('.').pop();
      if (this.riskyExtensions.has(ext)) return 1;
    }
    return 0;
  }

  /**
   * Detect double file extensions (e.g., invoice.pdf.exe)
   */
  hasDoubleExtension(attachments) {
    if (!attachments || attachments.length === 0) return 0;
    for (const att of attachments) {
      const name = (att.filename || att.name || '').toLowerCase();
      const parts = name.split('.');
      // Double extension: 3+ parts where last part is risky
      if (parts.length >= 3 && this.riskyExtensions.has(parts[parts.length - 1])) {
        return 1;
      }
    }
    return 0;
  }

  /**
   * Calculate Shannon entropy of attachment filenames (average across all)
   */
  calculateAttachmentNameEntropy(attachments) {
    if (!attachments || attachments.length === 0) return 0;

    let totalEntropy = 0;
    let count = 0;

    for (const att of attachments) {
      const name = (att.filename || att.name || '').replace(/\.[^.]+$/, ''); // strip extension
      if (name.length < 2) continue;
      totalEntropy += this._shannonEntropy(name);
      count++;
    }

    return count > 0 ? totalEntropy / count : 0;
  }

  /**
   * Shannon entropy of a string
   */
  _shannonEntropy(str) {
    const freq = {};
    for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  // ================================================================
  //  Unified Feature Vector Builder
  // ================================================================

  /**
   * Build the 64-element unified feature vector for model inference.
   *
   * ORDER MUST MATCH UNIFIED_FEATURES in train_model.py.
   *
   * @param {Object} features     - from extractEmailFeatures()
   * @param {Object|null} dns     - from DnsChecker.checkDomains() or null
   * @param {Object|null} page    - from PageAnalyzer.extractFeatures() or null
   * @param {Object} flags        - { dns_ran: 0|1, deep_scan_ran: 0|1 }
   * @returns {number[]}          - 64-element array
   */
  buildUnifiedVector(features, dns, page, flags) {
    const f = features || {};
    const d = dns || { DomainExists: 0, HasMXRecord: 0, MultipleIPs: 0, RandomStringDomain: 0, UnresolvedDomains: 0 };
    const p = page || { InsecureForms: 0, RelativeFormAction: 0, ExtFormAction: 0, AbnormalFormAction: 0, SubmitInfoToEmail: 0, PctExtHyperlinks: 0, PctExtResourceUrls: 0, ExtFavicon: 0, PctNullSelfRedirectHyperlinks: 0, IframeOrFrame: 0, MissingTitle: 0, ImagesOnlyInForm: 0, EmbeddedBrandName: 0 };
    const fl = flags || { dns_ran: 0, deep_scan_ran: 0 };

    return [
      // Group 1: URL/Email Lexical (25)
      f.NumDots || 0,
      f.SubdomainLevel || 0,
      f.PathLevel || 0,
      f.UrlLength || 0,
      f.NumDash || 0,
      f.NumDashInHostname || 0,
      f.AtSymbol || 0,
      f.TildeSymbol || 0,
      f.NumUnderscore || 0,
      f.NumPercent || 0,
      f.NumQueryComponents || 0,
      f.NumAmpersand || 0,
      f.NumHash || 0,
      f.NumNumericChars || 0,
      f.NoHttps || 0,
      f.IpAddress || 0,
      f.DomainInSubdomains || 0,
      f.DomainInPaths || 0,
      f.HttpsInHostname || 0,
      f.HostnameLength || 0,
      f.PathLength || 0,
      f.QueryLength || 0,
      f.DoubleSlashInPath || 0,
      f.NumSensitiveWords || 0,
      f.FrequentDomainNameMismatch || 0,

      // Group 2: Former custom rules (9)
      f.SuspiciousTLD || 0,
      f.ShortenerDomain || 0,
      f.Punycode || 0,
      f.LinkMismatchCount || 0,
      f.LinkMismatchRatio || 0,
      f.HeaderMismatch || 0,
      f.UrgencyScore || 0,
      f.CredentialRequestScore || 0,
      f.LinkCount || 0,

      // Group 3: DNS features (5)
      d.DomainExists || 0,
      d.HasMXRecord || 0,
      d.MultipleIPs || 0,
      d.RandomStringDomain || 0,
      d.UnresolvedDomains || 0,

      // Group 4: Deep Scan page features (13)
      p.InsecureForms || 0,
      p.RelativeFormAction || 0,
      p.ExtFormAction || 0,
      p.AbnormalFormAction || 0,
      p.SubmitInfoToEmail || 0,
      p.PctExtHyperlinks || 0,
      p.PctExtResourceUrls || 0,
      p.ExtFavicon || 0,
      p.PctNullSelfRedirectHyperlinks || 0,
      p.IframeOrFrame || 0,
      p.MissingTitle || 0,
      p.ImagesOnlyInForm || 0,
      p.EmbeddedBrandName || 0,

      // Group 5: BEC / Linkless features (5)
      f.FinancialRequestScore || 0,
      f.AuthorityImpersonationScore || 0,
      f.PhoneCallbackPattern || 0,
      f.ReplyToMismatch || 0,
      f.IsLinkless || 0,

      // Group 6: Attachment features (5)
      f.HasAttachment || 0,
      f.AttachmentCount || 0,
      f.RiskyAttachmentExtension || 0,
      f.DoubleExtensionFlag || 0,
      f.AttachmentNameEntropy || 0,

      // Group 7: Context flags (2)
      fl.dns_ran || 0,
      fl.deep_scan_ran || 0
    ];
  }

  // ================================================================
  //  URL Aggregation & Helper Methods
  // ================================================================

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
   * Check if domain name appears in subdomain (phishing technique)
   */
  checkDomainInSubdomains(hostname) {
    if (!hostname) return false;

    const parts = hostname.split('.');
    if (parts.length < 3) return false;

    for (let i = 0; i < parts.length - 2; i++) {
      const subdomain = parts.slice(i, i + 2).join('.');
      if (subdomain.match(/^[a-z0-9-]+\.(com|net|org|gov|edu)$/i)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if domain name appears in URL path (phishing technique)
   */
  checkDomainInPaths(hostname, pathname) {
    if (!pathname || pathname === '/') return false;

    const pathLower = pathname.toLowerCase();
    const domainParts = hostname.split('.');
    if (domainParts.length < 2) return false;

    const actualDomain = domainParts.slice(-2).join('.');
    const domainPattern = /([a-z0-9-]+\.(com|net|org|gov|edu|io|co))/gi;
    const matches = pathLower.match(domainPattern);

    if (matches) {
      for (const match of matches) {
        if (!actualDomain.includes(match) && !match.includes(actualDomain)) {
          return true;
        }
      }
    }

    return false;
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
      TildeSymbol: 0,
      NumUnderscore: 0,
      NumPercent: 0,
      NumQueryComponents: 0,
      NumAmpersand: 0,
      NumHash: 0,
      NumNumericChars: 0,
      NoHttps: 1,
      IpAddress: 0,
      DomainInSubdomains: 0,
      DomainInPaths: 0,
      HttpsInHostname: 0,
      HostnameLength: 0,
      PathLength: 0,
      QueryLength: 0,
      DoubleSlashInPath: 0,
      SuspiciousTLD: 0,
      ShortenerDomain: 0,
      Punycode: 0
    };
  }
}

// -----------------------------------------------------------------
// DnsChecker - Tier 2 DNS-over-HTTPS feature extraction
// Uses public Cloudflare / Google DoH endpoints (no API keys).
// Only domain names are sent; no email content leaves the device.
// -----------------------------------------------------------------

class DnsChecker {
  constructor() {
    this.cache = new Map();        // domain -> { result, timestamp }
    this.CACHE_TTL = 5 * 60_000;  // 5 minutes
    this.TIMEOUT   = 4_000;       // 4 s per request
  }

  // -- public API ---------------------------------------------------

  /**
   * Return Tier-2 DNS features for a single domain.
   */
  async checkDomain(domain) {
    if (!domain) return this.defaultFeatures();

    domain = domain.toLowerCase().replace(/\.+$/, '');

    const cached = this.cache.get(domain);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    const result = {
      DomainExists:       0,
      HasMXRecord:        0,
      MultipleIPs:        0,
      RandomStringDomain: this.isRandomString(domain) ? 1 : 0
    };

    try {
      const aRes = await this.dnsQuery(domain, 'A');
      if (aRes && aRes.Answer && aRes.Answer.length > 0) {
        result.DomainExists = 1;
        result.MultipleIPs  = aRes.Answer.filter(r => r.type === 1).length > 1 ? 1 : 0;
      }

      const mxRes = await this.dnsQuery(domain, 'MX');
      if (mxRes && mxRes.Answer && mxRes.Answer.length > 0) {
        result.HasMXRecord = 1;
      }
    } catch (err) {
      console.warn('GoPhishFree DnsChecker: query failed for', domain, err);
    }

    this.cache.set(domain, { result, timestamp: Date.now() });
    return result;
  }

  /**
   * Check multiple domains in parallel. Returns aggregated features.
   */
  async checkDomains(domains) {
    if (!domains || domains.length === 0) return this.defaultFeatures();

    const unique = [...new Set(domains.map(d => d.toLowerCase().replace(/\.+$/, '')))];
    const results = await Promise.all(unique.map(d => this.checkDomain(d)));

    return {
      DomainExists:       results.every(r => r.DomainExists)       ? 1 : 0,
      HasMXRecord:        results.some(r => r.HasMXRecord)         ? 1 : 0,
      MultipleIPs:        results.some(r => r.MultipleIPs)         ? 1 : 0,
      RandomStringDomain: results.some(r => r.RandomStringDomain)  ? 1 : 0,
      UnresolvedDomains:  results.filter(r => !r.DomainExists).length
    };
  }

  // -- DNS-over-HTTPS query -----------------------------------------

  async dnsQuery(domain, type) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT);

    try {
      const resp = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
        {
          headers: { 'Accept': 'application/dns-json' },
          signal: controller.signal
        }
      );
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      try {
        const resp2 = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`
        );
        if (resp2.ok) return await resp2.json();
      } catch (_) { /* both failed */ }
      throw err;
    }
  }

  // -- Random-string / entropy detection ----------------------------

  isRandomString(domain) {
    const parts = domain.split('.');
    if (parts.length < 2) return false;
    const name = parts.slice(0, -1).join('');
    if (name.length < 6) return false;
    return this.shannonEntropy(name) > 3.5;
  }

  shannonEntropy(str) {
    const freq = {};
    for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
    let entropy = 0;
    const len = str.length;
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  // -- Defaults -----------------------------------------------------

  defaultFeatures() {
    return {
      DomainExists: 0,
      HasMXRecord: 0,
      MultipleIPs: 0,
      RandomStringDomain: 0,
      UnresolvedDomains: 0
    };
  }
}

// -----------------------------------------------------------------
// PageAnalyzer - Tier 3 Deep Scan feature extraction
// Parses an HTML Document (from DOMParser) and extracts 13 features.
// No network calls - pure DOM traversal.
// -----------------------------------------------------------------

class PageAnalyzer {
  constructor() {
    this.brandNames = [
      'paypal', 'apple', 'google', 'microsoft', 'amazon', 'facebook',
      'netflix', 'ebay', 'chase', 'wellsfargo', 'bankofamerica', 'citibank',
      'usps', 'fedex', 'ups', 'dhl', 'irs', 'dropbox', 'adobe', 'linkedin',
      'instagram', 'twitter', 'yahoo', 'outlook', 'office365', 'docusign',
      'spotify', 'walmart', 'costco', 'target', 'bestbuy'
    ];
  }

  extractFeatures(doc, pageUrl) {
    if (!doc || !doc.querySelectorAll) return this.defaultFeatures();

    let pageDomain = '';
    try { pageDomain = new URL(pageUrl).hostname.toLowerCase(); } catch (_) {}

    return {
      InsecureForms:       this.detectInsecureForms(doc),
      RelativeFormAction:  this.detectRelativeFormAction(doc),
      ExtFormAction:       this.detectExtFormAction(doc, pageDomain),
      AbnormalFormAction:  this.detectAbnormalFormAction(doc),
      SubmitInfoToEmail:   this.detectSubmitToEmail(doc),
      PctExtHyperlinks:              this.calcPctExtHyperlinks(doc, pageDomain),
      PctExtResourceUrls:            this.calcPctExtResourceUrls(doc, pageDomain),
      ExtFavicon:                    this.detectExtFavicon(doc, pageDomain),
      PctNullSelfRedirectHyperlinks: this.calcPctNullSelfRedirect(doc, pageUrl),
      IframeOrFrame:      this.detectIframeOrFrame(doc),
      MissingTitle:       this.detectMissingTitle(doc),
      ImagesOnlyInForm:   this.detectImagesOnlyInForm(doc),
      EmbeddedBrandName:  this.detectEmbeddedBrand(doc, pageDomain)
    };
  }

  // -- Form features ------------------------------------------------

  detectInsecureForms(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim().toLowerCase();
      if (action.startsWith('http:')) return 1;
    }
    return 0;
  }

  detectRelativeFormAction(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim();
      if (action && !action.match(/^(https?:\/\/|mailto:|javascript:|#|about:)/i)) {
        return 1;
      }
    }
    return 0;
  }

  detectExtFormAction(doc, pageDomain) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim();
      try {
        if (action.startsWith('http')) {
          const actionDomain = new URL(action).hostname.toLowerCase();
          if (actionDomain && actionDomain !== pageDomain) return 1;
        }
      } catch (_) {}
    }
    return 0;
  }

  detectAbnormalFormAction(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim().toLowerCase();
      if (!action || action === '#' || action === 'about:blank' ||
          action.startsWith('javascript:')) {
        return 1;
      }
    }
    return 0;
  }

  detectSubmitToEmail(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim().toLowerCase();
      if (action.startsWith('mailto:')) return 1;
    }
    return 0;
  }

  // -- External resource features -----------------------------------

  calcPctExtHyperlinks(doc, pageDomain) {
    const links = doc.querySelectorAll('a[href]');
    if (links.length === 0) return 0;
    let external = 0;
    for (const link of links) {
      try {
        const href = link.getAttribute('href');
        if (href && href.startsWith('http')) {
          const domain = new URL(href).hostname.toLowerCase();
          if (domain && domain !== pageDomain) external++;
        }
      } catch (_) {}
    }
    return external / links.length;
  }

  calcPctExtResourceUrls(doc, pageDomain) {
    const resources = [
      ...doc.querySelectorAll('img[src]'),
      ...doc.querySelectorAll('script[src]'),
      ...doc.querySelectorAll('link[href]')
    ];
    if (resources.length === 0) return 0;
    let external = 0;
    for (const el of resources) {
      try {
        const src = el.getAttribute('src') || el.getAttribute('href') || '';
        if (src.startsWith('http')) {
          const domain = new URL(src).hostname.toLowerCase();
          if (domain && domain !== pageDomain) external++;
        }
      } catch (_) {}
    }
    return external / resources.length;
  }

  detectExtFavicon(doc, pageDomain) {
    const icons = doc.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"]');
    for (const icon of icons) {
      try {
        const href = (icon.getAttribute('href') || '').trim();
        if (href.startsWith('http')) {
          const domain = new URL(href).hostname.toLowerCase();
          if (domain && domain !== pageDomain) return 1;
        }
      } catch (_) {}
    }
    return 0;
  }

  calcPctNullSelfRedirect(doc, pageUrl) {
    const links = doc.querySelectorAll('a[href]');
    if (links.length === 0) return 0;
    let nullSelf = 0;
    for (const link of links) {
      const href = (link.getAttribute('href') || '').trim().toLowerCase();
      if (!href || href === '#' || href === pageUrl || href === pageUrl + '#' ||
          href.startsWith('javascript:') || href === 'about:blank') {
        nullSelf++;
      }
    }
    return nullSelf / links.length;
  }

  // -- Page structure features --------------------------------------

  detectIframeOrFrame(doc) {
    return doc.querySelectorAll('iframe, frame').length > 0 ? 1 : 0;
  }

  detectMissingTitle(doc) {
    const title = doc.querySelector('title');
    return (!title || !title.textContent.trim()) ? 1 : 0;
  }

  detectImagesOnlyInForm(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const textInputs = form.querySelectorAll(
        'input[type="text"], input[type="password"], input[type="email"], ' +
        'input[type="tel"], input[type="number"], textarea, select'
      );
      const images = form.querySelectorAll('img, input[type="image"]');
      if (images.length > 0 && textInputs.length === 0) return 1;
    }
    return 0;
  }

  detectEmbeddedBrand(doc, pageDomain) {
    const bodyText = (doc.body ? doc.body.textContent : '').toLowerCase();
    for (const brand of this.brandNames) {
      if (bodyText.includes(brand) && !pageDomain.includes(brand)) {
        return 1;
      }
    }
    return 0;
  }

  // -- Defaults -----------------------------------------------------

  defaultFeatures() {
    return {
      InsecureForms: 0,
      RelativeFormAction: 0,
      ExtFormAction: 0,
      AbnormalFormAction: 0,
      SubmitInfoToEmail: 0,
      PctExtHyperlinks: 0,
      PctExtResourceUrls: 0,
      ExtFavicon: 0,
      PctNullSelfRedirectHyperlinks: 0,
      IframeOrFrame: 0,
      MissingTitle: 0,
      ImagesOnlyInForm: 0,
      EmbeddedBrandName: 0
    };
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FeatureExtractor, DnsChecker, PageAnalyzer };
}
