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

### 2. Train the ML Models

Train both the Tier 1 and Deep Scan phishing detection models:

```bash
python train_model.py
```

This will:
- Load the phishing dataset from `Phishing_Dataset/Phishing_Legitimate_full.csv`
- Train a **Tier 1 Enhanced** Random Forest model (25 features, 200 estimators)
- Train a **Deep Scan** Random Forest model (38 features, 200 estimators)
- Export both models to the `model/` directory as JSON for browser inference
- Display training accuracy, test accuracy, and feature importance

**Expected output:**
- Tier 1 model: ~90% test accuracy (25 features)
- Deep Scan model: ~93% test accuracy (38 features)

**Generated files in `model/`:**
| File | Description |
|------|-------------|
| `model_trees.json` | Tier 1 tree structures for JS inference |
| `model_deepscan.json` | Deep Scan tree structures for JS inference |
| `feature_names.json` | Tier 1 feature list (25 features) |
| `feature_names_deepscan.json` | Deep Scan feature list (38 features) |
| `model.pkl` | Sklearn Tier 1 model (for retraining) |
| `model_deepscan.pkl` | Sklearn Deep Scan model (for retraining) |
| `scaler.pkl` / `scaler_deepscan.pkl` | Feature scalers |

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
   - Extract features from the email
   - Run DNS checks (if Enhanced Scanning is on)
   - Run ML inference and display a fish-themed risk badge
4. **Click the risk badge** to view the detailed analysis side panel
5. **Click the extension icon** (top-right) to view the fish tank dashboard

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
   - Header mismatch (display name vs. domain)
   - Domain may not resolve or appears randomly generated

4. **Dangerous Email** (expected score: 90-100, Mega Phish Shark):
   - Combination of strong phishing signals
   - Punycode links, many unresolved domains
   - Deep Scan reveals insecure forms, brand impersonation

### Testing Deep Scan

1. Open an email that contains external links
2. Click the risk badge to open the side panel
3. Click **"Deep Scan Links"**
4. Approve the security consent dialog
5. Grant the optional host permission if prompted
6. Observe the scan progress and updated risk score

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
- Check that `model/` directory exists with all expected files (see table above)
- Both `model_trees.json` and `model_deepscan.json` are required

### Email Not Detected

- Gmail DOM structure may vary - check console for extraction errors
- Extension monitors URL changes and DOM mutations to detect email opens
- Try refreshing the Gmail tab

### Deep Scan Permission Issues

- If "Permission required" appears, click the GoPhishFree icon in the toolbar
- Re-open the email and try Deep Scan again
- The permission prompt may be blocked by Chrome if not initiated from a user gesture

### Risk Scores Seem Off

- Check feature extraction in the console (F12 -> Console)
- Verify Enhanced Scanning is enabled (check extension popup settings)
- The ML model provides a base probability; custom rules adjust the final score
- Combination bonuses can significantly increase scores when multiple strong signals fire

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

### Retraining the Model

If you modify features in `featureExtractor.js` or `train_model.py`:

1. Ensure feature order in `mapToModelInput()` matches `LOCAL_FEATURES` in `train_model.py`
2. Run `python train_model.py` to retrain
3. Reload the extension in Chrome
4. The new model JSON files are automatically picked up

## File Overview

```
GoPhishFree/
├── manifest.json            # Chrome MV3 config, permissions, content scripts
├── background.js            # Service worker: storage, messaging, secure fetch
├── content.js               # Gmail integration: scanning, ML inference, UI
├── content.css              # Styles for badges, side panel, report dialog
├── featureExtractor.js      # FeatureExtractor, DnsChecker, PageAnalyzer classes
├── popup.html               # Fish tank dashboard markup + embedded CSS
├── popup.js                 # Fish animation (requestAnimationFrame), data loading
├── train_model.py           # ML training: Random Forest, JSON export
├── Phishing_Dataset/        # Kaggle phishing dataset
├── model/                   # Generated model files (JSON + pkl)
├── Assets/                  # Logo.png, Banner.png, Icon.ico
├── plan/                    # Strategy documents
├── SETUP.md                 # This file
└── README.md                # Project overview
```
