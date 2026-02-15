<div align="center">
  <img src="Assets/Logo.png" alt="GoPhishFree Logo" width="200"/>
  
  # GoPhishFree
  
  **Protect yourself from phishing emails with AI-powered detection**
  
  *EECS582 Capstone Project*
</div>

---

## Quick Start

**Get started in 3 steps:**

1. **Train the model** (one-time setup)
   ```bash
   pip install pandas scikit-learn numpy joblib
   python train_model.py
   ```

2. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" -> Select this folder

3. **Open Gmail and start scanning!**

---

## Features

| Feature | Description |
|---------|-------------|
| **Privacy-First** | All ML processing happens locally - no email data leaves your device |
| **Unified ML Model** | Single 64-feature Random Forest with isotonic calibration (96.6% accuracy) |
| **Calibrated Scoring** | `riskScore = round(100 x calibrated_probability)` - stable, meaningful 0-100 |
| **3-Tier Scanning** | Email analysis, DNS checks, and optional Deep Scan (single model handles all) |
| **BEC / Linkless Detection** | Financial request scoring, authority impersonation, callback patterns |
| **Attachment Analysis** | Risky extensions, double-extension detection, filename entropy |
| **Trusted Domain Whitelist** | 500+ built-in trusted domains with user-managed custom trust/block lists |
| **Post-Model Intelligence** | Rule-based boosts for BEC/attachments + dampening for trusted senders and newsletters |
| **AI Enhancement (BYOK)** | Optional cloud AI second opinion (features-only, no email text sent) |
| **Multi-Provider AI** | OpenAI, Anthropic, Google Gemini, Azure OpenAI, custom endpoints |
| **Fish Tank UI** | Animated SVG fish tank with collectible phishing-themed fish |
| **Deep Scan** | Optional sandboxed HTML analysis of linked pages (13 extra features) |
| **Manual Reporting** | Report Phish button with severity selection (Low / Medium / High / Dangerous) |
| **Real-Time Alerts** | Instant risk badges on suspicious emails in Gmail |

---

## How It Works

1. **Open any email in Gmail** - Extension automatically scans it
2. **See risk badge** - Fish-themed badge appears next to email header
3. **Click badge** - Opens detailed analysis side panel with risk score, indicators, and suspicious links
4. **AI Analysis (optional)** - If "Enhance with AI" is enabled, a features-only payload is sent to your configured AI provider for a second opinion. No email body, subject, or sender address is ever transmitted.
5. **Deep Scan (optional)** - Analyze linked page structure for additional phishing signals
6. **Report Phish** - Manually flag suspicious emails with a severity rating
7. **Fish Tank** - Click the extension icon to view your collected fish and scan history

---

## Architecture

### System Architecture
![System Architecture](Framework/system-architecture.png)

### Risk Scoring Pipeline
![Risk Scoring Pipeline](Framework/risk-scoring-pipeline.png)

### Email Scan Sequence
![Email Scan Sequence](Framework/email-scan-sequence-diagram.png)

### Class Diagram
![Class Diagram](Framework/class-diagram.png)

### ML Model Architecture
![ML Model Architecture](Framework/ai-model-architecture.png)

### AI Enhancement Flow
![AI Enhancement Flow](Framework/ai-enhancement-flow.png)

> Interactive Mermaid versions of all diagrams are available in [ARCHITECTURE.md](ARCHITECTURE.md).

---

### Unified Detection Pipeline

**Single 64-Feature Calibrated Model**

The extension uses a single Random Forest model (200 trees) trained on 64 features across 7 groups. Features that are unavailable at scan time (e.g., DNS or Deep Scan not yet run) are default-filled with 0 and flagged via context flags (`dns_ran`, `deep_scan_ran`). The model was trained on ~36,000 samples including synthetic BEC, attachment phishing, newsletter, and transactional email data, achieving 96.6% accuracy with 100% detection on BEC/linkless and attachment-led phishing.

| Feature Group | Count | Examples |
|---------------|-------|---------|
| URL/Email Lexical | 25 | NumDots, UrlLength, IpAddress, Punycode, LinkMismatchRatio |
| Custom Rules (model inputs) | 9 | SuspiciousTLD, UrgencyScore, CredentialPhishingScore |
| DNS | 5 | DomainExists, MXRecordCount, RandomStringDomain |
| Deep Scan Page | 13 | InsecureForms, ExtFormAction, EmbeddedBrandName |
| BEC / Linkless | 5 | FinancialRequestScore, AuthorityImpersonationScore, PhoneCallbackPattern |
| Attachment | 5 | HasAttachment, RiskyAttachmentExtension, DoubleExtensionFlag |
| Context Flags | 2 | dns_ran, deep_scan_ran |

### Risk Score Calculation

```
riskScore = round(100 x calibrated_probability)
```

The model's raw probability is calibrated using isotonic regression (fitted during training), ensuring the 0-100 score is stable and well-distributed. Post-model intelligence layers then apply BEC rule boosts (for strong financial request, authority impersonation, or callback signals) and dampening for trusted domains and detected newsletters to reduce false positives.

### AI Enhancement (BYOK)

When the "Enhance with AI" toggle is enabled and an API key is configured:

- **Automatic gating**: AI is only called when useful (mid-range score 30-80, low confidence, risky signals)
- **Features-only payload**: Compact JSON of extracted signals - **no email body, subject, or sender address**
- **Strict output schema**: AI must return valid JSON with `aiRiskScore`, `riskTier`, `phishType`, `topSignals`, `confidence`, `notes`
- **Agreement badge**: Shows "Aligned" or "Needs review" based on local vs AI score difference
- **Provider support**: OpenAI, Anthropic, Google Gemini, Azure OpenAI, Custom endpoint
- **Keys stored locally**: `chrome.storage.local` only, never synced

### Trusted Domain Whitelist & Post-Model Intelligence

GoPhishFree includes a comprehensive trusted domain system to minimize false positives:

- **500+ built-in trusted domains** across 15+ categories: Big Tech, Cloud/SaaS, Finance, News, E-commerce, Travel, Education, Government, Health, Telecom, Gaming, Automotive, Insurance, Real Estate, and more
- **User-managed custom domains**: Users can add their own trusted domains or block built-in ones via the popup settings UI
- **Priority logic**: User blocked > User trusted > Built-in list (blocking always wins)
- **Post-model BEC boosts**: Strong financial request, authority impersonation, or phone callback signals raise the floor to 70-80 even if the ML model under-scores
- **Free email provider awareness**: Domains like gmail.com, outlook.com, icloud.com, yahoo.com, protonmail.com (40+ providers) are explicitly excluded from trusted dampening -- anyone can register on these, so phishing from free accounts is scored on its own merits
- **Trusted domain dampening**: Emails from trusted corporate domains (not free providers) with no BEC/attachment signals are capped at 30
- **Newsletter detection**: Emails with unsubscribe links, "view in browser" links, and newsletter footer patterns from non-trusted domains are capped at 45
- **Live sync**: Custom domain changes in the popup propagate instantly to the content script

### Risk Classification

| Score Range | Classification | Fish Type |
|-------------|---------------|-----------|
| 0 - 49 | Low Risk | Friendly Fish |
| 50 - 75 | Medium Risk | Suspicious Fish |
| 76 - 89 | High Risk | Phishy Pufferfish |
| 90 - 100 | Dangerous | Mega Phish Shark |

---

## Security

### Privacy Guarantees
- **Local ML processing** - All model inference runs in-browser, no email content transmitted
- **No API keys required for core scanning** - Uses free public DNS-over-HTTPS services
- **No backend server** - Extension is fully self-contained
- **Credentials never sent** - Deep Scan fetches use `credentials: 'omit'`
- **AI is features-only** - When AI enhancement is used, only extracted signal features are sent (no body, subject, or sender address)
- **AI keys stored locally** - `chrome.storage.local` only, never synced to Chrome Sync

### Deep Scan Sandboxing
- URL scheme whitelist (http/https only)
- Sender validation (only Gmail content script can trigger)
- Hardcoded permission origins in background service worker
- Response size cap (2 MB), content-type validation
- No script execution - HTML parsed via DOMParser only
- DOM node limit (50,000) to prevent resource exhaustion
- Strict timeout (8 seconds), redirect validation
- `referrerPolicy: 'no-referrer'` to prevent origin leakage

### AI Prompt Injection Hardening
- System prompt enforces: no tools, no browsing, no link visiting
- AI only receives structured JSON signals, never raw text
- Response must match strict JSON schema or is rejected
- Invalid responses shown as "AI unavailable"

---

## Installation

### Prerequisites
- Python 3.7+ (for model training)
- Google Chrome browser
- Gmail account

### Step-by-Step Setup

**Step 1: Install Dependencies**
```bash
pip install pandas scikit-learn numpy joblib
```

**Step 2: Train Model**
```bash
python train_model.py
```
*Trains the unified 64-feature calibrated Random Forest. Creates `model/model_unified.json` (~30 seconds).*

**Step 3: Load Extension**
1. Open Chrome -> `chrome://extensions/`
2. Toggle **"Developer mode"** (top right)
3. Click **"Load unpacked"**
4. Select the project folder (containing `manifest.json`)

**Step 4: Start Using!**
- Open Gmail in a new tab
- Click on any email to scan it
- See risk scores instantly!

**Step 5 (Optional): Configure AI Enhancement**
- Click the GoPhishFree extension icon
- Toggle **"Enhance with AI"** ON
- Click **"Configure AI Provider"**
- Select your provider and enter your API key
- AI analysis will run automatically after each local scan (when useful)

---

## Usage Guide

### Scanning Emails
- **Automatic**: Open any email in Gmail - scanning happens automatically
- **Risk Badge**: Fish-themed badge appears next to the email subject
- **Details**: Click the badge to open the analysis side panel

### AI Enhancement
- Enable **"Enhance with AI"** in the extension popup settings
- Configure your AI provider (OpenAI, Anthropic, Google, Azure, or custom)
- AI analysis runs automatically after local scans when the gating logic determines it's useful
- AI results appear below the local score with an agreement badge

### Deep Scan
- Open the analysis side panel by clicking the risk badge
- Click **"Deep Scan Links"** to analyze linked pages
- Confirm the security warning dialog
- View additional findings from page structure analysis

### Report Phish
- In the analysis side panel, click **"Report Phish"**
- Select severity level (Low / Medium / High / Dangerous)
- The email is flagged and a fish is added to your collection

### Fish Tank Dashboard
- Click the **extension icon** (top-right Chrome toolbar)
- View your animated fish tank with collected fish
- See scan statistics (emails scanned, fish caught)
- Browse recent catches and fish collection
- Toggle Enhanced Scanning (DNS checks) on/off
- Toggle AI Enhancement on/off and configure providers
- Manage trusted domains (add/remove custom trusted or blocked domains)

---

## Project Structure

```
GoPhishFree/
├── manifest.json            # Chrome MV3 extension configuration
├── background.js            # Service worker: storage, messaging, fetch proxy, AI adapters
├── content.js               # Gmail content script: unified scanning, inference, AI runner, UI
├── content.css              # Side panel, badge, and AI result styles
├── featureExtractor.js      # FeatureExtractor (64 features), DnsChecker, PageAnalyzer
├── popup.html               # Fish tank dashboard + AI config modal
├── popup.js                 # Fish animation, data display, AI settings
├── train_model.py           # Unified ML training: RF + isotonic calibration + JSON export
├── generate_sprint2_docs.py # Sprint 2 document generator
├── Phishing_Dataset/        # Training data (Kaggle dataset)
│   └── Phishing_Legitimate_full.csv
├── model/                   # Trained model (generated by train_model.py)
│   └── model_unified.json   # 64-feature calibrated RF (trees + scaler + calibration)
├── Assets/                  # Visual assets
│   ├── Logo.png             # Extension logo
│   ├── logomini.png         # Small logo (toolbar, favicon)
│   ├── Banner.png           # Header banner image
│   └── icon1.ico            # Favicon
├── Framework/               # Architecture diagrams and documents
├── docs/                    # Sprint documents
│   └── Sprint2/             # Sprint 2 requirements and artifacts
├── ARCHITECTURE.md          # Architecture & UML diagrams (Mermaid)
├── FEATURE_MAPPING.md       # 64-feature unified schema documentation
├── PROJECT_SUMMARY.md       # Project implementation summary
├── SETUP.md                 # Detailed setup guide
└── README.md                # This file
```

---

## Technical Details

| Component | Technology |
|-----------|-----------|
| Extension Type | Chrome Manifest V3 |
| ML Framework | scikit-learn (Random Forest + CalibratedClassifierCV) |
| ML Inference | Custom JS tree traversal + isotonic calibration lookup |
| Feature Count | 64 (unified schema across 7 groups) |
| Model Accuracy | 96.6% (unified calibrated model with synthetic augmentation) |
| Calibration | Isotonic regression via CalibratedClassifierCV |
| DNS Resolution | Cloudflare / Google DNS-over-HTTPS |
| AI Enhancement | BYOK: OpenAI, Anthropic, Google Gemini, Azure OpenAI, Custom |
| Storage | Chrome Storage API (local only) |
| Animations | SVG + CSS keyframes + requestAnimationFrame |
| Privacy | Local ML + features-only AI (no email content transmitted) |

---

## Testing

1. Load the extension in Chrome (see Installation)
2. Open Gmail and click on various emails
3. Verify risk badges appear with appropriate scores
4. Test the analysis side panel (click badge)
5. Try Deep Scan on an email with links
6. Test Report Phish with different severity levels
7. Check the fish tank dashboard (click extension icon)
8. Toggle Enhanced Scanning (DNS checks) on/off in settings
9. Enable AI Enhancement and configure an API key
10. Verify AI analysis runs automatically on mid-range scans
11. Check agreement badge shows "Aligned" or "Needs review"
12. Add a custom trusted domain in settings and verify scores are dampened
13. Block a built-in trusted domain and verify it's scored normally
14. Test newsletters from trusted senders show low scores

---

## License

This project is part of **EECS582 Capstone Project** - for educational purposes.

---

<div align="center">
  <strong>Made with care for safer email</strong>
</div>
