# GoPhishFree Setup Guide

## Prerequisites

- Python 3.7+ (for model training)
- Google Chrome browser
- Gmail account

## Step-by-Step Setup

### 1. Install Python Dependencies

Open a terminal in the project directory and run:

```bash
pip install pandas scikit-learn numpy joblib
```

### 2. Train the ML Model

Train the phishing detection model:

```bash
python train_model.py
```

This will:
- Load the phishing dataset from `Phishing_Dataset/Phishing_Legitimate_full.csv`
- Train a Random Forest model on locally-extractable features
- Export the model to the `model/` directory
- Display training and test accuracy metrics

Expected output:
- Training accuracy: ~98%
- Test accuracy: ~90%

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `GoPhishFree` directory (the folder containing `manifest.json`)
5. Verify the extension appears in your extensions list

### 4. Test the Extension

1. **Open Gmail** in a new tab: https://mail.google.com
2. **Click on any email** to view it
3. The extension will automatically:
   - Detect the opened email
   - Extract features and run analysis
   - Display a risk badge next to the email header
4. **Click the risk badge** to view detailed analysis
5. **Click the extension icon** (top-right) to view the dashboard

## Testing with Sample Emails

### Test Cases

1. **Legitimate Email**: 
   - Should show Low risk (< 40)
   - From known domains (gmail.com, company.com)
   - HTTPS links, matching anchor text

2. **Suspicious Email**:
   - Should show Medium/High risk (≥ 40)
   - Contains URL shorteners, suspicious TLDs
   - Link mismatches, urgency language

3. **Phishing Email**:
   - Should show High risk (≥ 70)
   - Multiple suspicious indicators
   - Gets flagged in dashboard

## Troubleshooting

### Extension Not Working

- **Check console**: Press F12 → Console tab to see errors
- **Reload extension**: Go to `chrome://extensions/` → Click reload icon
- **Check permissions**: Ensure extension has Gmail access

### Model Not Found

- Ensure `train_model.py` ran successfully
- Check that `model/` directory exists with:
  - `feature_names.json`
  - `model_trees.json`
  - `model.pkl`
  - `scaler.pkl`

### Email Not Detected

- Gmail DOM structure may have changed
- Check browser console for extraction errors
- Extension uses best-effort DOM selectors

### Risk Scores Seem Off

- Current implementation uses rule-based inference
- For production, implement full ML model loading
- Check feature extraction in console logs

## Development Mode

### Making Changes

1. Edit files as needed
2. Go to `chrome://extensions/`
3. Click **Reload** on the extension
4. Refresh Gmail tab

### Debugging

- **Content Script**: Check console in Gmail tab (F12)
- **Background Script**: Go to `chrome://extensions/` → Service Worker → Inspect
- **Popup**: Right-click extension icon → Inspect popup

## File Structure

```
GoPhishFree/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js             # Gmail content script
├── content.css            # Content script styles
├── featureExtractor.js    # Feature extraction
├── popup.html/js          # Dashboard UI
├── train_model.py         # ML training script
├── Phishing_Dataset/      # Training data
├── model/                 # Trained model (generated)
└── Assets/                # Icons
```

## Next Steps

- Implement full ML model inference (currently using rules)
- Add inbox scan functionality
- Improve email extraction robustness
- Add more sophisticated features
