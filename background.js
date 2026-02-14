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

// ───────────────────── AI Provider Adapters ─────────────────────
//
// Each adapter transforms the features-only payload into the
// provider's API format and returns the parsed JSON response.
// All adapters enforce:
//   - No tools, no browsing, no link visiting
//   - Strict JSON output schema
//   - System prompt injection hardening
//
// Supported: OpenAI, Anthropic, Google Gemini, Azure OpenAI, Custom

const AI_SYSTEM_PROMPT = `You are a phishing email risk analyst. You will receive ONLY extracted signal features from an email — never the email body, subject, or sender address.

RULES (mandatory):
1. You MUST only analyze the provided JSON signals.
2. You MUST NOT use any tools, browse the web, visit links, or perform any actions.
3. You MUST NOT attempt to reconstruct or guess email content.
4. You MUST respond with ONLY a valid JSON object matching the exact schema below. No markdown, no explanation, no preamble.

OUTPUT SCHEMA:
{
  "aiRiskScore": <integer 0-100>,
  "riskTier": "<Safe|Caution|Suspicious|Dangerous>",
  "phishType": ["<URL-Credential|BEC-Linkless|Callback|Attachment|OAuth|Impersonation|Other>"],
  "topSignals": ["<signal1>", "<signal2>", "<signal3>"],
  "confidence": <float 0-1>,
  "notes": "<one short sentence>"
}

SCORING GUIDELINES:
- 0-29 = Safe: No significant phishing indicators
- 30-59 = Caution: Some suspicious signals but unclear
- 60-79 = Suspicious: Multiple phishing indicators present
- 80-100 = Dangerous: Strong phishing pattern detected

Analyze the signals and respond with ONLY the JSON object.`;

/**
 * Build the user message from the features payload.
 */
function buildAiUserMessage(payload) {
  return `Analyze these email signals for phishing risk:\n\n${JSON.stringify(payload, null, 2)}`;
}

/**
 * Provider: OpenAI (GPT-4o-mini or similar)
 */
async function callOpenAI(apiKey, payload, modelName) {
  const model = modelName || 'gpt-4o-mini';
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: buildAiUserMessage(payload) }
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' }
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return JSON.parse(content);
}

/**
 * Provider: Anthropic (Claude)
 */
async function callAnthropic(apiKey, payload, modelName) {
  const model = modelName || 'claude-sonnet-4-20250514';
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 400,
      system: AI_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildAiUserMessage(payload) }
      ],
      temperature: 0.1
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Anthropic API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Empty response from Anthropic');

  // Strip any markdown code fences
  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Provider: Google Gemini
 */
async function callGoogle(apiKey, payload, modelName) {
  const model = modelName || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: AI_SYSTEM_PROMPT + '\n\n' + buildAiUserMessage(payload) }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 400,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Google API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Empty response from Google');

  const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Provider: Azure OpenAI
 */
async function callAzureOpenAI(apiKey, payload, endpointUrl, modelName) {
  if (!endpointUrl) throw new Error('Azure OpenAI requires an endpoint URL');

  // Azure endpoint format: https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01
  const url = endpointUrl.includes('api-version')
    ? endpointUrl
    : `${endpointUrl}?api-version=2024-02-01`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: buildAiUserMessage(payload) }
      ],
      temperature: 0.1,
      max_tokens: 400,
      response_format: { type: 'json_object' }
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Azure OpenAI API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Azure OpenAI');
  return JSON.parse(content);
}

/**
 * Provider: Custom endpoint (OpenAI-compatible API)
 */
async function callCustom(apiKey, payload, endpointUrl, modelName) {
  if (!endpointUrl) throw new Error('Custom provider requires an endpoint URL');

  const resp = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName || 'default',
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: buildAiUserMessage(payload) }
      ],
      temperature: 0.1,
      max_tokens: 400
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Custom API error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  // Try OpenAI-compatible format first, then generic
  const content = data.choices?.[0]?.message?.content
    || data.content?.[0]?.text
    || data.result
    || JSON.stringify(data);
  if (!content) throw new Error('Empty response from custom endpoint');

  if (typeof content === 'string') {
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(cleaned);
  }
  return content;
}

/**
 * Route to the correct provider adapter.
 */
async function runAiProvider(provider, apiKey, payload, endpointUrl, modelName) {
  switch (provider) {
    case 'openai':    return callOpenAI(apiKey, payload, modelName);
    case 'anthropic': return callAnthropic(apiKey, payload, modelName);
    case 'google':    return callGoogle(apiKey, payload, modelName);
    case 'azure':     return callAzureOpenAI(apiKey, payload, endpointUrl, modelName);
    case 'custom':    return callCustom(apiKey, payload, endpointUrl, modelName);
    default:          throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Validate AI response matches required schema.
 */
function validateAiResponse(result) {
  if (!result || typeof result !== 'object') return null;

  const required = ['aiRiskScore', 'riskTier', 'phishType', 'topSignals', 'confidence', 'notes'];
  for (const key of required) {
    if (!(key in result)) return null;
  }

  // Validate types and ranges
  if (typeof result.aiRiskScore !== 'number' || result.aiRiskScore < 0 || result.aiRiskScore > 100) return null;
  if (!['Safe', 'Caution', 'Suspicious', 'Dangerous'].includes(result.riskTier)) return null;
  if (!Array.isArray(result.phishType)) return null;
  if (!Array.isArray(result.topSignals)) return null;
  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) return null;
  if (typeof result.notes !== 'string') return null;

  return {
    aiRiskScore: Math.round(result.aiRiskScore),
    riskTier: result.riskTier,
    phishType: result.phishType.slice(0, 5),
    topSignals: result.topSignals.slice(0, 5),
    confidence: +result.confidence.toFixed(2),
    notes: result.notes.slice(0, 200)
  };
}

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
    enhancedScanning: true,   // Tier 2 DNS checks enabled by default
    aiEnhanceEnabled: false,  // AI enhancement off by default (BYOK)
    aiProvider: 'openai',
    aiApiKey: '',
    aiEndpointUrl: '',
    aiModelName: ''
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

  // ── AI Analysis (BYOK) ──────────────────────────────────────
  //
  // Receives a features-only payload from the content script,
  // routes it through the configured AI provider, validates the
  // response, and returns the result.
  if (request.action === 'runAiAnalysis') {
    chrome.storage.local.get(
      ['aiProvider', 'aiApiKey', 'aiEndpointUrl', 'aiModelName', 'aiEnhanceEnabled'],
      async (data) => {
        if (!data.aiEnhanceEnabled || !data.aiApiKey) {
          sendResponse({ success: false, error: 'AI not configured or disabled' });
          return;
        }

        try {
          const rawResult = await runAiProvider(
            data.aiProvider || 'openai',
            data.aiApiKey,
            request.payload,
            data.aiEndpointUrl || '',
            data.aiModelName || ''
          );

          const validated = validateAiResponse(rawResult);
          if (!validated) {
            sendResponse({ success: false, error: 'AI returned invalid response schema' });
            return;
          }

          sendResponse({ success: true, result: validated });
        } catch (err) {
          console.error('GoPhishFree: AI analysis failed', err);
          sendResponse({ success: false, error: err.message || 'AI call failed' });
        }
      }
    );
    return true; // Async
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
