<div align="center">
  <img src="Assets/Logo.png" alt="GoPhishFree Logo" width="200"/>
  
  # GoPhishFree
  
  **🛡️ Protect yourself from phishing emails with AI-powered detection**
  
  *EECS582 Capstone Project*
</div>

---

## 🚀 Quick Start

**Get started in 3 steps:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/Areyes42/EECS582-CapstoneProject.git
   cd EECS582-CapstoneProject
   ```

2. **Train the model** (one-time setup)
   ```bash
   pip install pandas scikit-learn numpy joblib
   python train_model.py
   ```

3. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" → Select this folder
   - Open Gmail and start scanning!

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔒 **Privacy-First** | All processing happens locally - no data leaves your device |
| ⚡ **Zero Setup** | Install and use immediately - no configuration needed |
| 🎯 **Smart Detection** | ML-powered risk scoring (90.75% accuracy) |
| 📊 **Visual Dashboard** | Track all flagged emails in one place |
| 🚨 **Real-Time Alerts** | Instant risk badges on suspicious emails |

---

## 📖 How It Works

1. **Open any email in Gmail** → Extension automatically scans it
2. **See risk badge** → Low/Medium/High risk indicator appears
3. **Click badge** → View detailed analysis (reasons, suspicious links)
4. **Check dashboard** → See all flagged emails in one place

---

## 🛠️ Installation

### Prerequisites
- Python 3.7+ (for model training)
- Google Chrome browser
- Gmail account

### Step-by-Step Setup

**Step 1: Clone Repository**
```bash
git clone https://github.com/Areyes42/EECS582-CapstoneProject.git
cd EECS582-CapstoneProject
```

**Step 2: Install Dependencies**
```bash
pip install pandas scikit-learn numpy joblib
```

**Step 3: Train Model**
```bash
python train_model.py
```
*This creates the `model/` directory with trained files (~30 seconds)*

**Step 4: Load Extension**
1. Open Chrome → `chrome://extensions/`
2. Toggle **"Developer mode"** (top right)
3. Click **"Load unpacked"**
4. Select the `EECS582-CapstoneProject` folder

**Step 5: Start Using!**
- Open Gmail in a new tab
- Click on any email to scan it
- See risk scores instantly!

## 📱 Usage Guide

### Scanning Emails
- **Automatic**: Just open any email in Gmail - scanning happens automatically
- **Risk Badge**: See Low/Medium/High indicator next to email header
- **Details**: Click the badge to see why it's flagged

### Dashboard
- Click the **extension icon** (top-right Chrome toolbar)
- View all flagged emails
- See scan statistics (total scanned, flagged count)
- Clear history if needed

### Understanding Risk Scores
- **Low (0-39)**: Likely safe, minimal suspicious indicators
- **Medium (40-69)**: Some suspicious features detected
- **High (70-100)**: Multiple red flags - exercise caution

## 🔬 How It Detects Phishing

### What We Check

**🔗 URL Analysis**
- Suspicious patterns (IP addresses, URL shorteners)
- Suspicious top-level domains (.tk, .ml, etc.)
- Missing HTTPS
- Unusual URL structure

**📧 Email Content**
- Link mismatches (clickable text ≠ actual destination)
- Sender name vs. email domain mismatches
- Urgency language ("urgent", "act now", "expired")
- Credential requests ("verify account", "update password")

**📊 ML Model**
- **Algorithm**: Random Forest (100 trees)
- **Training**: 10,000 emails (50% phishing, 50% legitimate)
- **Accuracy**: 90.75% on test set
- **Features**: 20+ locally-extractable signals

## 📁 Project Structure

```
GoPhishFree/
├── manifest.json          # Extension configuration
├── background.js          # Storage & messaging
├── content.js             # Gmail integration
├── featureExtractor.js    # Feature extraction
├── popup.html/js          # Dashboard UI
├── train_model.py         # ML training script
├── Phishing_Dataset/      # Training data
├── model/                 # Trained models
└── Assets/                # Icons & logo
```

---

## ⚠️ Current Limitations

- Scans emails one at a time (no bulk inbox scan)
- Works only with Gmail web interface
- Some advanced features require full email access (not available in MVP)

---

## 🚧 Future Improvements

- [ ] Bulk inbox scanning
- [ ] TensorFlow.js model integration
- [ ] Support for Outlook, Yahoo Mail
- [ ] Enhanced feature detection
- [ ] Real-time model updates

---

## 🧪 Testing

To test the extension:
1. Load it in Chrome (see Installation)
2. Open Gmail
3. Open various emails (mix of safe and suspicious)
4. Verify risk badges appear correctly
5. Check dashboard shows flagged emails

---

## 📚 Technical Details

**Extension Type**: Chrome Manifest V3  
**ML Framework**: scikit-learn (Random Forest)  
**Storage**: Chrome Storage API (local only)  
**Privacy**: 100% local processing - zero data transmission

---

## 📄 License

This project is part of **EECS582 Capstone Project** - for educational purposes.

---

<div align="center">
  <strong>Made with ❤️ for safer email</strong>
</div>
