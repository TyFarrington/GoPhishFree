# GoPhishFree Setup Guide

## Prerequisites

- **Python 3.7+** (for model training)
- **Google Chrome** browser
- **Gmail** account

## Step-by-Step Setup

### 1. Install Python Dependencies

Open a terminal in the project directory and run:

```bash
pip install pandas scikit-learn numpy joblib
```

### 2. Train the Unified ML Model

Train the calibrated phishing detection model:

```bash
python train_model.py
```

This will:
- Load the phishing dataset from `Phishing_Dataset/Phishing_Legitimate_full.csv`
- Define the 64-feature unified schema (URL, custom rules, DNS, page, BEC, attachment, context flags)
- Augment the dataset with multiple scan-scenario variants (base, DNS-only, full)
- Train a **Unified Random Forest** (200 estimators, max_depth=20) with **isotonic calibration**
- Validate with classification report, confusion matrix, and per-phishing-type evaluation
- Export the calibrated model to `model/model_unified.json`

**Expected output:**
- Unified model: ~95.5% test accuracy (64 features)
- Per-type evaluation (URL-credential, linkless BEC, attachment-led, deep scan impersonation)

**Generated files in `model/`:**
| File | Description |
|------|-------------|
| `model_unified.json` | Unified calibrated RF: trees + scaler + calibration lookup |
| `model_unified_calibrated.pkl` | Calibrated sklearn model (for retraining) |
| `model_unified_raw.pkl` | Raw RF model (for analysis) |
| `scaler_unified.pkl` | StandardScaler parameters |
| `feature_names_unified.json` | 64-feature ordered list |

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the project directory (the folder containing `manifest.json`)
5. Verify the extension appears with the GoPhishFree icon

### 4. Test the Extension

1. **Open Gmail** in a new tab: https://mail.google.com
2. **Click on any email** to view it
3. The extension will automatically:
   - Show a "Scanning..." loading badge
   - Extract 64 features from the email (with defaults for unavailable groups)
   - Run DNS checks (if Enhanced Scanning is on)
   - Run calibrated ML inference: `riskScore = round(100 x calibrated_prob)`
   - Display a fish-themed risk badge
4. **Click the risk badge** to view the detailed analysis side panel
5. **Click the extension icon** (top-right) to view the fish tank dashboard

### 5. Configure AI Enhancement (Optional)

1. Click the **GoPhishFree extension icon** in the Chrome toolbar
2. Toggle **"Enhance with AI"** ON
3. Click **"Configure AI Provider"**
4. Select your AI provider:
   - **OpenAI** (GPT-4o-mini) — enter your `sk-...` key
   - **Anthropic** (Claude) — enter your Anthropic API key
   - **Google** (Gemini) — enter your Google AI API key
   - **Azure OpenAI** — enter your key + deployment endpoint URL
   - **Custom** — enter your key + OpenAI-compatible endpoint URL
5. Click **Save Configuration**
6. AI analysis will now run automatically after each local scan when the gating logic determines it's useful

**What AI receives:** A compact features-only JSON payload. No email body, subject, or sender address is ever sent.

**When AI runs:** Only when useful — mid-range local score (30-80), low confidence, risky attachments, reply-to mismatch, or deep scan found suspicious forms.

## Testing with Sample Emails

### Test Cases

1. **Legitimate Email** (expected score: 0-49, Friendly Fish):
   - From known domains (gmail.com, university.edu, company.com)
   - HTTPS links, matching anchor text
   - No urgency language or credential requests

2. **Suspicious Email** (expected score: 50-75, Suspicious Fish):
   - Contains URL shorteners or suspicious TLDs
   - Some link mismatches or urgency language
   - Sender domain might lack MX records

3. **Phishing Email** (expected score: 76-89, Phishy Pufferfish):
   - Multiple strong indicators (link mismatches, credential requests)
   - Financial request language, authority impersonation
   - Domain may not resolve or appears randomly generated

4. **Dangerous Email** (expected score: 90-100, Mega Phish Shark):
   - Combination of strong phishing signals
   - Punycode links, risky attachments, double extensions
   - Deep Scan reveals insecure forms, brand impersonation

### Testing Deep Scan

1. Open an email that contains external links
2. Click the risk badge to open the side panel
3. Click **"Deep Scan Links"**
4. Approve the security consent dialog
5. Grant the optional host permission if prompted
6. Observe the scan progress and updated risk score (same unified model, now with page features)

### Testing AI Enhancement

1. Enable "Enhance with AI" in extension settings
2. Configure your AI provider and API key
3. Open an email with a mid-range risk score (30-80)
4. Observe "AI: Scanning..." indicator below the local score
5. Verify AI Risk Score appears with agreement badge ("Aligned" or "Needs review")
6. Open a clearly safe email - verify "AI not needed (high confidence)" appears

### Testing Report Phish

1. Open any email and let it scan
2. Click the risk badge to open the side panel
3. Scroll down and click **"Report Phish"**
4. Select a severity level in the dialog
5. Verify the fish is added to your collection and the badge updates

## Troubleshooting

### Extension Not Working

- **Check console**: Press F12 -> Console tab in the Gmail tab
- **Reload extension**: Go to `chrome://extensions/` -> Click the reload icon
- **Check permissions**: Ensure extension has Gmail access

### Model Not Found

- Ensure `train_model.py` ran successfully
- Check that `model/` directory exists with `model_unified.json`
- The extension falls back to `model_trees.json` if the unified model is not found

### Email Not Detected

- Gmail DOM structure may vary - check console for extraction errors
- Extension monitors URL changes and DOM mutations to detect email opens
- Try refreshing the Gmail tab

### Deep Scan Permission Issues

- If "Permission required" appears, click the GoPhishFree icon in the toolbar
- Re-open the email and try Deep Scan again
- The permission prompt may be blocked by Chrome if not initiated from a user gesture

### AI Enhancement Issues

- **"AI unavailable"**: Check that your API key is valid and the provider is reachable
- **No AI section shown**: Ensure "Enhance with AI" is toggled ON in extension settings
- **"AI not needed"**: The gating logic determined the local model is confident enough
- **Invalid response**: The AI provider returned a response that doesn't match the required schema
- Check the background service worker console (`chrome://extensions/` -> Inspect) for detailed errors

### Risk Scores Seem Off

- Check feature extraction in the console (F12 -> Console)
- Verify Enhanced Scanning is enabled (check extension popup settings)
- The unified model produces `riskScore = round(100 x calibrated_prob)` with no post-hoc adjustments
- Context flags (`dns_ran`, `deep_scan_ran`) affect the model's behavior

## Development Mode

### Making Changes

1. Edit files as needed
2. Go to `chrome://extensions/`
3. Click **Reload** on the extension
4. Refresh the Gmail tab

### Debugging

- **Content Script**: Check console in the Gmail tab (F12)
- **Background Script**: Go to `chrome://extensions/` -> Service Worker -> Inspect
- **Popup**: Right-click the extension icon -> Inspect popup
- **Side Panel**: Inspect within the Gmail tab (it's injected into the DOM)
- **AI Calls**: Check background service worker console for API errors

### Retraining the Model

If you modify features in `featureExtractor.js` or `train_model.py`:

1. Ensure feature order in `buildUnifiedVector()` matches `UNIFIED_FEATURES` in `train_model.py`
2. Run `python train_model.py` to retrain
3. Reload the extension in Chrome
4. The new `model_unified.json` is automatically picked up

## File Overview

```
GoPhishFree/
├── manifest.json            # Chrome MV3 config, permissions, content scripts
├── background.js            # Service worker: storage, messaging, secure fetch, AI adapters
├── content.js               # Gmail integration: unified scanning, calibrated inference, AI runner, UI
├── content.css              # Styles for badges, side panel, AI results, report dialog
├── featureExtractor.js      # FeatureExtractor (64 features), DnsChecker, PageAnalyzer
├── popup.html               # Fish tank dashboard + AI configuration modal
├── popup.js                 # Fish animation (requestAnimationFrame), data loading, AI settings
├── train_model.py           # Unified ML training: RF + CalibratedClassifierCV + JSON export
├── generate_sprint2_docs.py # Sprint 2 document generator
├── Phishing_Dataset/        # Kaggle phishing dataset
├── model/                   # Generated model files (model_unified.json)
├── Assets/                  # Logo.png, logomini.png, Banner.png, icon1.ico
├── Framework/               # Architecture diagrams and PDF
├── docs/                    # Sprint documents
├── ARCHITECTURE.md          # Architecture & UML diagrams (Mermaid)
├── FEATURE_MAPPING.md       # 64-feature unified schema documentation
├── PROJECT_SUMMARY.md       # Project implementation summary
├── SETUP.md                 # This file
└── README.md                # Project overview
```
