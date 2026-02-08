// ═══════════════════════════════════════════════════════════════════
// GoPhishFree – Background Service Worker
//
// Handles persistent storage, inter-script messaging, and secure
// content fetching for the GoPhishFree Chrome extension.
//
// Responsibilities:
//   • Manage scan history and fish collection in chrome.storage.local
//   • Proxy permission requests from content scripts (MV3 restriction)
//   • Securely fetch external page HTML for Tier 3 Deep Scan
//   • Provide fish stats and recent catches to the popup
// ═══════════════════════════════════════════════════════════════════

// ───────────────────── Risk Classification ─────────────────────

/**
 * Map a numeric risk score to a fish type key.
 * Thresholds:
 *   90-100  → shark      (Dangerous)
 *   76-89   → phishy     (High Risk)
 *   50-75   → suspicious (Medium Risk)
 *   0-49    → friendly   (Low Risk)
 */
function getFishTypeFromRisk(riskScore) {
  if (riskScore >= 90) return 'shark';
  if (riskScore >= 76) return 'phishy';
  if (riskScore >= 50) return 'suspicious';
  return 'friendly';
}

// ───────────────────── Extension Install ───────────────────────

/**
 * Initialise default storage values when the extension is first
 * installed or updated. This ensures all expected keys exist.
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('GoPhishFree extension installed');
  
  chrome.storage.local.set({
    scanHistory: [],
    flaggedCount: 0,
    totalScanned: 0,
    fishCollection: {
      friendly: 0,
      suspicious: 0,
      phishy: 0,
      shark: 0
    },
    recentCatches: [],
    enhancedScanning: true   // Tier 2 DNS checks enabled by default
  });
});

// ───────────────────── Message Router ──────────────────────────

/**
 * Central message handler. Content script and popup communicate
 * with the background via chrome.runtime.sendMessage().
 *
 * Supported actions:
 *   saveScanResult      – persist a scan and update fish collection
 *   getScanHistory      – return full scan history (legacy)
 *   getFishCollection   – return fish counts for the popup tank
 *   clearHistory        – reset all scan data
 *   requestPermissions  – proxy chrome.permissions.request (Tier 3)
 *   fetchPageHTML       – securely fetch external page HTML (Tier 3)
 *   getFishStats        – return detailed fish statistics
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // ── Save Scan Result ────────────────────────────────────────
  // Persists a new scan, increments fish collection counts,
  // adds a recent-catch record, and updates flagged count.
  if (request.action === 'saveScanResult') {
    chrome.storage.local.get(
      ['scanHistory', 'flaggedCount', 'totalScanned', 'fishCollection', 'recentCatches'],
      (data) => {
        const history        = data.scanHistory    || [];
        const flaggedCount   = data.flaggedCount   || 0;
        const totalScanned   = data.totalScanned   || 0;
        const fishCollection = data.fishCollection || { friendly: 0, suspicious: 0, phishy: 0, shark: 0 };
        const recentCatches  = data.recentCatches  || [];
        
        // Build scan record with timestamp
        const scanResult = {
          ...request.data,
          timestamp: Date.now(),
          messageId: request.messageId || `msg_${Date.now()}`
        };
        
        history.push(scanResult);
        
        // Classify fish and increment collection
        const fishType = getFishTypeFromRisk(scanResult.riskScore);
        fishCollection[fishType] = (fishCollection[fishType] || 0) + 1;
        
        // Track recent catch metadata
        const catchRecord = {
          messageId:         scanResult.messageId,
          senderDomain:      scanResult.senderDomain,
          senderDisplayName: scanResult.senderDisplayName,
          riskScore:         scanResult.riskScore,
          fishType:          fishType,
          timestamp:         scanResult.timestamp
        };
        recentCatches.push(catchRecord);
        
        // Cap recent catches at 100 to prevent unbounded growth
        if (recentCatches.length > 100) {
          recentCatches.shift();
        }
        
        // Only count High Risk (76+) and Dangerous towards flagged total
        const newFlaggedCount = scanResult.riskScore >= 76 
          ? flaggedCount + 1 
          : flaggedCount;
        
        chrome.storage.local.set({
          scanHistory:    history,
          flaggedCount:   newFlaggedCount,
          totalScanned:   totalScanned + 1,
          fishCollection: fishCollection,
          recentCatches:  recentCatches
        }, () => {
          sendResponse({ 
            success: true, 
            flaggedCount:   newFlaggedCount,
            fishType:       fishType,
            fishCollection: fishCollection
          });
        });
      }
    );
    
    return true; // Keep message channel open for async response
  }
  
  // ── Get Scan History (legacy) ───────────────────────────────
  if (request.action === 'getScanHistory') {
    chrome.storage.local.get(['scanHistory', 'flaggedCount', 'totalScanned'], (data) => {
      sendResponse({
        history:      data.scanHistory  || [],
        flaggedCount: data.flaggedCount || 0,
        totalScanned: data.totalScanned || 0
      });
    });
    return true;
  }
  
  // ── Get Fish Collection (for popup fish tank) ───────────────
  if (request.action === 'getFishCollection') {
    chrome.storage.local.get(['fishCollection', 'totalScanned', 'recentCatches'], (data) => {
      sendResponse({
        fishCollection: data.fishCollection || { friendly: 0, suspicious: 0, phishy: 0, shark: 0 },
        totalScanned:   data.totalScanned   || 0,
        recentCatches:  data.recentCatches  || []
      });
    });
    return true;
  }
  
  // ── Clear All History ───────────────────────────────────────
  if (request.action === 'clearHistory') {
    chrome.storage.local.set({
      scanHistory: [],
      flaggedCount: 0,
      totalScanned: 0,
      fishCollection: {
        friendly: 0,
        suspicious: 0,
        phishy: 0,
        shark: 0
      },
      recentCatches: []
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // ── Tier 3: Request Optional Host Permissions ───────────────
  //
  // SECURITY: Content scripts cannot call chrome.permissions.request()
  // in Manifest V3, so we proxy the call here.
  //
  // Protection layers:
  //   1. Sender validation – only our content script on mail.google.com
  //   2. Origins are HARDCODED – we never trust the message payload
  if (request.action === 'requestPermissions') {
    // Guard: reject requests from anything other than our Gmail content script
    if (!sender.tab || !sender.tab.url ||
        !sender.tab.url.startsWith('https://mail.google.com/')) {
      console.warn('GoPhishFree: requestPermissions blocked — unauthorized sender', sender);
      sendResponse({ granted: false, error: 'Unauthorized sender' });
      return true;
    }

    // Hardcoded origins — never derived from request payload
    const ALLOWED_ORIGINS = ['*://*/*'];
    chrome.permissions.request({ origins: ALLOWED_ORIGINS }, (granted) => {
      sendResponse({ granted: !!granted });
    });
    return true;
  }

  // ── Tier 3: Fetch Page HTML for Deep Scan ───────────────────
  //
  // Downloads external page HTML for static DOM analysis.
  // This is the most security-critical handler in the extension.
  //
  // Protection layers:
  //   0. Sender must be our content script on mail.google.com
  //   1. URL scheme whitelist (http/https only)
  //   2. Credentials are NEVER sent (no cookies, no auth headers)
  //   3. Response size capped at 2 MB
  //   4. Content-Type must indicate HTML
  //   5. Strict timeout (8 seconds)
  //   6. Final URL re-validated after redirects
  //   7. Referrer policy set to 'no-referrer'
  if (request.action === 'fetchPageHTML') {
    // Guard 0: Validate sender is our content script on Gmail
    if (!sender.tab || !sender.tab.url ||
        !sender.tab.url.startsWith('https://mail.google.com/')) {
      console.warn('GoPhishFree: fetchPageHTML blocked — unauthorized sender', sender);
      sendResponse({ success: false, error: 'Unauthorized sender' });
      return true;
    }

    const url = request.url;

    // Guard 1: Only allow http/https schemes
    let parsed;
    try { parsed = new URL(url); } catch (_) {
      sendResponse({ success: false, error: 'Invalid URL', url });
      return true;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      sendResponse({ success: false, error: 'Blocked: only http/https allowed', url });
      return true;
    }

    const MAX_BYTES  = 2 * 1024 * 1024; // 2 MB hard cap
    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), 8000); // 8s timeout

    fetch(url, {
      signal:         controller.signal,
      credentials:    'omit',            // Guard 2: NEVER send cookies/auth
      headers:        { 'Accept': 'text/html' },
      redirect:       'follow',
      mode:           'cors',
      referrerPolicy: 'no-referrer'      // Don't leak Gmail origin
    })
      .then(resp => {
        clearTimeout(timer);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        // Guard 3: Content-Type must look like HTML
        const ct = (resp.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('text/html') && !ct.includes('text/plain') && !ct.includes('application/xhtml')) {
          throw new Error('Blocked: response is not HTML (Content-Type: ' + ct + ')');
        }

        // Guard 4: Re-validate final URL after redirects
        if (resp.url) {
          let finalParsed;
          try { finalParsed = new URL(resp.url); } catch (_) {
            throw new Error('Blocked: invalid redirect target');
          }
          if (finalParsed.protocol !== 'http:' && finalParsed.protocol !== 'https:') {
            throw new Error('Blocked: redirect to non-http scheme');
          }
        }

        // Guard 5: Stream-read with size cap
        const reader  = resp.body.getReader();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        let html       = '';
        let totalBytes = 0;

        function readChunk() {
          return reader.read().then(({ done, value }) => {
            if (done) return html;
            totalBytes += value.byteLength;
            if (totalBytes > MAX_BYTES) {
              reader.cancel();
              // Return what we have — enough to analyse structure
              html += decoder.decode(value, { stream: false });
              return html;
            }
            html += decoder.decode(value, { stream: true });
            return readChunk();
          });
        }

        return readChunk();
      })
      .then(html => {
        sendResponse({ success: true, html, url });
      })
      .catch(err => {
        clearTimeout(timer);
        sendResponse({ success: false, error: err.message, url });
      });

    return true; // Async response
  }

  // ── Get Detailed Fish Stats ─────────────────────────────────
  if (request.action === 'getFishStats') {
    chrome.storage.local.get(['fishCollection', 'recentCatches'], (data) => {
      const collection    = data.fishCollection || { friendly: 0, suspicious: 0, phishy: 0, shark: 0 };
      const totalFish     = Object.values(collection).reduce((sum, count) => sum + count, 0);
      const typesCollected = Object.values(collection).filter(count => count > 0).length;
      
      sendResponse({
        fishCollection:  collection,
        totalFish:       totalFish,
        typesCollected:  typesCollected,
        recentCatches:   data.recentCatches || []
      });
    });
    return true;
  }
});
