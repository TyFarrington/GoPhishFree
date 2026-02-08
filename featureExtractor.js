// ═══════════════════════════════════════════════════════════════════
// GoPhishFree – Feature Extraction Module
//
// Three classes for extracting phishing signals at different tiers:
//
//   FeatureExtractor  (Tier 1)  – 25 URL/email features from Gmail DOM
//   DnsChecker        (Tier 2)  – 4 DNS-over-HTTPS features (Cloudflare/Google)
//   PageAnalyzer      (Tier 3)  – 13 page structure features from fetched HTML
//
// All processing is local. Only DnsChecker sends external requests
// (domain names only, no email content). PageAnalyzer operates on
// a DOMParser document — no scripts execute, no resources load.
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// FeatureExtractor – Tier 1 Email Feature Extraction
//
// Extracts 25 ML model features + 10 custom-engineered features
// from email content visible in the Gmail DOM. No external requests.
// Feature order in mapToModelInput() MUST match LOCAL_FEATURES in
// train_model.py.
// ─────────────────────────────────────────────────────────────────

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
      FrequentDomainNameMismatch: this.countLinkMismatches(emailData.links || []) > 0 ? 1 : 0,

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
   * Check if domain name appears in subdomain (phishing technique)
   * Example: paypal.com.phishing.com -> domain "paypal.com" in subdomain
   */
  checkDomainInSubdomains(hostname) {
    if (!hostname) return false;

    const parts = hostname.split('.');
    if (parts.length < 3) return false; // Need at least subdomain.domain.tld

    // Check if any subdomain part looks like a full domain
    // e.g., "paypal.com" in "paypal.com.evil.com"
    for (let i = 0; i < parts.length - 2; i++) {
      const subdomain = parts.slice(i, i + 2).join('.');
      // Check if this looks like a common domain pattern
      if (subdomain.match(/^[a-z0-9-]+\.(com|net|org|gov|edu)$/i)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if domain name appears in URL path (phishing technique)
   * Example: evil.com/paypal.com/login -> domain "paypal.com" in path
   */
  checkDomainInPaths(hostname, pathname) {
    if (!pathname || pathname === '/') return false;

    const pathLower = pathname.toLowerCase();

    // Extract actual domain from hostname
    const domainParts = hostname.split('.');
    if (domainParts.length < 2) return false;

    const actualDomain = domainParts.slice(-2).join('.'); // Get domain.tld

    // Check if a different domain appears in the path
    const domainPattern = /([a-z0-9-]+\.(com|net|org|gov|edu|io|co))/gi;
    const matches = pathLower.match(domainPattern);

    if (matches) {
      // Check if any matched domain is different from the actual hostname domain
      for (const match of matches) {
        if (!actualDomain.includes(match) && !match.includes(actualDomain)) {
          return true; // Found a different domain in path
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

  /**
   * Map extracted features to ML model input format (25 dataset features).
   * ORDER MUST MATCH train_model.py LOCAL_FEATURES exactly.
   */
  mapToModelInput(features) {
    return [
      features.NumDots || 0,
      features.SubdomainLevel || 0,
      features.PathLevel || 0,
      features.UrlLength || 0,
      features.NumDash || 0,
      features.NumDashInHostname || 0,
      features.AtSymbol || 0,
      features.TildeSymbol || 0,
      features.NumUnderscore || 0,
      features.NumPercent || 0,
      features.NumQueryComponents || 0,
      features.NumAmpersand || 0,
      features.NumHash || 0,
      features.NumNumericChars || 0,
      features.NoHttps || 0,
      features.IpAddress || 0,
      features.DomainInSubdomains || 0,
      features.DomainInPaths || 0,
      features.HttpsInHostname || 0,
      features.HostnameLength || 0,
      features.PathLength || 0,
      features.QueryLength || 0,
      features.DoubleSlashInPath || 0,
      features.NumSensitiveWords || 0,
      features.FrequentDomainNameMismatch || 0
    ];
  }

  /**
   * Return the 10 custom-engineered features used for rule-based
   * adjustment on top of the ML prediction.
   */
  getCustomFeatures(features) {
    return {
      SuspiciousTLD:          features.SuspiciousTLD || 0,
      ShortenerDomain:        features.ShortenerDomain || 0,
      Punycode:               features.Punycode || 0,
      LinkMismatchCount:      features.LinkMismatchCount || 0,
      LinkMismatchRatio:      features.LinkMismatchRatio || 0,
      HeaderMismatch:         features.HeaderMismatch || 0,
      UrgencyScore:           features.UrgencyScore || 0,
      CredentialRequestScore: features.CredentialRequestScore || 0,
      LinkCount:              features.LinkCount || 0,
      AttachmentCount:        features.AttachmentCount || 0
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// DnsChecker – Tier 2 DNS-over-HTTPS feature extraction
// Uses public Cloudflare / Google DoH endpoints (no API keys).
// Only domain names are sent; no email content leaves the device.
// ─────────────────────────────────────────────────────────────────

class DnsChecker {
  constructor() {
    this.cache = new Map();        // domain → { result, timestamp }
    this.CACHE_TTL = 5 * 60_000;  // 5 minutes
    this.TIMEOUT   = 4_000;       // 4 s per request
  }

  // ── public API ───────────────────────────────────────────────

  /**
   * Return Tier-2 DNS features for a single domain.
   * All values are numeric (0 or 1, or a float for entropy).
   */
  async checkDomain(domain) {
    if (!domain) return this.defaultFeatures();

    // Normalise
    domain = domain.toLowerCase().replace(/\.+$/, '');

    // Cache hit?
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
      // A-record check (domain existence + IP count)
      const aRes = await this.dnsQuery(domain, 'A');
      if (aRes && aRes.Answer && aRes.Answer.length > 0) {
        result.DomainExists = 1;
        result.MultipleIPs  = aRes.Answer.filter(r => r.type === 1).length > 1 ? 1 : 0;
      }

      // MX-record check (legitimate email senders usually have MX records)
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
   * Check multiple domains (e.g. sender + all link domains) in parallel.
   * Returns an *aggregated* feature object.
   */
  async checkDomains(domains) {
    if (!domains || domains.length === 0) return this.defaultFeatures();

    // De-duplicate
    const unique = [...new Set(domains.map(d => d.toLowerCase().replace(/\.+$/, '')))];

    const results = await Promise.all(unique.map(d => this.checkDomain(d)));

    // Aggregate: if ANY domain fails a check, flag it
    return {
      DomainExists:       results.every(r => r.DomainExists)       ? 1 : 0,
      HasMXRecord:        results.some(r => r.HasMXRecord)         ? 1 : 0,
      MultipleIPs:        results.some(r => r.MultipleIPs)         ? 1 : 0,
      RandomStringDomain: results.some(r => r.RandomStringDomain)  ? 1 : 0,
      // Extra: count of domains that do NOT resolve
      UnresolvedDomains:  results.filter(r => !r.DomainExists).length
    };
  }

  // ── DNS-over-HTTPS query ─────────────────────────────────────

  async dnsQuery(domain, type) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT);

    try {
      // Primary: Cloudflare
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
      // Fallback: Google DoH
      try {
        const resp2 = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`
        );
        if (resp2.ok) return await resp2.json();
      } catch (_) { /* both failed */ }
      throw err;
    }
  }

  // ── Random-string / entropy detection ────────────────────────

  /**
   * Heuristic: phishing domains often use random alphanumeric strings.
   * Shannon entropy > 3.5 on the registrable part is a strong signal.
   */
  isRandomString(domain) {
    const parts = domain.split('.');
    if (parts.length < 2) return false;

    // Take everything except the public-suffix TLD
    const name = parts.slice(0, -1).join('');
    if (name.length < 6) return false;   // too short to judge

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

  // ── Defaults ─────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────
// PageAnalyzer – Tier 3 Deep Scan feature extraction
// Parses an HTML Document (from DOMParser) and extracts 13 features
// that correspond to Kaggle dataset columns requiring a page visit.
// No network calls – pure DOM traversal.
// ─────────────────────────────────────────────────────────────────

class PageAnalyzer {
  constructor() {
    // Well-known brand names for EmbeddedBrandName detection
    this.brandNames = [
      'paypal', 'apple', 'google', 'microsoft', 'amazon', 'facebook',
      'netflix', 'ebay', 'chase', 'wellsfargo', 'bankofamerica', 'citibank',
      'usps', 'fedex', 'ups', 'dhl', 'irs', 'dropbox', 'adobe', 'linkedin',
      'instagram', 'twitter', 'yahoo', 'outlook', 'office365', 'docusign',
      'spotify', 'walmart', 'costco', 'target', 'bestbuy'
    ];
  }

  /**
   * Extract all 13 deep-scan features from a parsed Document.
   * @param {Document} doc – HTML document from DOMParser
   * @param {string}   pageUrl – the URL the HTML was fetched from
   * @returns {Object}  feature map with the 13 Kaggle-compatible keys
   *
   * SECURITY: This operates on a DOMParser document — no scripts can
   * execute, no resources are loaded, no network requests are made.
   * DOM queries are bounded by the 50k-node check in content.js.
   */
  extractFeatures(doc, pageUrl) {
    if (!doc || !doc.querySelectorAll) return this.defaultFeatures();

    let pageDomain = '';
    try { pageDomain = new URL(pageUrl).hostname.toLowerCase(); } catch (_) {}

    return {
      // ── Form features (5) ──
      InsecureForms:       this.detectInsecureForms(doc),
      RelativeFormAction:  this.detectRelativeFormAction(doc),
      ExtFormAction:       this.detectExtFormAction(doc, pageDomain),
      AbnormalFormAction:  this.detectAbnormalFormAction(doc),
      SubmitInfoToEmail:   this.detectSubmitToEmail(doc),

      // ── External resource features (4) ──
      PctExtHyperlinks:              this.calcPctExtHyperlinks(doc, pageDomain),
      PctExtResourceUrls:            this.calcPctExtResourceUrls(doc, pageDomain),
      ExtFavicon:                    this.detectExtFavicon(doc, pageDomain),
      PctNullSelfRedirectHyperlinks: this.calcPctNullSelfRedirect(doc, pageUrl),

      // ── Page structure (4) ──
      IframeOrFrame:      this.detectIframeOrFrame(doc),
      MissingTitle:       this.detectMissingTitle(doc),
      ImagesOnlyInForm:   this.detectImagesOnlyInForm(doc),
      EmbeddedBrandName:  this.detectEmbeddedBrand(doc, pageDomain)
    };
  }

  // ── Form features ─────────────────────────────────────────────

  /** Forms with action starting with http: (not https) */
  detectInsecureForms(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim().toLowerCase();
      if (action.startsWith('http:')) return 1;
    }
    return 0;
  }

  /** Forms with relative action URL (no protocol) */
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

  /** Forms submitting to a different domain */
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

  /** Forms with empty, #, about:blank, or javascript:void action */
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

  /** Forms with mailto: action */
  detectSubmitToEmail(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim().toLowerCase();
      if (action.startsWith('mailto:')) return 1;
    }
    return 0;
  }

  // ── External resource features ────────────────────────────────

  /** Percentage of <a> links pointing to external domains (0.0 – 1.0) */
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

  /** Percentage of resources (img, script, link[rel=stylesheet]) from external domains */
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

  /** Favicon loaded from external domain */
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

  /** Percentage of links that are #, empty, self-referencing, or javascript:void */
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

  // ── Page structure features ───────────────────────────────────

  /** Page uses <iframe> or <frame> */
  detectIframeOrFrame(doc) {
    return doc.querySelectorAll('iframe, frame').length > 0 ? 1 : 0;
  }

  /** No <title> element or empty title */
  detectMissingTitle(doc) {
    const title = doc.querySelector('title');
    return (!title || !title.textContent.trim()) ? 1 : 0;
  }

  /** Forms that contain only images, no text/password/email inputs */
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

  /** Brand name appears in page text but domain doesn't match the brand */
  detectEmbeddedBrand(doc, pageDomain) {
    const bodyText = (doc.body ? doc.body.textContent : '').toLowerCase();
    for (const brand of this.brandNames) {
      if (bodyText.includes(brand) && !pageDomain.includes(brand)) {
        return 1;
      }
    }
    return 0;
  }

  // ── Defaults ──────────────────────────────────────────────────

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
