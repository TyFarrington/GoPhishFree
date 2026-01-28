# GoPhishFree - Chrome Extension

A Chrome extension that helps non-technical users detect and manage suspected phishing emails with ML-based risk scoring.

## Features

- **Zero-setup UX**: Install extension and start scanning emails in Gmail
- **Local ML Inference**: Runs phishing detection locally using trained ML model
- **Risk Scoring**: Provides risk scores (0-100) with Low/Medium/High levels
- **Actionable UI**: 
  - Risk badge displayed on opened emails
  - Side panel with detailed analysis
  - Dashboard with flagged emails list
- **Privacy-first**: All processing happens locally, no data sent to backend

## Installation

### Development Setup

1. **Clone or download this repository**

2. **Install Python dependencies** (for model training):
   ```bash
   pip install pandas scikit-learn numpy joblib
   ```

3. **Train the ML model**:
   ```bash
   python train_model.py
   ```
   This will create a `model/` directory with the trained model files.

4. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `GoPhishFree` directory

5. **Open Gmail** and start using the extension!

## Usage

1. **Open Gmail** in your browser
2. **Click on any email** to view it
3. The extension will automatically:
   - Detect the opened email
   - Extract features (sender, links, text signals)
   - Run ML inference locally
   - Display a risk badge next to the email header
4. **Click the risk badge** to view detailed analysis in the side panel
5. **Click the extension icon** to view the dashboard with all flagged emails

## Architecture

### Components

- **manifest.json**: Chrome extension configuration (MV3)
- **background.js**: Service worker for storage management
- **content.js**: Content script that runs on Gmail pages
- **featureExtractor.js**: Extracts phishing features from email data
- **popup.html/js**: Dashboard UI for viewing flagged emails
- **train_model.py**: ML model training script

### Feature Extraction

The extension extracts the following features locally from Gmail UI:

**URL Features:**
- Number of dots, dashes, underscores
- URL length, path length, query length
- Presence of @ symbols, IP addresses
- Suspicious TLDs, URL shorteners
- HTTPS usage

**Email Features:**
- Link mismatch (anchor text vs destination)
- Header mismatch (display name vs domain)
- Urgency keywords
- Credential request keywords
- Attachment count

### ML Model

- **Algorithm**: Random Forest Classifier
- **Training Data**: Kaggle phishing dataset (10,000 samples)
- **Features**: Subset of dataset features that can be extracted locally
- **Output**: Risk score (0-100) and risk level (Low/Medium/High)

## Limitations (Option A - Extension-Only MVP)

- Cannot automatically scan entire inbox
- Some dataset features not available locally → model uses subset
- Email extraction depends on Gmail DOM structure (may need updates if Gmail changes)
- Limited to features visible in Gmail UI

## Development

### Project Structure

```
GoPhishFree/
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── content.js             # Gmail content script
├── content.css            # Content script styles
├── featureExtractor.js    # Feature extraction logic
├── popup.html             # Dashboard HTML
├── popup.js               # Dashboard script
├── train_model.py         # ML model training
├── Phishing_Dataset/      # Training dataset
├── model/                 # Trained model files (generated)
└── Assets/                # Extension icons
```

### Testing

1. Load extension in Chrome
2. Open Gmail
3. Open various emails (legitimate and suspicious)
4. Check risk scores and flagged list
5. Verify dashboard updates correctly

## Future Enhancements

- Convert model to TensorFlow.js for better browser compatibility
- Add inbox scan functionality
- Improve email extraction robustness
- Add more sophisticated feature extraction
- Support for other email providers

## License

This is a capstone project for educational purposes.
