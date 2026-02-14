# GoPhishFree - Project Summary

## Overview

GoPhishFree is a Chrome extension (MV3) that helps non-technical users detect phishing emails in Gmail using ML-based risk scoring. All core ML processing happens locally for privacy. An optional BYOK cloud AI enhancement provides a second opinion using features-only data (no email text ever sent).

## Implementation Status

### Completed Components

1. **Chrome Extension Structure**
   - Manifest V3 configuration with appropriate permissions
   - Background service worker (storage, messaging, fetch proxy, AI adapters)
   - Content script for Gmail (unified scanning, inference, AI runner, UI)
   - Popup dashboard with animated fish tank and AI configuration

2. **Unified Feature Extraction (64 Features)**
   - URL/Email lexical features (25): dots, dashes, length, subdomains, entropy, punycode, etc.
   - Custom rule features promoted to model inputs (9): suspicious TLD, urgency, credential requests, etc.
   - DNS features (5): domain existence, MX records, A records, random string detection
   - Deep Scan page features (13): insecure forms, external actions, iframes, brand impersonation
   - BEC/Linkless features (5): financial request scoring, authority impersonation, callback patterns, reply-to mismatch
   - Attachment features (5): risky extensions, double-extension detection, filename entropy
   - Context flags (2): `dns_ran`, `deep_scan_ran`

3. **Unified Calibrated ML Model**
   - Single Random Forest classifier (200 trees, max_depth=20)
   - Isotonic calibration via `CalibratedClassifierCV`
   - 95.5% test accuracy on unified feature set
   - Score = `round(100 x calibrated_probability)` — no post-hoc adjustments
   - Dataset augmentation with scan-scenario variants (base, DNS-only, full)
   - Per-phishing-type evaluation (URL-credential, BEC-linkless, attachment-led, deep scan)

4. **AI Enhancement (Cloud BYOK)**
   - Toggle-based activation with provider configuration modal
   - Provider adapters: OpenAI, Anthropic, Google Gemini, Azure OpenAI, Custom
   - Features-only payload: no email body, subject, or sender address sent
   - Automatic gating: AI only called when useful (mid-range score, low confidence, risky signals)
   - Strict JSON schema validation + prompt injection hardening
   - Agreement badge: "Aligned" or "Needs review" based on score difference
   - API keys stored locally only (`chrome.storage.local`), never synced

5. **User Interface**
   - Risk badge on email headers with fish-themed classification
   - Side panel with detailed analysis, reasons, suspicious links
   - AI Analysis section: scanning state, AI score, tier, signals, agreement badge
   - Deep Scan progress and results with page structure findings
   - Report Phish dialog with severity selection
   - Animated SVG fish tank popup dashboard
   - Fish collection panel with 4 types (Friendly, Suspicious, Phishy Puffer, Mega Phish Shark)
   - Recent catches list with click-to-navigate

6. **Data Storage**
   - Chrome Storage API (local only)
   - Scan history, fish collection, recent catches
   - AI settings (provider, API key, endpoint) stored locally, never synced
   - Enhanced scanning (DNS) toggle

7. **Documentation**
   - README with overview, features, installation, usage
   - ARCHITECTURE.md with Mermaid diagrams (system, sequence, class, pipeline, AI flow)
   - SETUP.md with detailed instructions including AI configuration
   - FEATURE_MAPPING.md with complete 64-feature schema
   - PROJECT_SUMMARY.md (this file)
   - Sprint 2 document generator
   - Framework/ architecture diagrams

### Model Performance

| Metric | Value |
|--------|-------|
| Training Accuracy | ~99% |
| Test Accuracy | 95.5% |
| Feature Count | 64 (unified schema) |
| Decision Trees | 200 |
| Calibration | Isotonic regression (CalibratedClassifierCV) |
| Hyperparameters | max_depth=20, min_samples_leaf=2 |
| Dataset Size | ~30,000 samples (augmented from 10,000) |
| Score Formula | `round(100 x calibrated_prob)` |
| Risk Levels | 4 (Low 0-49, Medium 50-75, High 76-89, Dangerous 90-100) |

### Key Features

1. **Zero-Setup UX**: Install -> Open Gmail -> Automatic scanning
2. **Privacy-First**: All ML processing local, AI uses features-only (no email content)
3. **Unified Model**: Single 64-feature calibrated RF handles all scan scenarios
4. **Real-Time Detection**: Scans emails as they're opened
5. **Smart AI Gating**: AI only called when local model is uncertain
6. **Actionable UI**: Risk scores, reasons, AI second opinion, suspicious links
7. **Fish Tank Dashboard**: Animated collectible fish with scan statistics

### Project Structure

```
GoPhishFree/
├── manifest.json              # Extension config (MV3)
├── background.js              # Service worker + AI provider adapters
├── content.js                 # Gmail content script (unified scanning + AI runner)
├── content.css                # Content styles
├── featureExtractor.js        # FeatureExtractor (64 features) + DnsChecker + PageAnalyzer
├── popup.html/js              # Dashboard + AI config modal
├── train_model.py             # Unified ML training + calibration + JSON export
├── generate_sprint2_docs.py   # Sprint 2 document generator
├── Phishing_Dataset/          # Training data
├── model/                     # Trained model (generated)
│   └── model_unified.json     # Calibrated RF (trees + scaler + calibration lookup)
├── Assets/                    # Icons and images
├── Framework/                 # Architecture diagrams
├── docs/                      # Sprint documents
└── *.md                       # Documentation files
```

### Usage Flow

1. User installs extension
2. Opens Gmail
3. Clicks on an email
4. Extension detects email open via URL/DOM monitoring
5. Extracts 64 features (URL, custom, BEC, attachment, with defaults for unavailable groups)
6. Runs DNS checks (if Enhanced Scanning enabled)
7. Builds 64-element unified vector with context flags
8. Runs calibrated Random Forest inference -> `riskScore = round(100 x prob)`
9. Displays risk badge + side panel with score, reasons, links
10. If AI enabled: gating check -> builds features-only payload -> AI provider call -> displays AI score + agreement badge
11. Optional: Deep Scan re-runs same model with page features -> re-runs AI if enabled
12. Optional: Report Phish with severity selection

### Technical Stack

| Component | Technology |
|-----------|-----------|
| Extension | Chrome Manifest V3 |
| ML Training | Python (scikit-learn RF + CalibratedClassifierCV) |
| ML Inference | Custom JS tree traversal + isotonic calibration lookup |
| AI Enhancement | BYOK: OpenAI, Anthropic, Google Gemini, Azure OpenAI, Custom |
| DNS Resolution | Cloudflare / Google DNS-over-HTTPS |
| Storage | Chrome Storage API (local only) |
| UI | Vanilla JavaScript + CSS + SVG animations |
| Features | 64 locally-extractable features (unified schema) |

### Capstone Deliverables

- Chrome MV3 extension with full scanning pipeline
- Unified calibrated ML model (64 features, 95.5% accuracy)
- AI Enhancement with BYOK multi-provider support
- Fish Tank dashboard with animated SVG fish
- Feature mapping documentation (64-feature schema)
- Architecture documentation with Mermaid diagrams
- Sprint 2 requirements and artifacts documents
- Framework architecture diagrams

---

**Status**: Production-ready with unified ML model + optional AI enhancement
