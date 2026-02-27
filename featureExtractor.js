/**
 * @file featureExtractor.js
 * @description Extracts 20+ phishing-signal features from email data for ML classification.
 *              Contains three tiered classes: FeatureExtractor (Tier 1 URL/email/BEC/attachment
 *              features), DnsChecker (Tier 2 DNS-over-HTTPS features), and PageAnalyzer (Tier 3
 *              HTML page-structure features). All features feed into one unified 64-element
 *              feature vector consumed by the TensorFlow.js phishing detection model.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2025-02-01
 * @dateRevised 2026-02-14 - Sprint 2: Added comprehensive comments and documentation (All programmers)
 *
 * @preconditions The Chrome extension environment must be active. Email data (text, links,
 *                attachments, sender info) must be extracted from the Gmail DOM before calling
 *                feature extraction methods. For DnsChecker, network access to public DoH
 *                endpoints (Cloudflare/Google) is required. For PageAnalyzer, a parsed HTML
 *                Document object must be provided.
 * @acceptableInput emailData object with optional fields: text (string), links (array of
 *                  {href, url, anchorText}), attachments (array of {filename, name}),
 *                  senderDisplayName (string), senderDomain (string), replyTo (string).
 *                  URLs as strings for URL feature extraction. Domain strings for DNS checks.
 *                  Document objects and page URL strings for page analysis.
 * @unacceptableInput null/undefined emailData without fallback handling (methods guard against
 *                    this). Malformed URL strings that cannot be parsed by the URL constructor.
 *                    Non-Document objects passed to PageAnalyzer.extractFeatures().
 *
 * @postconditions A flat feature object or a 64-element numeric array is returned, ready for
 *                 model inference. No email content is transmitted externally by FeatureExtractor
 *                 or PageAnalyzer. DnsChecker sends only domain names to public DoH endpoints.
 * @returnValues FeatureExtractor.extractEmailFeatures() returns a flat object of numeric features.
 *               FeatureExtractor.buildUnifiedVector() returns a 64-element number[].
 *               DnsChecker.checkDomain() returns a DNS feature object.
 *               PageAnalyzer.extractFeatures() returns a page feature object.
 * @errorConditions Invalid URLs return default zero-filled feature objects. DNS query failures
 *                  fall back to Google DoH, then return defaults. Unparseable domains return 0.
 * @sideEffects DnsChecker makes external DNS-over-HTTPS requests to Cloudflare and Google.
 *              DnsChecker caches results in-memory with a 5-minute TTL.
 * @invariants Feature vector order in buildUnifiedVector() MUST match UNIFIED_FEATURES in
 *             train_model.py. The vector is always exactly 64 elements. Missing tier features
 *             default to 0 with context flags (dns_ran, deep_scan_ran) indicating availability.
 * @knownFaults Shannon entropy calculation returns 0 for single-character strings. IP address
 *              detection only covers IPv4. Punycode detection relies on the "xn--" prefix only.
 */

// ═══════════════════════════════════════════════════════════════════════
// SECTION: FeatureExtractor Class — Tier 1 Email/URL + BEC + Attachment
//
// Extracts 25 URL features, 9 custom-rule features, 5 BEC/linkless
// features, and 5 attachment features from email content visible in
// the Gmail DOM. No external requests are made by this class.
// ═══════════════════════════════════════════════════════════════════════

class FeatureExtractor {
  /**
   * Initializes keyword lists, suspicious TLD sets, shortener domain sets,
   * and risky attachment extension sets used across all feature methods.
   */
  constructor() {
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
  //  SECTION: URL Feature Extraction (25 features)
  //  Parses a single URL and computes lexical/structural signals
  //  such as dot count, subdomain depth, path length, special
  //  characters, HTTPS status, IP-based hosting, TLD suspicion,
  //  shortener detection, and punycode (IDN homograph) usage.
  // ================================================================

  /**
   * Extract 25 lexical and structural features from a single URL.
   * @param {string} url - The URL string to analyze (with or without protocol prefix).
   * @returns {Object} An object containing 25 named numeric features (e.g., NumDots,
   *                   SubdomainLevel, UrlLength, NoHttps, IpAddress, SuspiciousTLD, etc.).
   *                   Returns default zero-filled features if the URL is invalid.
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
  //  SECTION: Email Feature Extraction (all local features)
  //  Combines URL aggregation, link mismatch detection, header
  //  analysis, text urgency/credential scoring, BEC pattern
  //  detection, and attachment risk analysis into one flat object.
  // ================================================================

  /**
   * Extract all email-level features (URL, custom, BEC, attachment).
   * Returns a flat object with all feature keys for model consumption.
   * @param {Object} emailData - The email data object extracted from the Gmail DOM.
   * @param {string} [emailData.text=''] - The plain-text body of the email.
   * @param {Array}  [emailData.links=[]] - Array of link objects with href/url and anchorText.
   * @param {Array}  [emailData.attachments=[]] - Array of attachment objects with filename/name.
   * @param {string} [emailData.senderDisplayName] - Display name of the sender.
   * @param {string} [emailData.senderDomain] - Domain portion of the sender's email address.
   * @param {string} [emailData.replyTo] - Reply-To header value.
   * @returns {Object} A flat object containing all numeric feature values (URL features,
   *                   link mismatch, header mismatch, urgency, credential request, BEC,
   *                   and attachment features).
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
  //  SECTION: BEC / Linkless Feature Methods
  //  Business Email Compromise detection features that identify
  //  phishing attempts that rely on social engineering rather than
  //  malicious links — financial requests, authority impersonation,
  //  phone callback lures, and reply-to mismatches.
  // ================================================================

  /**
   * Count financial request keywords in the email body (wire, invoice, ACH, etc.).
   * Higher scores indicate potential BEC wire-fraud attempts.
   * @param {string} text - The plain-text email body.
   * @returns {number} The count of matched financial keywords found in the text.
   */
  calculateFinancialRequestScore(text) {
    const lower = text.toLowerCase();
    return this.financialKeywords.filter(kw => lower.includes(kw)).length;
  }

  /**
   * Count authority/impersonation keywords in the email body (CEO, payroll, IT dept, etc.).
   * Higher scores suggest impersonation of executives or internal departments.
   * @param {string} text - The plain-text email body.
   * @returns {number} The count of matched authority/impersonation keywords.
   */
  calculateAuthorityImpersonationScore(text) {
    const lower = text.toLowerCase();
    return this.authorityKeywords.filter(kw => lower.includes(kw)).length;
  }

  /**
   * Detect phone callback lure patterns where the email urges the recipient to
   * call a phone number (common in vishing/callback phishing).
   * @param {string} text - The plain-text email body.
   * @returns {number} 1 if a call keyword and phone number pattern co-occur, 0 otherwise.
   */
  detectPhoneCallbackPattern(text) {
    const lower = text.toLowerCase();
    // Check for "call" near a phone number pattern
    const hasCallKeyword = /\b(call|phone|dial|ring|contact)\b/.test(lower);
    const hasPhoneNumber = /(\+?\d[\d\s\-().]{7,}\d)/.test(text);
    return (hasCallKeyword && hasPhoneNumber) ? 1 : 0;
  }

  /**
   * Detect reply-to domain mismatch where the reply-to address points to a
   * different domain than the sender, a common spoofing indicator.
   * @param {string} replyTo - The Reply-To header value (email address or domain).
   * @param {string} senderDomain - The sender's email domain.
   * @returns {number} 1 if the reply-to domain differs from the sender domain, 0 otherwise.
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
  //  SECTION: Attachment Feature Methods
  //  Analyzes email attachments for risky file extensions, double
  //  extension obfuscation, and randomized filename entropy — all
  //  common techniques used to deliver malicious payloads.
  // ================================================================

  /**
   * Check if any attachment has a risky file extension (executables, scripts, archives).
   * @param {Array} attachments - Array of attachment objects with filename or name properties.
   * @returns {number} 1 if any attachment has a risky extension, 0 otherwise.
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
   * Detect double file extensions (e.g., invoice.pdf.exe) — a social engineering
   * trick to disguise executable files as harmless document types.
   * @param {Array} attachments - Array of attachment objects with filename or name properties.
   * @returns {number} 1 if any attachment uses a double extension ending in a risky type, 0 otherwise.
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
   * Calculate average Shannon entropy of attachment filenames. High entropy names
   * (e.g., random hex strings) are common in automated malware delivery.
   * @param {Array} attachments - Array of attachment objects with filename or name properties.
   * @returns {number} Average Shannon entropy across all attachment filenames (0 if none).
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
   * Compute Shannon entropy of a string, measuring its information density /
   * randomness. Values above ~3.5 bits suggest random or obfuscated strings.
   * @param {string} str - The input string to compute entropy for.
   * @returns {number} Shannon entropy in bits.
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
  //  SECTION: URL Aggregation & Helper Methods
  //  Averages URL features across all links in an email, detects
  //  anchor-text / href domain mismatches, header spoofing, urgency
  //  and credential-request language, and provides domain parsing
  //  and TLD/shortener/IP detection utilities.
  // ================================================================

  /**
   * Aggregate URL features from multiple links by averaging feature values
   * across all links found in the email.
   * @param {Array} links - Array of link objects with href or url properties.
   * @returns {Object} Averaged URL feature object with the same keys as extractURLFeatures().
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
   * Count link mismatches where the anchor text displays a different domain than the
   * actual href destination — a classic phishing deception technique.
   * @param {Array} links - Array of link objects with anchorText and href/url properties.
   * @returns {number} The count of links with domain mismatches.
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
   * Calculate the ratio of mismatched links to total links in the email.
   * @param {Array} links - Array of link objects with anchorText and href/url properties.
   * @returns {number} Ratio of mismatched links (0.0 to 1.0), or 0 if no links present.
   */
  calculateLinkMismatchRatio(links) {
    if (!links || links.length === 0) return 0;
    return this.countLinkMismatches(links) / links.length;
  }

  /**
   * Detect header mismatch where the sender's display name does not align with
   * their email domain, suggesting potential spoofing.
   * @param {string} displayName - The sender's display name from the email header.
   * @param {string} domain - The sender's email domain.
   * @returns {number} 1 if a suspicious mismatch pattern is detected, 0 otherwise.
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
   * Count the total number of sensitive words (urgency + credential keywords) in the text.
   * @param {string} text - The plain-text email body.
   * @returns {number} Total count of matched urgency and credential keywords.
   */
  countSensitiveWords(text) {
    const lowerText = text.toLowerCase();
    const allKeywords = [...this.urgencyKeywords, ...this.credentialKeywords];
    return allKeywords.filter(keyword => lowerText.includes(keyword)).length;
  }

  /**
   * Calculate urgency score by counting urgency-related keywords in the email body.
   * @param {string} text - The plain-text email body.
   * @returns {number} Count of matched urgency keywords (e.g., "urgent", "verify now").
   */
  calculateUrgencyScore(text) {
    const lowerText = text.toLowerCase();
    return this.urgencyKeywords.filter(keyword => lowerText.includes(keyword)).length;
  }

  /**
   * Calculate credential request score by counting credential-related keywords in the body.
   * @param {string} text - The plain-text email body.
   * @returns {number} Count of matched credential keywords (e.g., "password", "login").
   */
  calculateCredentialRequestScore(text) {
    const lowerText = text.toLowerCase();
    return this.credentialKeywords.filter(keyword => lowerText.includes(keyword)).length;
  }

  /**
   * Extract the domain hostname from a URL string or text containing a domain pattern.
   * @param {string} input - A URL string or text that may contain a domain.
   * @returns {string|null} The extracted domain hostname, or null if none found.
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
   * Check if a hostname is an IPv4 address (e.g., 192.168.1.1). IP-based URLs
   * are a strong phishing indicator as legitimate sites use domain names.
   * @param {string} hostname - The hostname portion of a URL.
   * @returns {boolean} True if the hostname matches an IPv4 address pattern.
   */
  isIPAddress(hostname) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipv4Regex.test(hostname);
  }

  /**
   * Check if the hostname ends with a suspicious top-level domain commonly abused
   * by phishing campaigns (e.g., .tk, .xyz, .click).
   * @param {string} hostname - The hostname portion of a URL.
   * @returns {boolean} True if the TLD is in the suspicious set.
   */
  hasSuspiciousTLD(hostname) {
    const parts = hostname.split('.');
    if (parts.length < 2) return false;
    const tld = parts[parts.length - 1].toLowerCase();
    return this.suspiciousTLDs.has(tld);
  }

  /**
   * Check if the hostname belongs to a known URL shortener service (e.g., bit.ly, t.co).
   * Shortened URLs obscure the true destination and are frequently used in phishing.
   * @param {string} hostname - The hostname portion of a URL.
   * @returns {boolean} True if the hostname matches a known shortener domain.
   */
  isShortenerDomain(hostname) {
    return this.shortenerDomains.has(hostname.toLowerCase());
  }

  /**
   * Check if a recognizable domain name appears as a subdomain (e.g., paypal.com.evil.tk),
   * a common phishing technique to impersonate legitimate sites.
   * @param {string} hostname - The full hostname to analyze.
   * @returns {boolean} True if a domain-like pattern is found in the subdomain portion.
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
   * Check if a different domain name appears in the URL path (e.g., evil.com/paypal.com/login),
   * another phishing technique used to deceive users about the destination.
   * @param {string} hostname - The actual hostname of the URL.
   * @param {string} pathname - The path portion of the URL.
   * @returns {boolean} True if a foreign domain pattern is found in the path.
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
   * Get default URL features (all zeros except NoHttps=1) for use when no valid URL
   * is available. Ensures the feature vector always has the expected structure.
   * @returns {Object} A zero-filled URL feature object with 25 named properties.
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

// ═══════════════════════════════════════════════════════════════════════
// SECTION: DnsChecker Class — Tier 2 DNS-over-HTTPS Feature Extraction
//
// Uses public Cloudflare / Google DoH endpoints (no API keys required).
// Only domain names are sent; no email content leaves the device.
// Features include domain existence, MX record presence, multiple IP
// resolution, and random-string domain detection via Shannon entropy.
// Results are cached in-memory with a 5-minute TTL.
// ═══════════════════════════════════════════════════════════════════════

class DnsChecker {
  /**
   * Initialize DNS checker with an in-memory cache, TTL, and request timeout.
   */
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 5 * 60_000;
    this.TIMEOUT   = 4_000;
  }

  // -- Public API ---------------------------------------------------

  /**
   * Return Tier-2 DNS features for a single domain. Results are cached
   * for 5 minutes to avoid redundant network requests.
   * @param {string} domain - The domain name to check (e.g., "example.com").
   * @returns {Promise<Object>} DNS feature object with DomainExists, HasMXRecord,
   *                            MultipleIPs, and RandomStringDomain (all 0 or 1).
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
   * Check multiple domains in parallel and return aggregated DNS features.
   * @param {Array<string>} domains - Array of domain name strings to check.
   * @returns {Promise<Object>} Aggregated DNS feature object with DomainExists (all exist),
   *                            HasMXRecord (any has MX), MultipleIPs (any has multiple),
   *                            RandomStringDomain (any is random), UnresolvedDomains (count).
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

  // -- DNS-over-HTTPS Query ------------------------------------------

  /**
   * Perform a DNS-over-HTTPS query using Cloudflare as primary and Google as fallback.
   * @param {string} domain - The domain name to query.
   * @param {string} type - The DNS record type (e.g., 'A', 'MX').
   * @returns {Promise<Object>} The parsed DNS JSON response.
   * @throws {Error} If both Cloudflare and Google DoH endpoints fail.
   */
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

  // -- Random-String / Entropy Detection ----------------------------

  /**
   * Determine if a domain name appears to be a random string based on Shannon entropy.
   * Randomly generated domains (DGA domains) are common in phishing infrastructure.
   * @param {string} domain - The full domain name (e.g., "xk7f9a2b.tk").
   * @returns {boolean} True if the domain name (excluding TLD) has entropy > 3.5 bits.
   */
  isRandomString(domain) {
    const parts = domain.split('.');
    if (parts.length < 2) return false;
    const name = parts.slice(0, -1).join('');
    if (name.length < 6) return false;
    return this.shannonEntropy(name) > 3.5;
  }

  /**
   * Compute Shannon entropy of a string for randomness detection.
   * @param {string} str - The input string.
   * @returns {number} Shannon entropy in bits.
   */
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

  /**
   * Return a default DNS feature object with all values set to zero.
   * @returns {Object} Zero-filled DNS feature object.
   */
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

// ═══════════════════════════════════════════════════════════════════════
// SECTION: PageAnalyzer Class — Tier 3 Deep Scan Feature Extraction
//
// Parses an HTML Document object (from DOMParser) and extracts 13
// page-structure features. No network calls — pure DOM traversal.
// Detects insecure forms, external resource loading, iframe usage,
// missing titles, image-only forms, and embedded brand names that
// don't match the page domain (brand impersonation).
// ═══════════════════════════════════════════════════════════════════════

class PageAnalyzer {
  /**
   * Initialize PageAnalyzer with a list of well-known brand names
   * used for brand impersonation detection.
   */
  constructor() {
    this.brandNames = [
      'paypal', 'apple', 'google', 'microsoft', 'amazon', 'facebook',
      'netflix', 'ebay', 'chase', 'wellsfargo', 'bankofamerica', 'citibank',
      'usps', 'fedex', 'ups', 'dhl', 'irs', 'dropbox', 'adobe', 'linkedin',
      'instagram', 'twitter', 'yahoo', 'outlook', 'office365', 'docusign',
      'spotify', 'walmart', 'costco', 'target', 'bestbuy'
    ];
  }

  /**
   * Extract all 13 page-structure features from a parsed HTML Document.
   * @param {Document} doc - A parsed HTML Document object (e.g., from DOMParser).
   * @param {string} pageUrl - The URL of the page being analyzed.
   * @returns {Object} An object containing 13 named numeric page features.
   */
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

  // -- Form Feature Methods ------------------------------------------

  /**
   * Detect forms that submit over insecure HTTP (not HTTPS).
   * @param {Document} doc - The parsed HTML Document.
   * @returns {number} 1 if any form action uses http:, 0 otherwise.
   */
  detectInsecureForms(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim().toLowerCase();
      if (action.startsWith('http:')) return 1;
    }
    return 0;
  }

  /**
   * Detect forms with relative action URLs (not absolute), which may hide the true destination.
   * @param {Document} doc - The parsed HTML Document.
   * @returns {number} 1 if any form has a relative action, 0 otherwise.
   */
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

  /**
   * Detect forms that submit data to an external domain different from the page domain.
   * @param {Document} doc - The parsed HTML Document.
   * @param {string} pageDomain - The domain of the current page.
   * @returns {number} 1 if any form action points to an external domain, 0 otherwise.
   */
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

  /**
   * Detect forms with abnormal action values (empty, "#", "about:blank", or "javascript:").
   * @param {Document} doc - The parsed HTML Document.
   * @returns {number} 1 if any form has an abnormal action, 0 otherwise.
   */
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

  /**
   * Detect forms that submit data to a mailto: address instead of a web endpoint.
   * @param {Document} doc - The parsed HTML Document.
   * @returns {number} 1 if any form action starts with "mailto:", 0 otherwise.
   */
  detectSubmitToEmail(doc) {
    const forms = doc.querySelectorAll('form');
    for (const form of forms) {
      const action = (form.getAttribute('action') || '').trim().toLowerCase();
      if (action.startsWith('mailto:')) return 1;
    }
    return 0;
  }

  // -- External Resource Feature Methods -----------------------------

  /**
   * Calculate the percentage of hyperlinks that point to external domains.
   * @param {Document} doc - The parsed HTML Document.
   * @param {string} pageDomain - The domain of the current page.
   * @returns {number} Ratio of external hyperlinks (0.0 to 1.0), or 0 if no links.
   */
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

  /**
   * Calculate the percentage of resource URLs (images, scripts, stylesheets) loaded from
   * external domains. High external resource usage can indicate a cloned/phishing page.
   * @param {Document} doc - The parsed HTML Document.
   * @param {string} pageDomain - The domain of the current page.
   * @returns {number} Ratio of external resources (0.0 to 1.0), or 0 if no resources.
   */
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

  /**
   * Detect if the page's favicon is loaded from an external domain, which can indicate
   * that the page is impersonating another site by borrowing its favicon.
   * @param {Document} doc - The parsed HTML Document.
   * @param {string} pageDomain - The domain of the current page.
   * @returns {number} 1 if the favicon is loaded from an external domain, 0 otherwise.
   */
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

  /**
   * Calculate the percentage of links that are null, self-referencing, or redirect-type
   * (empty href, "#", javascript:void, etc.). Phishing pages often have non-functional links.
   * @param {Document} doc - The parsed HTML Document.
   * @param {string} pageUrl - The URL of the current page.
   * @returns {number} Ratio of null/self-redirect links (0.0 to 1.0), or 0 if no links.
   */
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

  // -- Page Structure Feature Methods --------------------------------

  /**
   * Detect the presence of iframe or frame elements, which can be used to embed
   * hidden content or load phishing forms from external sources.
   * @param {Document} doc - The parsed HTML Document.
   * @returns {number} 1 if any iframe or frame elements exist, 0 otherwise.
   */
  detectIframeOrFrame(doc) {
    return doc.querySelectorAll('iframe, frame').length > 0 ? 1 : 0;
  }

  /**
   * Detect if the page is missing a title element or has an empty title.
   * @param {Document} doc - The parsed HTML Document.
   * @returns {number} 1 if the title is missing or empty, 0 otherwise.
   */
  detectMissingTitle(doc) {
    const title = doc.querySelector('title');
    return (!title || !title.textContent.trim()) ? 1 : 0;
  }

  /**
   * Detect forms that contain only images (no text inputs), which can indicate a
   * clickjacking attack or image-based phishing form.
   * @param {Document} doc - The parsed HTML Document.
   * @returns {number} 1 if any form contains images but no text inputs, 0 otherwise.
   */
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

  /**
   * Detect if the page body mentions a well-known brand name that doesn't match the
   * page's own domain, suggesting brand impersonation.
   * @param {Document} doc - The parsed HTML Document.
   * @param {string} pageDomain - The domain of the current page.
   * @returns {number} 1 if a mismatched brand name is found, 0 otherwise.
   */
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

  /**
   * Return a default page feature object with all 13 values set to zero.
   * @returns {Object} Zero-filled page feature object.
   */
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
