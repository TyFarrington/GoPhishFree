// ═══════════════════════════════════════════════════════════════════
// GoPhishFree – Gmail Content Script
//
// Core content script injected into Gmail. Handles the full
// email scanning lifecycle:
//
//   1. Detect email opens via URL monitoring and DOM mutations
//   2. Extract email features (links, sender, text)
//   3. Run three-stage ML inference pipeline:
//        Stage 1 – Random Forest (25 features, soft-voting)
//        Stage 2 – Custom-feature tiered adjustment (10 features)
//        Stage 3 – DNS-based adjustment (Tier 2, optional)
//   4. Display risk badge on email header + analysis side panel
//   5. Deep Scan: fetch linked pages, extract 13 page features,
//      rescore with expanded 38-feature model (Tier 3, optional)
//   6. Report Phish: manual severity selection dialog
//
// Security: All ML inference runs locally in-browser. Deep Scan
// fetches are proxied through background.js with strict sandboxing.
// ═══════════════════════════════════════════════════════════════════

(function() {
  'use strict';
  
  // ───────────────────── Fish Type Definitions ────────────────
  // Maps risk score ranges to fish classifications used throughout
  // the UI (badges, side panel, fish tank, report dialog).
  const FISH_TYPES = {
    friendly: {
      emoji: '🐟',
      name: 'Friendly Fish',
      description: 'This email looks safe!',
      minRisk: 0,
      maxRisk: 49
    },
    suspicious: {
      emoji: '🐠',
      name: 'Suspicious Fish',
      description: 'Something seems a bit fishy...',
      minRisk: 50,
      maxRisk: 75
    },
    phishy: {
      emoji: '🐡',
      name: 'Phishy Puffer',
      description: 'Watch out! This looks like phishing!',
      minRisk: 76,
      maxRisk: 89
    },
    shark: {
      emoji: '🦈',
      name: 'Mega Phish Shark',
      description: 'DANGER! Highly suspicious phishing attempt!',
      minRisk: 90,
      maxRisk: 100
    }
  };
  
  // ───────────────────── Module Dependencies ──────────────────
  // FeatureExtractor, DnsChecker, and PageAnalyzer are loaded via
  // content_scripts in manifest.json (featureExtractor.js).
  if (typeof FeatureExtractor === 'undefined') {
    console.error('GoPhishFree: FeatureExtractor not loaded');
    return;
  }
  
  // ───────────────────── State & Instances ─────────────────────
  const extractor    = new FeatureExtractor();
  const dnsChecker   = (typeof DnsChecker   !== 'undefined') ? new DnsChecker()   : null;
  const pageAnalyzer = (typeof PageAnalyzer !== 'undefined') ? new PageAnalyzer() : null;

  let currentEmailId    = null;      // ID of the currently viewed email
  let scanInProgress    = false;     // Prevents concurrent scans
  let modelData         = null;      // Tier 1 model (model/model_trees.json, 25 features)
  let modelReady        = false;
  let deepScanModelData = null;      // Tier 3 model (model/model_deepscan.json, 38 features)
  let deepScanModelReady = false;
  let enhancedScanning  = true;      // Tier 2 DNS checks toggle (on by default)

  // Cached data from last scan — used for deep scan rescore and badge restore
  let lastEmailData   = null;
  let lastFeatures    = null;
  let lastDnsFeatures = null;
  let lastPrediction  = null;
  let lastFishData    = null;
  
  // ───────────────────── Bootstrap ────────────────────────────
  // Load user settings, then ML model, then init UI and start monitoring.
  loadSettings().then(() => loadModel()).then(() => {
    initUI();
    observeGmailChanges();
  });
  
  /**
   * Get fish type based on risk score
   */
  function getFishType(riskScore) {
    if (riskScore >= 90) return 'shark';
    if (riskScore >= 76) return 'phishy';
    if (riskScore >= 50) return 'suspicious';
    return 'friendly';
  }
  
  /**
   * Get fish data based on risk score
   */
  function getFishData(riskScore) {
    const type = getFishType(riskScore);
    return { ...FISH_TYPES[type], type };
  }
    
  /**
   * Initialize UI elements
   */
  function initUI() {
    // Create overlay for side panel
    const overlay = document.createElement('div');
    overlay.className = 'gophishfree-overlay';
    overlay.id = 'gophishfree-overlay';
    document.body.appendChild(overlay);
    
    // Create side panel with fish theme
    const sidepanel = document.createElement('div');
    sidepanel.className = 'gophishfree-sidepanel';
    sidepanel.id = 'gophishfree-sidepanel';
    sidepanel.innerHTML = `
      <div class="gophishfree-sidepanel-header">
        <img class="gophishfree-header-banner" src="${chrome.runtime.getURL('Assets/Banner.png')}" alt="GoPhishFree">
        <button class="gophishfree-sidepanel-close" id="gophishfree-close">×</button>
      </div>
      <div class="gophishfree-sidepanel-content" id="gophishfree-content">
        <div class="gophishfree-header-subtitle">Analysis</div>
        <div class="gophishfree-score-display">
          <div>Risk Score</div>
          <div class="gophishfree-score-value" id="gophishfree-score">-</div>
          <div class="gophishfree-fish-display" id="gophishfree-fish">🐟</div>
          <div id="gophishfree-level">-</div>
        </div>
        <div class="gophishfree-reasons">
          <h3>Risk Indicators</h3>
          <div id="gophishfree-reasons-list"></div>
        </div>
        <div class="gophishfree-links">
          <h3>Suspicious Links</h3>
          <div id="gophishfree-links-list"></div>
        </div>
        <div class="gophishfree-deepscan-section">
          <button class="gophishfree-deepscan-btn" id="gophishfree-deepscan-btn" disabled>
            <span class="gophishfree-deepscan-icon">🔬</span>
            <span class="gophishfree-deepscan-label">Deep Scan Links</span>
          </button>
          <div class="gophishfree-deepscan-info">
            Fetches linked pages to analyze forms, resources &amp; structure.
            Only domain content is downloaded — no scripts are executed.
          </div>
          <div class="gophishfree-deepscan-progress" id="gophishfree-deepscan-progress" style="display:none;">
            <div class="gophishfree-deepscan-spinner"></div>
            <span id="gophishfree-deepscan-status">Scanning...</span>
          </div>
          <div class="gophishfree-deepscan-result" id="gophishfree-deepscan-result" style="display:none;"></div>
        </div>
        <div class="gophishfree-report-section">
          <button class="gophishfree-report-btn" id="gophishfree-report-btn" disabled>
            <span class="gophishfree-report-icon">🚩</span>
            <span class="gophishfree-report-label">Report Phish</span>
          </button>
          <div class="gophishfree-report-info">
            Manually flag this email as phishing and add it to your collection.
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(sidepanel);
    
    // Close button handler
    document.getElementById('gophishfree-close').addEventListener('click', closeSidePanel);

    // Deep Scan button handler
    document.getElementById('gophishfree-deepscan-btn').addEventListener('click', triggerDeepScan);

    // Report Phish button handler
    document.getElementById('gophishfree-report-btn').addEventListener('click', async () => {
      const severity = await showReportDialog();
      if (severity) handleReport(severity);
    });

    overlay.addEventListener('click', closeSidePanel);
  }
  
  /**
   * Show "Fish Caught" animation
   */
  function showFishCaughtAnimation(fishData, riskScore) {
    // Create splash overlay
    const splash = document.createElement('div');
    splash.className = 'gophishfree-splash-overlay';
    document.body.appendChild(splash);
    
    // Determine score class
    let scoreClass = 'low';
    if (riskScore >= 90) scoreClass = 'dangerous';
    else if (riskScore >= 76) scoreClass = 'high';
    else if (riskScore >= 50) scoreClass = 'medium';
    
    // Create fish caught popup
    const popup = document.createElement('div');
    popup.className = 'gophishfree-fish-caught';
    popup.innerHTML = `
      <span class="gophishfree-fish-caught-icon">${fishData.emoji}</span>
      <div class="gophishfree-fish-caught-title">${fishData.name} Caught!</div>
      <div class="gophishfree-fish-caught-subtitle">${fishData.description}</div>
      <div class="gophishfree-fish-caught-score ${scoreClass}">Risk Score: ${riskScore}</div>
    `;
    document.body.appendChild(popup);
    
    // Remove after animation
    setTimeout(() => {
      popup.style.animation = 'fishCaughtPopup 0.3s ease-in reverse forwards';
      splash.style.opacity = '0';
      setTimeout(() => {
        popup.remove();
        splash.remove();
      }, 300);
    }, 2500);
  }
  
  /**
   * Observe Gmail DOM for email opens
   */
  function observeGmailChanges() {
    // Check URL for email view
    checkEmailView();
    
    // Monitor URL changes (Gmail uses pushState)
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(checkEmailView, 500);
      }
    }, 1000);
    
    // Also observe DOM mutations
    const observer = new MutationObserver(() => {
      checkEmailView();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * Check if we're viewing an email and scan it
   */
  function checkEmailView() {
    // Check if we're in an email view (Gmail URL pattern)
    const urlMatch = window.location.href.match(/\/mail\/u\/\d+\/#inbox\/([a-zA-Z0-9]+)/);
    const emailId = urlMatch ? urlMatch[1] : null;
    
    // Also try to get email ID from DOM
    const emailElement = document.querySelector('[data-message-id]') || 
                        document.querySelector('[data-legacy-thread-id]');
    const domEmailId = emailElement ? 
      (emailElement.getAttribute('data-message-id') || 
       emailElement.getAttribute('data-legacy-thread-id')) : null;
    
    const activeEmailId = emailId || domEmailId;
    
    if (activeEmailId && activeEmailId !== currentEmailId && !scanInProgress) {
      currentEmailId = activeEmailId;
      setTimeout(() => scanEmail(activeEmailId), 1000); // Wait for email to load
    }
  }
  
  /**
   * Scan currently open email
   */
  async function scanEmail(emailId) {
    if (scanInProgress) return;
    scanInProgress = true;

    // Show loading badge immediately so the user knows a scan is running
    showLoadingBadge();
    
    try {
      // Extract email data from Gmail DOM
      const emailData = extractEmailData();
      
      if (!emailData || !emailData.senderDomain) {
        console.log('GoPhishFree: Could not extract email data');
        removeLoadingBadge();
        scanInProgress = false;
        return;
      }
      
      // Extract features
      const features = extractor.extractEmailFeatures(emailData);

      // ── Tier 2: DNS checks (if enabled) ──
      let dnsFeatures = null;
      if (enhancedScanning && dnsChecker) {
        try {
          // Collect unique domains: sender + all link targets
          const domains = [];
          if (emailData.senderDomain) domains.push(emailData.senderDomain);
          (emailData.links || []).forEach(link => {
            try {
              const hostname = new URL(link.href || link.url).hostname;
              if (hostname) domains.push(hostname);
            } catch (_) { /* skip bad URLs */ }
          });
          dnsFeatures = await dnsChecker.checkDomains(domains);
        } catch (err) {
          console.warn('GoPhishFree: DNS check failed, continuing without', err);
        }
      }

      // Run ML inference (with optional DNS features)
      const prediction = await runInference(features, dnsFeatures);

      // Cache for potential deep scan rescore
      lastEmailData   = emailData;
      lastFeatures    = features;
      lastDnsFeatures = dnsFeatures;
      lastPrediction  = prediction;

      // Get fish data for this risk score
      const fishData = getFishData(prediction.riskScore);
      lastFishData = fishData;

      // Enable the Deep Scan and Report buttons (now that we have an email scanned)
      const dsBtn = document.getElementById('gophishfree-deepscan-btn');
      if (dsBtn) { dsBtn.disabled = false; }
      const rpBtn = document.getElementById('gophishfree-report-btn');
      if (rpBtn) { rpBtn.disabled = false; rpBtn.innerHTML = '<span class="gophishfree-report-icon">🚩</span><span class="gophishfree-report-label">Report Phish</span>'; }
      // Reset deep scan result from previous email
      const dsResult = document.getElementById('gophishfree-deepscan-result');
      if (dsResult) { dsResult.style.display = 'none'; }
      
      // Display results
      displayResults(prediction, emailData, emailId, fishData);
      
      // Save to storage
      chrome.runtime.sendMessage({
        action: 'saveScanResult',
        messageId: emailId,
        data: {
          senderDomain: emailData.senderDomain,
          senderDisplayName: emailData.senderDisplayName,
          riskScore: prediction.riskScore,
          riskLevel: prediction.riskLevel,
          reasons: prediction.reasons,
          linkCount: emailData.links.length,
          fishType: fishData.type,
          timestamp: Date.now()
        }
      }, (response) => {
        if (response && response.fishCollection) {
          console.log('GoPhishFree: Fish collection updated', response.fishCollection);
        }
      });
      
    } catch (error) {
      console.error('GoPhishFree: Error scanning email', error);
      removeLoadingBadge();
    } finally {
      scanInProgress = false;
    }
  }
  
  /**
   * Extract email data from Gmail DOM
   */
  function extractEmailData() {
    try {
      // Extract sender information
      const senderElement = document.querySelector('[email]') || 
                           document.querySelector('.go') ||
                           document.querySelector('span[email]');
      
      let senderEmail = '';
      let senderDisplayName = '';
      
      if (senderElement) {
        senderEmail = senderElement.getAttribute('email') || 
                     senderElement.textContent.trim();
        senderDisplayName = senderElement.textContent.trim();
      }
      
      // Try alternative selectors
      const headerElements = document.querySelectorAll('h2, h3');
      for (const elem of headerElements) {
        const text = elem.textContent;
        if (text.includes('@')) {
          senderEmail = text.match(/[\w\.-]+@[\w\.-]+\.\w+/)?.[0] || senderEmail;
          senderDisplayName = text.split('<')[0].trim() || senderDisplayName;
          break;
        }
      }
      
      // Extract domain
      const senderDomain = senderEmail.includes('@') 
        ? senderEmail.split('@')[1] 
        : null;
      
      // Extract links
      const links = [];
      const linkElements = document.querySelectorAll('a[href]');
      linkElements.forEach(link => {
        const href = link.getAttribute('href');
        const anchorText = link.textContent.trim();
        
        // Skip Gmail internal links
        if (href && !href.startsWith('#') && !href.includes('mail.google.com')) {
          links.push({
            href: href,
            anchorText: anchorText,
            url: href
          });
        }
      });
      
      // Extract text content
      const messageBody = document.querySelector('[role="main"]') || 
                         document.querySelector('.ii.gt') ||
                         document.body;
      const text = messageBody ? messageBody.textContent : '';
      
      // Extract attachments (if visible)
      const attachments = [];
      const attachmentElements = document.querySelectorAll('[data-attachment-id]');
      attachmentElements.forEach(att => {
        const filename = att.getAttribute('data-attachment-name') || 
                        att.textContent.trim();
        if (filename) {
          attachments.push({ filename });
        }
      });
      
      return {
        senderEmail,
        senderDisplayName: senderDisplayName || senderEmail,
        senderDomain,
        links,
        text,
        attachments
      };
    } catch (error) {
      console.error('GoPhishFree: Error extracting email data', error);
      return null;
    }
  }
  
  // ───────────────────── Settings ─────────────────────────────

  /**
   * Load user settings from chrome.storage (Tier 2 toggle, etc.)
   */
  async function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(['enhancedScanning'], data => {
        // Default to true (enabled) if never set
        enhancedScanning = data.enhancedScanning !== false;
        console.log(`GoPhishFree: Enhanced scanning (DNS) ${enhancedScanning ? 'enabled' : 'disabled'}`);
        resolve();
      });
    });
  }

  // Listen for setting changes from the popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enhancedScanning) {
      enhancedScanning = changes.enhancedScanning.newValue !== false;
      console.log(`GoPhishFree: Enhanced scanning toggled ${enhancedScanning ? 'ON' : 'OFF'}`);
    }
  });

  // ───────────────────── ML Model Loading ─────────────────────

  /**
   * Fetch and parse model/model_trees.json from the extension bundle
   */
  async function loadModel() {
    try {
      const url = chrome.runtime.getURL('model/model_trees.json');
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      modelData = await resp.json();

      // Validate minimum required fields
      if (modelData.trees && modelData.scaler_mean && modelData.scaler_scale) {
        modelReady = true;
        console.log(
          `GoPhishFree: ML model loaded – ${modelData.n_estimators} trees, ` +
          `${modelData.n_features} features`
        );
      } else {
        console.warn('GoPhishFree: model_trees.json missing tree structures, falling back to rules');
      }
    } catch (err) {
      console.warn('GoPhishFree: Could not load ML model, using rule-based fallback', err);
    }
  }

  /**
   * Lazily load the expanded 38-feature deep scan model.
   * Called only when the user triggers a deep scan.
   */
  async function loadDeepScanModel() {
    if (deepScanModelReady) return true;
    try {
      const url = chrome.runtime.getURL('model/model_deepscan.json');
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      deepScanModelData = await resp.json();

      if (deepScanModelData.trees && deepScanModelData.scaler_mean) {
        deepScanModelReady = true;
        console.log(
          `GoPhishFree: Deep Scan model loaded – ${deepScanModelData.n_estimators} trees, ` +
          `${deepScanModelData.n_features} features`
        );
        return true;
      }
    } catch (err) {
      console.warn('GoPhishFree: Could not load deep scan model', err);
    }
    return false;
  }

  // ───────────────────── Inference Pipeline ──────────────────

  /**
   * Run three-stage inference:
   *   Stage 1 – ML model (25 dataset features)
   *   Stage 2 – Custom-feature rule adjustment (10 features)
   *   Stage 3 – DNS-based adjustment (Tier 2, optional)
   */
  async function runInference(features, dnsFeatures) {
    const modelInput  = extractor.mapToModelInput(features);   // 25-element array
    const customFeats = extractor.getCustomFeatures(features);  // 10 custom features

    let mlProbability = 0.5;  // default if model unavailable

    // ── Stage 1: ML prediction ──
    if (modelReady) {
      mlProbability = predictWithForest(modelInput);
    }

    // ── Stage 2: Custom-feature adjustment ──
    const { adjustment, reasons } = computeCustomAdjustment(customFeats, features);

    // ── Stage 3: DNS-based adjustment (Tier 2) ──
    let dnsAdjustment = 0;
    if (dnsFeatures) {
      const dnsResult = computeDnsAdjustment(dnsFeatures);
      dnsAdjustment = dnsResult.adjustment;
      reasons.push(...dnsResult.reasons);
    }

    // Combine: ML base (0-80) + custom tiered adjustment (up to ~44) + DNS (up to ~30) + combo bonus
    const mlScore = mlProbability * 80;
    let riskScore = Math.round(Math.min(100, Math.max(0, mlScore + adjustment + dnsAdjustment)));

    // Add ML-derived reasons when probability is high
    if (mlProbability >= 0.6) {
      reasons.unshift('ML model detected phishing patterns in link structure');
    }

    // Determine risk level
    let riskLevel = 'Low';
    if (riskScore >= 90) riskLevel = 'Dangerous';
    else if (riskScore >= 76) riskLevel = 'High';
    else if (riskScore >= 50) riskLevel = 'Medium';

    return {
      riskScore,
      riskLevel,
      mlProbability: +mlProbability.toFixed(3),
      dnsChecked: !!dnsFeatures,
      reasons: reasons.slice(0, 6)
    };
  }

  // ───────────── Random Forest Traversal (Stage 1) ──────────

  /**
   * Scale features then traverse every decision tree; return phishing
   * probability using SOFT VOTING — averages each tree's leaf probability
   * so a tree that's 90% confident contributes more than one at 51%.
   */
  function predictWithForest(rawFeatures) {
    const { scaler_mean, scaler_scale, trees } = modelData;

    // Z-score normalisation
    const scaled = rawFeatures.map((v, i) => (v - scaler_mean[i]) / scaler_scale[i]);

    let phishingProbSum = 0;

    for (const tree of trees) {
      let node = 0; // start at root
      while (tree.children_left[node] !== -1) {   // -1 = leaf sentinel
        const featureIdx = tree.feature[node];
        if (scaled[featureIdx] <= tree.threshold[node]) {
          node = tree.children_left[node];
        } else {
          node = tree.children_right[node];
        }
      }
      // value[node] = [n_legitimate, n_phishing]
      const counts = tree.value[node];
      const total  = counts[0] + counts[1];
      // Soft vote: use actual probability, not binary threshold
      phishingProbSum += total > 0 ? counts[1] / total : 0;
    }

    return phishingProbSum / trees.length;
  }

  // ──────── Custom-Feature Rule Adjustment (Stage 2) ────────
  //
  // Features are scored in three tiers based on how strongly they
  // indicate phishing on their own:
  //
  //   Tier S ("Smoking Gun")  – almost never seen in legitimate email
  //   Tier A ("Strong")       – suspicious, occasionally legitimate
  //   Tier B ("Soft Signal")  – common in both phishing AND real email
  //
  // A combination bonus rewards co-occurring strong signals, which
  // catches both obvious phish (many signals) and well-crafted phish
  // (fewer but devastating signals stacking).

  /**
   * Compute an additive risk adjustment (±points) and human-readable
   * reasons from the 10 custom-engineered features.
   */
  function computeCustomAdjustment(custom, allFeatures) {
    let adjustment = 0;
    const reasons = [];
    let strongSignalCount = 0; // for combination bonus

    // ── Tier S: "Smoking Gun" signals ──────────────────────────

    // Punycode (homograph attack) — almost never legitimate
    if (custom.Punycode > 0.5) {
      adjustment += 15;
      strongSignalCount++;
      reasons.push('Links contain punycode (possible homograph attack)');
    }

    // Link text ≠ destination for >30% of links — classic deception
    if (custom.LinkMismatchRatio > 0.3) {
      adjustment += 14;
      strongSignalCount++;
      reasons.push('Link text does not match destination domains');
    }

    // ── Tier A: "Strong Indicator" signals ─────────────────────

    // Header mismatch — sender name claims to be someone else
    if (custom.HeaderMismatch > 0.5) {
      adjustment += 10;
      strongSignalCount++;
      reasons.push('Sender display name does not match email domain');
    }

    // Credential / account verification requests
    if (custom.CredentialRequestScore > 0) {
      adjustment += Math.min(custom.CredentialRequestScore * 5, 15);
      strongSignalCount++;
      reasons.push('Email requests credentials or account verification');
    }

    // URL shorteners hiding the real destination
    if (custom.ShortenerDomain > 0.5) {
      adjustment += 8;
      reasons.push('Links use URL shorteners');
    }

    // ── Tier B: "Soft Signal" signals ──────────────────────────

    // Suspicious TLD — many legit sites use .xyz, .io, etc.
    if (custom.SuspiciousTLD > 0.5) {
      adjustment += 5;
      reasons.push('Links use suspicious top-level domains');
    }

    // Minor link mismatch (below 30% threshold)
    if (custom.LinkMismatchRatio <= 0.3 && custom.LinkMismatchCount > 0) {
      adjustment += 3;
      reasons.push('Some link text does not match destination');
    }

    // Urgency language — extremely common in marketing, discount heavily
    if (custom.UrgencyScore > 0) {
      adjustment += Math.min(custom.UrgencyScore * 2, 6);
      reasons.push('Email contains urgency language');
    }

    // Slight negative for emails with zero links (plain newsletters, etc.)
    if (custom.LinkCount === 0) {
      adjustment -= 3;
    }

    // ── Combination Bonus ──────────────────────────────────────
    // Multiple strong signals co-occurring is far more damning than
    // the sum of individual scores — this catches both "obviously bad"
    // emails (many signals firing) and "well-crafted" attacks (few
    // but devastating signals).

    if (strongSignalCount >= 3) {
      adjustment += 15;
      reasons.push('Multiple strong phishing indicators detected simultaneously');
    } else if (strongSignalCount >= 2) {
      adjustment += 8;
      reasons.push('Multiple phishing indicators detected');
    }

    return { adjustment, reasons };
  }

  // ──────── DNS-Based Adjustment (Tier 2 / Stage 3) ─────────
  //
  // DNS signals follow the same tier philosophy:
  //   Tier S: Domain doesn't resolve — dead domains are classic phishing
  //   Tier A: Random-string domain, multiple unresolved domains
  //   Tier B: No MX record — unusual but not conclusive
  //   Safety: Load-balanced IPs suggest legitimate infrastructure

  /**
   * Compute additive risk adjustment from Tier 2 DNS features.
   */
  function computeDnsAdjustment(dns) {
    let adjustment = 0;
    const reasons = [];

    // Tier S: Domain doesn't resolve at all → very strong phishing signal
    if (dns.DomainExists === 0) {
      adjustment += 15;
      reasons.push('Link domain does not resolve (DNS lookup failed)');
    }

    // Tier A: Random-looking domain name (high entropy) — strong signal
    if (dns.RandomStringDomain === 1) {
      adjustment += 10;
      reasons.push('Domain name appears randomly generated');
    }

    // Tier A: Multiple unresolved link domains → compounding suspicion
    if (dns.UnresolvedDomains && dns.UnresolvedDomains > 1) {
      adjustment += 6;
      reasons.push(`${dns.UnresolvedDomains} link domains could not be resolved`);
    }

    // Tier B: Sender domain has no MX record → unusual but not conclusive
    if (dns.HasMXRecord === 0 && dns.DomainExists === 1) {
      adjustment += 5;
      reasons.push('Sender domain has no mail server (MX) record');
    }

    // Safety signal: domain resolves AND has multiple IPs
    // (load-balanced infrastructure is typical of legitimate services)
    if (dns.MultipleIPs === 1 && dns.DomainExists === 1) {
      adjustment -= 3;
    }

    return { adjustment, reasons };
  }

  // ──────── Tier 3: Deep Scan Pipeline ──────────────────────

  /**
   * User clicked "Deep Scan" — request permissions, fetch pages,
   * extract features, rescore with expanded 38-feature model.
   */
  async function triggerDeepScan() {
    if (!lastEmailData || !lastFeatures) return;

    // ── Security: Explicit user consent with clear warning ──
    const ok = confirm(
      'Deep Scan will download the HTML of linked pages to analyze their ' +
      'structure (forms, resources, iframes).\n\n' +
      'Safety measures:\n' +
      '• Only the HTML text is downloaded — no scripts are executed\n' +
      '• No cookies or login sessions are sent\n' +
      '• All analysis happens locally in your browser\n' +
      '• Downloaded content is immediately discarded after analysis\n\n' +
      'Continue?'
    );
    if (!ok) return;

    const btn      = document.getElementById('gophishfree-deepscan-btn');
    const progress = document.getElementById('gophishfree-deepscan-progress');
    const status   = document.getElementById('gophishfree-deepscan-status');
    const result   = document.getElementById('gophishfree-deepscan-result');

    // Disable button, show progress, update badge to deep-scanning state
    btn.disabled = true;
    btn.classList.add('scanning');
    progress.style.display = 'flex';
    result.style.display   = 'none';
    status.textContent     = 'Requesting permission...';
    showDeepScanLoadingBadge();

    try {
      // 1. Request optional host permission (routed through background —
      //    chrome.permissions is not available in content scripts).
      //    Origins are hardcoded in background.js — we don't send them here.
      const granted = await new Promise(resolve => {
        chrome.runtime.sendMessage(
          { action: 'requestPermissions' },
          resp => resolve(resp && resp.granted)
        );
      });
      if (!granted) {
        status.textContent =
          'Permission required. If no prompt appeared, try clicking the ' +
          'GoPhishFree icon in the toolbar and re-opening the email.';
        btn.disabled = false;
        btn.classList.remove('scanning');
        restorePreviousBadge();
        return;
      }

      // 2. Load the deep scan model (lazy)
      status.textContent = 'Loading deep scan model...';
      const modelOk = await loadDeepScanModel();
      if (!modelOk) {
        status.textContent = 'Deep scan model unavailable.';
        btn.disabled = false;
        btn.classList.remove('scanning');
        restorePreviousBadge();
        return;
      }

      // 3. Collect unique link URLs (security-validated)
      const linkUrls = [];
      (lastEmailData.links || []).forEach(link => {
        const href = link.href || link.url;
        if (!href) return;
        try {
          const parsed = new URL(href);
          // Only allow http/https — block javascript:, data:, file:, etc.
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            linkUrls.push(parsed.href); // use normalised URL
          }
        } catch (_) { /* skip malformed URLs */ }
      });
      const uniqueUrls = [...new Set(linkUrls)].slice(0, 10); // cap at 10

      if (uniqueUrls.length === 0) {
        status.textContent = 'No scannable links found.';
        btn.disabled = false;
        btn.classList.remove('scanning');
        restorePreviousBadge();
        return;
      }

      // 4. Fetch each page via the background service worker
      status.textContent = `Scanning 0/${uniqueUrls.length} pages...`;
      const pageFeaturesList = [];

      for (let i = 0; i < uniqueUrls.length; i++) {
        status.textContent = `Scanning ${i + 1}/${uniqueUrls.length} pages...`;

        const html = await new Promise(resolve => {
          chrome.runtime.sendMessage(
            { action: 'fetchPageHTML', url: uniqueUrls[i] },
            resp => resolve(resp && resp.success ? resp.html : null)
          );
        });

        if (html && pageAnalyzer) {
          try {
            // ── Security: cap HTML size before parsing (2 MB) ──
            const safeHtml = html.length > 2_000_000 ? html.slice(0, 2_000_000) : html;
            const parser = new DOMParser();
            const doc = parser.parseFromString(safeHtml, 'text/html');

            // ── Security: abort if DOM is abnormally large ──
            if (doc.querySelectorAll('*').length > 50_000) {
              console.warn('GoPhishFree: Skipping oversized DOM for', uniqueUrls[i]);
            } else {
              const feats = pageAnalyzer.extractFeatures(doc, uniqueUrls[i]);
              pageFeaturesList.push(feats);
            }
          } catch (_) { /* skip unparseable pages */ }
        }
      }

      // 5. Aggregate page features (worst-case / max across pages)
      const aggregatedPage = aggregatePageFeatures(pageFeaturesList);

      // 6. Rescore with expanded model
      status.textContent = 'Rescoring with expanded model...';
      const newPrediction = deepScanRescore(lastFeatures, aggregatedPage, lastDnsFeatures);

      // 7. Display updated score
      progress.style.display = 'none';
      showDeepScanResult(newPrediction, aggregatedPage);

    } catch (err) {
      console.error('GoPhishFree: Deep scan failed', err);
      status.textContent = 'Deep scan failed: ' + err.message;
      restorePreviousBadge();
    } finally {
      btn.classList.remove('scanning');
      btn.disabled = false;
    }
  }

  /**
   * Aggregate page features across multiple fetched pages.
   * Uses max for binary flags and max for percentages (worst-case).
   */
  function aggregatePageFeatures(featsList) {
    if (!featsList || featsList.length === 0) {
      return pageAnalyzer ? pageAnalyzer.defaultFeatures() : {};
    }
    const agg = { ...featsList[0] };
    for (let i = 1; i < featsList.length; i++) {
      for (const key of Object.keys(agg)) {
        agg[key] = Math.max(agg[key], featsList[i][key] || 0);
      }
    }
    return agg;
  }

  /**
   * Build the 38-element feature vector and run the deep scan model.
   * Returns a prediction object (same shape as runInference).
   */
  function deepScanRescore(features, pageFeatures, dnsFeatures) {
    // 25 base features (same order as LOCAL_FEATURES)
    const base = extractor.mapToModelInput(features);
    // 13 deep scan features (same order as DEEPSCAN_FEATURES in train_model.py)
    const deep = [
      pageFeatures.InsecureForms       || 0,
      pageFeatures.RelativeFormAction   || 0,
      pageFeatures.ExtFormAction        || 0,
      pageFeatures.AbnormalFormAction    || 0,
      pageFeatures.SubmitInfoToEmail     || 0,
      pageFeatures.PctExtHyperlinks              || 0,
      pageFeatures.PctExtResourceUrls            || 0,
      pageFeatures.ExtFavicon                    || 0,
      pageFeatures.PctNullSelfRedirectHyperlinks || 0,
      pageFeatures.IframeOrFrame        || 0,
      pageFeatures.MissingTitle         || 0,
      pageFeatures.ImagesOnlyInForm     || 0,
      pageFeatures.EmbeddedBrandName    || 0
    ];

    const fullInput = [...base, ...deep]; // 38 elements

    // Run the expanded model
    let mlProbability = 0.5;
    if (deepScanModelReady) {
      mlProbability = predictWithForestModel(deepScanModelData, fullInput);
    }

    // Custom + DNS adjustments (same as Tier 1/2)
    const customFeats = extractor.getCustomFeatures(features);
    const { adjustment: custAdj, reasons } = computeCustomAdjustment(customFeats, features);
    let dnsAdj = 0;
    if (dnsFeatures) {
      const dr = computeDnsAdjustment(dnsFeatures);
      dnsAdj = dr.adjustment;
      reasons.push(...dr.reasons);
    }

    const mlScore = mlProbability * 80;
    let riskScore = Math.round(Math.min(100, Math.max(0, mlScore + custAdj + dnsAdj)));

    if (mlProbability >= 0.6) {
      reasons.unshift('Deep Scan model detected phishing patterns');
    }

    let riskLevel = 'Low';
    if (riskScore >= 90) riskLevel = 'Dangerous';
    else if (riskScore >= 76) riskLevel = 'High';
    else if (riskScore >= 50) riskLevel = 'Medium';

    return {
      riskScore,
      riskLevel,
      mlProbability: +mlProbability.toFixed(3),
      deepScanned: true,
      reasons: reasons.slice(0, 6)
    };
  }

  /**
   * Generic tree traversal for any loaded model (used by both Tier 1 and Deep Scan).
   */
  function predictWithForestModel(model, rawFeatures) {
    const { scaler_mean, scaler_scale, trees } = model;
    const scaled = rawFeatures.map((v, i) => (v - scaler_mean[i]) / scaler_scale[i]);

    let phishingProbSum = 0;
    for (const tree of trees) {
      let node = 0;
      while (tree.children_left[node] !== -1) {
        const fi = tree.feature[node];
        if (scaled[fi] <= tree.threshold[node]) {
          node = tree.children_left[node];
        } else {
          node = tree.children_right[node];
        }
      }
      const counts = tree.value[node];
      const total = counts[0] + counts[1];
      // Soft vote: use actual probability, not binary threshold
      phishingProbSum += total > 0 ? counts[1] / total : 0;
    }
    return phishingProbSum / trees.length;
  }

  /**
   * Show the deep scan result: update the score display and show a summary.
   */
  function showDeepScanResult(prediction, pageFeatures) {
    const resultEl = document.getElementById('gophishfree-deepscan-result');
    const scoreEl  = document.getElementById('gophishfree-score');
    const levelEl  = document.getElementById('gophishfree-level');
    const fishEl   = document.getElementById('gophishfree-fish');
    const reasonsEl = document.getElementById('gophishfree-reasons-list');

    const fishData = getFishData(prediction.riskScore);

    // Update the header badge with the new deep-scanned score
    updateRiskBadge(prediction.riskLevel, prediction.riskScore, fishData);

    // Cache the new prediction so future restores use the deep scan result
    lastPrediction = prediction;
    lastFishData = fishData;

    // Animate score change
    scoreEl.classList.add('gophishfree-score-updating');
    setTimeout(() => {
      scoreEl.textContent = prediction.riskScore;
      scoreEl.className = `gophishfree-score-value ${prediction.riskLevel.toLowerCase()}`;
      levelEl.textContent = `${prediction.riskLevel} Risk - ${fishData.name}`;
      fishEl.textContent = fishData.emoji;
      scoreEl.classList.remove('gophishfree-score-updating');
    }, 300);

    // Update reasons
    reasonsEl.innerHTML = '';
    prediction.reasons.forEach(reason => {
      const item = document.createElement('div');
      item.className = 'gophishfree-reason-item';
      item.textContent = reason;
      reasonsEl.appendChild(item);
    });

    // Show deep scan summary
    const findings = [];
    if (pageFeatures.InsecureForms)    findings.push('Insecure forms detected');
    if (pageFeatures.ExtFormAction)    findings.push('External form actions');
    if (pageFeatures.IframeOrFrame)    findings.push('Hidden iframes found');
    if (pageFeatures.MissingTitle)     findings.push('Page has no title');
    if (pageFeatures.EmbeddedBrandName) findings.push('Brand impersonation detected');
    if (pageFeatures.PctExtHyperlinks > 0.5) findings.push('Mostly external links');
    if (pageFeatures.SubmitInfoToEmail) findings.push('Form submits to email');

    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="gophishfree-deepscan-badge">Deep Scan Complete</div>
      <div class="gophishfree-deepscan-findings">
        ${findings.length > 0
          ? findings.map(f => `<div class="gophishfree-deepscan-finding">• ${f}</div>`).join('')
          : '<div class="gophishfree-deepscan-finding safe">No additional threats found in page structure.</div>'
        }
      </div>
    `;
  }
  
  // ──────── User Report Pipeline ─────────────────────────────

  /** Severity → fish mapping for user-reported phishing */
  const REPORT_SEVERITY = {
    low:       { riskScore: 25,  riskLevel: 'Low',       fishType: 'friendly'   },
    medium:    { riskScore: 63,  riskLevel: 'Medium',    fishType: 'suspicious' },
    high:      { riskScore: 82,  riskLevel: 'High',      fishType: 'phishy'     },
    dangerous: { riskScore: 95,  riskLevel: 'Dangerous', fishType: 'shark'      }
  };

  /**
   * Show a severity-selection modal when the user clicks "Report Phish".
   * Returns a Promise that resolves with the chosen severity key or null.
   */
  function showReportDialog() {
    return new Promise(resolve => {
      // Overlay
      const overlay = document.createElement('div');
      overlay.className = 'gophishfree-report-overlay';

      // Card
      const card = document.createElement('div');
      card.className = 'gophishfree-report-card';
      card.innerHTML = `
        <div class="gophishfree-report-card-title">Report Phishing Email</div>
        <div class="gophishfree-report-card-subtitle">How dangerous do you think this email is?</div>
        <div class="gophishfree-report-options">
          <button class="gophishfree-report-option low" data-severity="low">
            <span class="gophishfree-report-option-fish">🐟</span>
            <span class="gophishfree-report-option-label">Low Risk</span>
            <span class="gophishfree-report-option-desc">Friendly Fish</span>
          </button>
          <button class="gophishfree-report-option medium" data-severity="medium">
            <span class="gophishfree-report-option-fish">🐠</span>
            <span class="gophishfree-report-option-label">Medium Risk</span>
            <span class="gophishfree-report-option-desc">Suspicious Fish</span>
          </button>
          <button class="gophishfree-report-option high" data-severity="high">
            <span class="gophishfree-report-option-fish">🐡</span>
            <span class="gophishfree-report-option-label">High Risk</span>
            <span class="gophishfree-report-option-desc">Phishy Pufferfish</span>
          </button>
          <button class="gophishfree-report-option dangerous" data-severity="dangerous">
            <span class="gophishfree-report-option-fish">🦈</span>
            <span class="gophishfree-report-option-label">Dangerous</span>
            <span class="gophishfree-report-option-desc">Mega Phish Shark</span>
          </button>
        </div>
        <button class="gophishfree-report-cancel">Cancel</button>
      `;

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      // Force reflow then show (for CSS transition)
      requestAnimationFrame(() => overlay.classList.add('show'));

      function cleanup(severity) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 250);
        resolve(severity);
      }

      // Option buttons
      card.querySelectorAll('.gophishfree-report-option').forEach(btn => {
        btn.addEventListener('click', () => cleanup(btn.dataset.severity));
      });

      // Cancel
      card.querySelector('.gophishfree-report-cancel').addEventListener('click', () => cleanup(null));
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(null); });
    });
  }

  /**
   * Handle the user's phishing report after they pick a severity.
   */
  async function handleReport(severity) {
    const mapping = REPORT_SEVERITY[severity];
    if (!mapping || !lastEmailData) return;

    const { riskScore, riskLevel, fishType } = mapping;
    const fishData = { ...FISH_TYPES[fishType], type: fishType };

    // Update header badge
    updateRiskBadge(riskLevel, riskScore, fishData);

    // Update side panel display
    const scoreEl  = document.getElementById('gophishfree-score');
    const levelEl  = document.getElementById('gophishfree-level');
    const fishEl   = document.getElementById('gophishfree-fish');

    scoreEl.textContent = riskScore;
    scoreEl.className = `gophishfree-score-value ${riskLevel.toLowerCase()}`;
    levelEl.textContent = `${riskLevel} Risk - ${fishData.name} (Reported)`;
    fishEl.textContent = fishData.emoji;

    // Add "User reported" to reasons
    const reasonsEl = document.getElementById('gophishfree-reasons-list');
    const reportItem = document.createElement('div');
    reportItem.className = 'gophishfree-reason-item';
    reportItem.textContent = `🚩 User reported as ${riskLevel} risk`;
    reasonsEl.insertBefore(reportItem, reasonsEl.firstChild);

    // Cache new state
    lastPrediction = {
      riskScore,
      riskLevel,
      mlProbability: lastPrediction ? lastPrediction.mlProbability : 0,
      reported: true,
      reasons: [`User reported as ${riskLevel} risk`, ...(lastPrediction ? lastPrediction.reasons : [])]
    };
    lastFishData = fishData;

    // Save to storage
    chrome.runtime.sendMessage({
      action: 'saveScanResult',
      messageId: currentEmailId || `report_${Date.now()}`,
      data: {
        senderDomain: lastEmailData.senderDomain,
        senderDisplayName: lastEmailData.senderDisplayName,
        riskScore,
        riskLevel,
        reasons: lastPrediction.reasons,
        linkCount: (lastEmailData.links || []).length,
        fishType,
        reported: true,
        timestamp: Date.now()
      }
    }, (response) => {
      if (response && response.fishCollection) {
        console.log('GoPhishFree: Report saved, fish collection updated', response.fishCollection);
      }
    });

    // Show fish caught animation
    showFishCaughtAnimation(fishData, riskScore);

    // Disable report button to prevent double-reporting
    const reportBtn = document.getElementById('gophishfree-report-btn');
    if (reportBtn) {
      reportBtn.disabled = true;
      reportBtn.textContent = '✓ Reported';
    }
  }

  // ───────────────────── UI Display ────────────────────────────

  /**
   * Display scan results: update badge, side panel score, reasons,
   * and suspicious link list.
   */
  function displayResults(prediction, emailData, emailId, fishData) {
    // Update fish badge
    updateRiskBadge(prediction.riskLevel, prediction.riskScore, fishData);
    
    // Update side panel content
    const scoreEl = document.getElementById('gophishfree-score');
    const levelEl = document.getElementById('gophishfree-level');
    const fishEl = document.getElementById('gophishfree-fish');
    const reasonsEl = document.getElementById('gophishfree-reasons-list');
    const linksEl = document.getElementById('gophishfree-links-list');
    
    scoreEl.textContent = prediction.riskScore;
    scoreEl.className = `gophishfree-score-value ${prediction.riskLevel.toLowerCase()}`;
    levelEl.textContent = `${prediction.riskLevel} Risk - ${fishData.name}`;
    fishEl.textContent = fishData.emoji;
    
    // Display reasons
    reasonsEl.innerHTML = '';
    if (prediction.reasons.length > 0) {
      prediction.reasons.forEach(reason => {
        const item = document.createElement('div');
        item.className = 'gophishfree-reason-item';
        item.textContent = reason;
        reasonsEl.appendChild(item);
      });
    } else {
      reasonsEl.innerHTML = '<div class="gophishfree-reason-item">✅ No significant risk indicators detected</div>';
    }
    
    // Display suspicious links
    linksEl.innerHTML = '';
    const suspiciousLinks = emailData.links.filter(link => {
      const linkFeatures = extractor.extractURLFeatures(link.href);
      return linkFeatures.SuspiciousTLD || linkFeatures.ShortenerDomain || 
             linkFeatures.IpAddress || linkFeatures.NoHttps;
    });
    
    if (suspiciousLinks.length > 0) {
      suspiciousLinks.forEach(link => {
        const item = document.createElement('div');
        item.className = 'gophishfree-link-item suspicious';
        const anchor = document.createElement('a');
        anchor.href = link.href;
        anchor.target = '_blank';
        anchor.className = 'gophishfree-link-url';
        anchor.textContent = link.href.length > 60 ? link.href.substring(0, 60) + '...' : link.href;
        item.appendChild(anchor);
        if (link.anchorText && link.anchorText !== link.href) {
          const text = document.createElement('div');
          text.style.marginTop = '4px';
          text.style.fontSize = '11px';
          text.style.color = 'rgba(255, 255, 255, 0.5)';
          text.textContent = `Display text: ${link.anchorText}`;
          item.appendChild(text);
        }
        linksEl.appendChild(item);
      });
    } else {
      linksEl.innerHTML = '<div class="gophishfree-link-item">✅ No suspicious links detected</div>';
    }
  }
  
  // ───────────────────── Badge Management ──────────────────────

  /**
   * Show a loading/spinner badge while the initial scan is in progress.
   */
  function showLoadingBadge() {
    // Remove any existing badge first
    const existing = document.getElementById('gophishfree-badge');
    if (existing) existing.remove();

    const headerArea = document.querySelector('[role="main"] h2') ||
                      document.querySelector('.hP') ||
                      document.querySelector('h2');
    if (!headerArea) return;

    const badge = document.createElement('div');
    badge.id = 'gophishfree-badge';
    badge.className = 'gophishfree-risk-badge gophishfree-loading-badge';
    badge.innerHTML = `
      <span class="gophishfree-badge-spinner"></span>
      <span>Scanning...</span>
    `;
    badge.title = 'GoPhishFree is analyzing this email';
    headerArea.parentElement.insertBefore(badge, headerArea.nextSibling);
  }

  /**
   * Remove the loading badge (called on scan failure/abort).
   */
  function removeLoadingBadge() {
    const badge = document.getElementById('gophishfree-badge');
    if (badge && badge.classList.contains('gophishfree-loading-badge')) {
      badge.remove();
    }
  }

  /**
   * Show a "Deep Scanning..." loading state on the header badge,
   * preserving the current score while indicating work is happening.
   */
  function showDeepScanLoadingBadge() {
    const existing = document.getElementById('gophishfree-badge');
    if (!existing) return;

    // Keep the current badge style but overlay a scanning indicator
    existing.classList.add('gophishfree-deepscan-loading');
    existing.innerHTML = `
      <span class="gophishfree-badge-spinner"></span>
      <span>Deep Scanning...</span>
    `;
    existing.title = 'Deep scan in progress — analyzing linked pages';
  }

  /**
   * Restore the header badge to its previous (pre-deep-scan) state.
   * Called when deep scan fails or is cancelled.
   */
  function restorePreviousBadge() {
    if (lastPrediction && lastFishData) {
      updateRiskBadge(lastPrediction.riskLevel, lastPrediction.riskScore, lastFishData);
    } else {
      // If no previous data, just remove the loading state
      const badge = document.getElementById('gophishfree-badge');
      if (badge) badge.classList.remove('gophishfree-deepscan-loading');
    }
  }

  function updateRiskBadge(riskLevel, riskScore, fishData) {
    // Remove existing badge (including loading badge)
    const existingBadge = document.getElementById('gophishfree-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    // Find email header area
    const headerArea = document.querySelector('[role="main"] h2') ||
                      document.querySelector('.hP') ||
                      document.querySelector('h2');
    
    if (headerArea) {
      const badge = document.createElement('div');
      badge.id = 'gophishfree-badge';
      
      // Determine badge class
      let badgeClass = riskLevel.toLowerCase();
      if (riskScore >= 90) badgeClass = 'dangerous';
      
      badge.className = `gophishfree-risk-badge ${badgeClass}`;

      badge.innerHTML = `
        <span class="gophishfree-fish-icon">${fishData.emoji}</span>
        <span>${fishData.name} (${riskScore})</span>
      `;
      badge.title = `${fishData.name} - Click for details`;
      badge.addEventListener('click', () => openSidePanel());
      
      // Insert badge
      headerArea.parentElement.insertBefore(badge, headerArea.nextSibling);
    }
  }
  
  /**
   * Open side panel
   */
  function openSidePanel() {
    document.getElementById('gophishfree-sidepanel').classList.add('open');
    document.getElementById('gophishfree-overlay').classList.add('show');
  }
  
  /**
   * Close side panel
   */
  function closeSidePanel() {
    document.getElementById('gophishfree-sidepanel').classList.remove('open');
    document.getElementById('gophishfree-overlay').classList.remove('show');
  }
  
})();
