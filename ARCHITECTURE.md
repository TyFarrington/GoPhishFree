# GoPhishFree – Architecture & UML Diagrams

## Visual Diagrams

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

---

## Mermaid Diagrams (Interactive)

*The diagrams below are Mermaid-formatted versions that render interactively on GitHub.*

## High-Level System Architecture

```mermaid
graph TB
    subgraph Chrome Extension
        subgraph "Content Scripts (Gmail Page)"
            CS[content.js<br/>Unified Scanning & Calibrated Inference<br/>500+ Trusted Domains · Post-Model Intelligence]
            FE[featureExtractor.js<br/>FeatureExtractor · DnsChecker · PageAnalyzer<br/>buildUnifiedVector · BEC/Attachment features]
            CSS[content.css<br/>Badge, Panel & AI Styles]
        end

        subgraph "Background Service Worker"
            BG[background.js<br/>Storage · Messaging · Fetch Proxy<br/>AI Provider Adapters]
        end

        subgraph "Popup Dashboard"
            PH[popup.html<br/>Fish Tank Markup · AI Config Modal<br/>Trusted Domains Manager]
            PJ[popup.js<br/>Animation · Data Display · AI Settings<br/>Custom Domain Add/Remove/Block]
        end

        subgraph "Static Assets"
            MODEL[model/<br/>model_unified.json<br/>64-feature calibrated RF]
            ASSETS[Assets/<br/>Logo.png · logomini.png · Banner.png · icon1.ico]
            MF[manifest.json]
        end
    end

    subgraph "External Services (Tier 2)"
        CF[Cloudflare DNS-over-HTTPS<br/>cloudflare-dns.com]
        GD[Google DNS-over-HTTPS<br/>dns.google]
    end

    subgraph "External Pages (Tier 3)"
        WEB[Target Webpage<br/>HTML only, no scripts]
    end

    subgraph "AI Providers (BYOK, Optional)"
        OAI[OpenAI API]
        ANT[Anthropic API]
        GEM[Google Gemini API]
        AZ[Azure OpenAI]
        CUS[Custom Endpoint]
    end

    subgraph "Offline Training"
        TP[train_model.py<br/>scikit-learn RF + CalibratedClassifierCV]
        DS[Phishing_Dataset/<br/>Kaggle CSV]
    end

    %% Runtime data flow
    CS -->|"extractEmailFeatures()"| FE
    FE -->|"DNS queries (domains only)"| CF
    FE -.->|"fallback"| GD
    CS -->|"chrome.runtime.sendMessage()"| BG
    BG -->|"chrome.storage.local"| BG
    PJ -->|"chrome.runtime.sendMessage()"| BG
    CS -->|"fetch(model_unified.json)"| MODEL
    BG -->|"fetch(url, credentials:omit)"| WEB

    %% AI flow (features-only, no email content)
    BG -->|"features-only JSON"| OAI
    BG -.->|"features-only JSON"| ANT
    BG -.->|"features-only JSON"| GEM
    BG -.->|"features-only JSON"| AZ
    BG -.->|"features-only JSON"| CUS

    %% Offline training
    TP -->|"reads"| DS
    TP -->|"exports calibrated JSON"| MODEL

    style CS fill:#1a5276,color:#fff
    style FE fill:#1a6e5f,color:#fff
    style BG fill:#6e3a1a,color:#fff
    style PJ fill:#4a1a6e,color:#fff
    style TP fill:#5a5a5a,color:#fff
    style OAI fill:#74aa9c,color:#fff
    style ANT fill:#d4a574,color:#fff
    style GEM fill:#4285f4,color:#fff
```

---

## Component Communication Diagram

```mermaid
graph LR
    subgraph Gmail Tab
        CS[content.js]
        FE[featureExtractor.js]
    end

    subgraph Service Worker
        BG[background.js]
    end

    subgraph Popup Window
        PJ[popup.js]
    end

    subgraph Storage
        ST[(chrome.storage.local)]
    end

    subgraph AI Providers
        AI[OpenAI / Anthropic / Google / Azure / Custom]
    end

    CS -- "saveScanResult" --> BG
    CS -- "requestPermissions" --> BG
    CS -- "fetchPageHTML" --> BG
    CS -- "runAiAnalysis (features-only)" --> BG
    PJ -- "getFishCollection" --> BG
    PJ -- "clearHistory" --> BG
    PJ -- "getFishStats" --> BG
    BG -- "read/write" --> ST
    BG -- "API call (features-only JSON)" --> AI
    CS -- "uses" --> FE

    style ST fill:#2c3e50,color:#fff
    style AI fill:#74aa9c,color:#fff
```

---

## Class Diagram

```mermaid
classDiagram
    class FeatureExtractor {
        -Set~string~ suspiciousTLDs
        -Set~string~ shortenerDomains
        -string[] urgencyKeywords
        -string[] credentialKeywords
        -string[] financialKeywords
        -string[] authorityKeywords
        -Set~string~ riskyExtensions
        +extractURLFeatures(url) Object
        +extractEmailFeatures(emailData) Object
        +aggregateURLFeatures(links) Object
        +countLinkMismatches(links) number
        +calculateLinkMismatchRatio(links) number
        +detectHeaderMismatch(displayName, domain) number
        +countSensitiveWords(text) number
        +calculateUrgencyScore(text) number
        +calculateCredentialRequestScore(text) number
        +calculateFinancialRequestScore(text) number
        +calculateAuthorityImpersonationScore(text) number
        +detectPhoneCallbackPattern(text) number
        +detectReplyToMismatch(replyTo, senderDomain) number
        +hasRiskyAttachmentExtension(attachments) number
        +hasDoubleExtension(attachments) number
        +calculateAttachmentNameEntropy(attachments) number
        +extractDomain(input) string
        +isIPAddress(hostname) boolean
        +hasSuspiciousTLD(hostname) boolean
        +isShortenerDomain(hostname) boolean
        +checkDomainInSubdomains(hostname) boolean
        +checkDomainInPaths(hostname, pathname) boolean
        +getDefaultURLFeatures() Object
        +buildUnifiedVector(features, dns, page, flags) number[]
    }

    class DnsChecker {
        -Map cache
        -number CACHE_TTL
        -number TIMEOUT
        +checkDomain(domain) Promise~Object~
        +checkDomains(domains) Promise~Object~
        +dnsQuery(domain, type) Promise~Object~
        +isRandomString(domain) boolean
        +shannonEntropy(str) number
        +defaultFeatures() Object
    }

    class PageAnalyzer {
        -string[] brandNames
        +extractFeatures(doc, pageUrl) Object
        +detectInsecureForms(doc) number
        +detectRelativeFormAction(doc) number
        +detectExtFormAction(doc, pageDomain) number
        +detectAbnormalFormAction(doc) number
        +detectSubmitToEmail(doc) number
        +calcPctExtHyperlinks(doc, pageDomain) number
        +calcPctExtResourceUrls(doc, pageDomain) number
        +detectExtFavicon(doc, pageDomain) number
        +calcPctNullSelfRedirect(doc, pageUrl) number
        +detectIframeOrFrame(doc) number
        +detectMissingTitle(doc) number
        +detectImagesOnlyInForm(doc) number
        +detectEmbeddedBrand(doc, pageDomain) number
        +defaultFeatures() Object
    }

    class FishEntity {
        +string type
        +number w
        +number h
        +number id
        +number x
        +number y
        +number vx
        +number vy
        +number scale
        +number currentScaleX
        +number targetScaleX
        +number courseTimer
        +HTMLElement el
        +update(dt) void
        +destroy() void
        -_randomizeAnimations() void
        -_schedulePuff() void
    }

    FeatureExtractor -- DnsChecker : "used together in content.js"
    FeatureExtractor -- PageAnalyzer : "used together in content.js"
```

---

## Email Scan Sequence Diagram (Unified Model + AI Enhancement)

```mermaid
sequenceDiagram
    participant User
    participant Gmail as Gmail DOM
    participant CS as content.js
    participant FE as FeatureExtractor
    participant DNS as DnsChecker
    participant ML as Unified Model<br/>(model_unified.json)
    participant BG as background.js
    participant Store as chrome.storage
    participant AI as AI Provider<br/>(BYOK)

    User->>Gmail: Opens email
    Gmail-->>CS: URL change / DOM mutation detected
    CS->>CS: checkEmailView()
    CS->>CS: showLoadingBadge()
    CS->>Gmail: extractEmailData() (DOM queries)
    Gmail-->>CS: { senderEmail, links, text, attachments }

    CS->>FE: extractEmailFeatures(emailData)
    Note over FE: 25 URL/email + 9 custom rules<br/>+ 5 BEC/linkless + 5 attachment features
    FE-->>CS: 44 email-level features

    opt Enhanced Scanning enabled (Tier 2)
        CS->>DNS: checkDomains([sender, link domains])
        DNS->>DNS: Cloudflare DoH (A + MX records)
        DNS-->>CS: 5 DNS features
    end

    CS->>FE: buildUnifiedVector(features, dns, null, flags)
    Note over FE: 64-element vector<br/>dns_ran + deep_scan_ran flags<br/>default-fill missing groups with 0
    FE-->>CS: 64-element feature vector

    CS->>ML: predictWithCalibratedForest(vector)
    Note over ML: Z-score normalize → 200 trees<br/>→ soft-vote probability<br/>→ isotonic calibration lookup
    ML-->>CS: calibratedProb (0.0 – 1.0)

    CS->>CS: riskScore = round(100 × calibratedProb)
    CS->>CS: confidence = |prob - 0.5| × 2
    CS->>CS: Post-model: BEC boosts + trusted domain dampening + newsletter detection
    Note over CS: 500+ built-in + user custom domains<br/>BEC floor 70-80 · Trusted cap 30 · Newsletter cap 45
    CS->>CS: deriveReasons(features, dns, null, prob)

    CS->>Gmail: updateRiskBadge(riskLevel, score, fishData)
    CS->>Gmail: Update side panel (score, reasons, links)
    CS->>CS: showFishCaughtAnimation()

    CS->>BG: sendMessage("saveScanResult", { score, fishType, ... })
    BG->>Store: Update scanHistory, fishCollection, recentCatches
    Store-->>BG: success
    BG-->>CS: { fishCollection, flaggedCount }

    opt AI Enhancement enabled (BYOK)
        CS->>CS: shouldCallAi() — gating check
        Note over CS: Call if: score 30-80, low confidence,<br/>risky attachment, reply-to mismatch
        alt AI needed
            CS->>CS: buildAiPayload(features, dns, null, result)
            Note over CS: Features-only JSON<br/>No body, subject, or sender address
            CS->>BG: sendMessage("runAiAnalysis", payload)
            BG->>AI: API call (features-only JSON + system prompt)
            Note over AI: Strict JSON schema output<br/>No tools/browsing/link visiting
            AI-->>BG: { aiRiskScore, riskTier, topSignals, ... }
            BG->>BG: validateAiResponse(result)
            BG-->>CS: { success, result }
            CS->>Gmail: Display AI score + agreement badge
        else AI not needed
            CS->>Gmail: Show "AI not needed (high confidence)"
        end
    end
```

---

## Deep Scan Sequence Diagram (Tier 3)

```mermaid
sequenceDiagram
    participant User
    participant CS as content.js
    participant BG as background.js
    participant Web as External Page
    participant PA as PageAnalyzer
    participant FE as FeatureExtractor
    participant ML as Unified Model
    participant AI as AI Provider<br/>(BYOK)

    User->>CS: Clicks "Deep Scan Links"
    CS->>User: confirm() security warning
    User-->>CS: OK

    CS->>BG: sendMessage("requestPermissions")
    Note over BG: Validates sender.tab.url<br/>Hardcoded origins
    BG->>BG: chrome.permissions.request()
    BG-->>CS: { granted: true }

    CS->>CS: Collect unique link URLs (http/https only)

    loop For each link (max 10)
        CS->>BG: sendMessage("fetchPageHTML", { url })
        Note over BG: Guard 0: sender validation<br/>Guard 1: URL scheme whitelist<br/>Guard 2: credentials: omit<br/>Guard 3: content-type check<br/>Guard 4: redirect validation<br/>Guard 5: 2MB size cap
        BG->>Web: fetch(url, { credentials: omit })
        Web-->>BG: HTML response
        BG-->>CS: { success: true, html }
        CS->>CS: DOMParser.parseFromString(html)
        Note over CS: DOM node limit: 50,000
        CS->>PA: extractFeatures(doc, url)
        PA-->>CS: 13 page features
    end

    CS->>CS: aggregatePageFeatures() (worst-case)
    CS->>FE: buildUnifiedVector(features, dns, pageFeatures, flags)
    Note over FE: Same 64-element vector<br/>deep_scan_ran = 1
    FE-->>CS: 64-element vector (with page features)
    CS->>ML: predictWithCalibratedForest(vector)
    ML-->>CS: calibratedProb (updated)
    CS->>CS: riskScore = round(100 × calibratedProb)
    CS->>CS: showDeepScanResult(newPrediction, pageFeatures)

    opt AI Enhancement enabled
        CS->>CS: runAiAnalysis(features, dns, pageFeatures, prediction)
        Note over CS: Re-runs AI with deep scan data
        CS->>BG: sendMessage("runAiAnalysis", updatedPayload)
        BG->>AI: features-only JSON (with deep scan signals)
        AI-->>BG: Updated AI assessment
        BG-->>CS: { success, result }
        CS->>CS: displayAiResult() + agreement badge
    end
```

---

## Report Phish Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant CS as content.js
    participant BG as background.js
    participant Store as chrome.storage

    User->>CS: Clicks "Report Phish"
    CS->>CS: showReportDialog()
    CS->>User: Modal: Low / Medium / High / Dangerous
    User->>CS: Selects "High"

    CS->>CS: handleReport("high")
    Note over CS: Maps to: riskScore=82,<br/>fishType=phishy
    CS->>CS: updateRiskBadge("High", 82, phishyFish)
    CS->>CS: Update side panel score + reasons
    CS->>CS: showFishCaughtAnimation()

    CS->>BG: sendMessage("saveScanResult", { reported: true, ... })
    BG->>Store: Update fishCollection, recentCatches
    Store-->>BG: success
    BG-->>CS: { fishCollection }
    CS->>CS: Disable report button ("Reported")
```

---

## Risk Scoring Pipeline (Unified Calibrated Model)

```mermaid
flowchart LR
    subgraph "Feature Extraction"
        A1[25 URL/Email Features] --> V
        A2[9 Custom Rule Features] --> V
        A3[5 DNS Features<br/>or defaults if not ran] --> V
        A4[13 Deep Scan Features<br/>or defaults if not ran] --> V
        A5[5 BEC/Linkless Features] --> V
        A6[5 Attachment Features] --> V
        A7[2 Context Flags<br/>dns_ran · deep_scan_ran] --> V
        V[buildUnifiedVector<br/>64-element array]
    end

    subgraph "Unified ML Model"
        V --> Z[Z-Score Normalisation]
        Z --> T[200 Decision Trees]
        T --> S["Soft Vote<br/>(avg leaf probability)"]
        S --> C["Isotonic Calibration<br/>(lookup table interpolation)"]
        C --> P["calibratedProb<br/>(0.0 – 1.0)"]
    end

    subgraph "Score Derivation"
        P --> R["riskScore = round(100 × prob)"]
        P --> CONF["confidence = |prob - 0.5| × 2"]
        R --> REASONS["deriveReasons()<br/>informational only"]
    end

    subgraph postModel ["Post-Model Intelligence"]
        R --> PMI{"Post-Model<br/>Adjustments"}
        PMI -->|"BEC/Attach signals"| BOOST["Rule Boosts<br/>Floor 70-80"]
        PMI -->|"Trusted corporate domain"| DAMP["Trusted Dampening<br/>Cap at 30"]
        PMI -->|"Free email provider"| NOFREE["No Dampening<br/>gmail, outlook, etc."]
        PMI -->|"Newsletter detected"| NLTR["Newsletter Cap<br/>Cap at 45"]
        PMI -->|"No special signals"| PASS["Pass through"]
        BOOST --> FINAL["Final Risk Score"]
        DAMP --> FINAL
        NOFREE --> FINAL
        NLTR --> FINAL
        PASS --> FINAL
    end

    R --> U{"Score Range"}
    U -->|"0-49"| F1["🐟 Friendly Fish<br/>Low Risk"]
    U -->|"50-75"| F2["🐠 Suspicious Fish<br/>Medium Risk"]
    U -->|"76-89"| F3["🐡 Phishy Puffer<br/>High Risk"]
    U -->|"90-100"| F4["🦈 Mega Phish Shark<br/>Dangerous"]

    subgraph "Optional: AI Enhancement"
        R --> GATE{"shouldCallAi()?"}
        GATE -->|"Yes"| BUILD["buildAiPayload()<br/>features-only JSON"]
        GATE -->|"No"| SKIP["Skip AI<br/>(high confidence)"]
        BUILD --> APICALL["AI Provider<br/>(BYOK)"]
        APICALL --> VALIDATE["validateAiResponse()"]
        VALIDATE --> DISPLAY["Display AI Score<br/>+ Agreement Badge"]
    end

    style V fill:#1a6e5f,color:#fff
    style C fill:#1a5276,color:#fff
    style R fill:#5c1a6e,color:#fff
    style APICALL fill:#74aa9c,color:#fff
```

---

## AI Enhancement Flow (BYOK)

```mermaid
flowchart TB
    subgraph "User Configuration"
        TOGGLE[Enhance with AI Toggle<br/>popup.html settings]
        MODAL[Configure AI Modal<br/>Provider + API Key]
        STORE[(chrome.storage.local<br/>aiProvider, aiApiKey<br/>NEVER synced)]
    end

    subgraph "Gating Logic (shouldCallAi)"
        CHECK{Call AI?}
        C1[Score 30-80?]
        C2[Confidence < 0.6?]
        C3[Deep scan found form/password?]
        C4[Risky attachment?]
        C5[Reply-to mismatch?]
        C1 --> CHECK
        C2 --> CHECK
        C3 --> CHECK
        C4 --> CHECK
        C5 --> CHECK
    end

    subgraph "Payload (features-only)"
        PAY[buildAiPayload]
        PAY1[email_signals<br/>reply_to_mismatch, from_domain]
        PAY2[url_signals<br/>link_count, domains, shortener, entropy]
        PAY3[language_cues<br/>urgency, credential, financial, callback]
        PAY4[attachment_signals<br/>has_attachment, risky_ext, double_ext]
        PAY5[dns_signals<br/>resolves, mx_present]
        PAY6[deep_scan_signals<br/>form, password, off-domain]
        PAY7[local_model<br/>risk_score, confidence, top_reasons]
        PAY --> PAY1
        PAY --> PAY2
        PAY --> PAY3
        PAY --> PAY4
        PAY --> PAY5
        PAY --> PAY6
        PAY --> PAY7
    end

    subgraph "Provider Adapters (background.js)"
        ROUTE{Provider Router}
        P1[callOpenAI]
        P2[callAnthropic]
        P3[callGoogle]
        P4[callAzureOpenAI]
        P5[callCustom]
    end

    subgraph "Response Validation"
        SCHEMA["Strict JSON Schema<br/>aiRiskScore, riskTier,<br/>phishType, topSignals,<br/>confidence, notes"]
        VALID{Valid?}
        OK[Display AI Result]
        FAIL[Show 'AI unavailable']
    end

    TOGGLE --> STORE
    MODAL --> STORE
    CHECK -->|"Yes"| PAY
    CHECK -->|"No"| SKIP2[Show 'AI not needed']
    PAY --> ROUTE
    ROUTE --> P1
    ROUTE --> P2
    ROUTE --> P3
    ROUTE --> P4
    ROUTE --> P5
    P1 --> SCHEMA
    P2 --> SCHEMA
    P3 --> SCHEMA
    P4 --> SCHEMA
    P5 --> SCHEMA
    SCHEMA --> VALID
    VALID -->|"Yes"| OK
    VALID -->|"No"| FAIL

    style PAY fill:#1a6e5f,color:#fff
    style ROUTE fill:#6e3a1a,color:#fff
    style SCHEMA fill:#1a5276,color:#fff
```

---

## Data Storage Schema

```mermaid
erDiagram
    CHROME_STORAGE {
        array scanHistory "Full scan records"
        int flaggedCount "Emails scored >= 76"
        int totalScanned "Total emails scanned"
        object fishCollection "{ friendly, suspicious, phishy, shark }"
        array recentCatches "Last 100 catch records"
        boolean enhancedScanning "Tier 2 DNS toggle"
        boolean aiEnhanceEnabled "AI Enhancement toggle"
        string aiProvider "openai / anthropic / google / azure / custom"
        string aiApiKey "User API key (local only, never synced)"
        string aiEndpointUrl "Custom/Azure endpoint URL"
        string aiModelName "Override model name"
        array customTrustedDomains "User-added trusted domains"
        array customBlockedDomains "User-blocked domains (overrides built-in)"
    }

    SCAN_RESULT {
        string messageId "Gmail message ID"
        string senderDomain "e.g. example.com"
        string senderDisplayName "Sender display name"
        int riskScore "0-100"
        string riskLevel "Low/Medium/High/Dangerous"
        array reasons "Human-readable risk indicators"
        int linkCount "Number of links in email"
        string fishType "friendly/suspicious/phishy/shark"
        boolean reported "true if user-reported"
        int timestamp "Unix timestamp ms"
    }

    CATCH_RECORD {
        string messageId
        string senderDomain
        string senderDisplayName
        int riskScore
        string fishType
        int timestamp
    }

    CHROME_STORAGE ||--o{ SCAN_RESULT : "scanHistory contains"
    CHROME_STORAGE ||--o{ CATCH_RECORD : "recentCatches contains"
```

---

## File Dependency Graph

```mermaid
graph TD
    MF[manifest.json] -->|"registers"| CS[content.js]
    MF -->|"registers"| FE[featureExtractor.js]
    MF -->|"registers"| CSS[content.css]
    MF -->|"registers"| BG[background.js]
    MF -->|"registers"| PH[popup.html]

    CS -->|"imports classes"| FE
    CS -->|"styled by"| CSS
    CS -->|"messages"| BG
    CS -->|"loads"| MU[model/model_unified.json]
    CS -->|"loads"| BANNER[Assets/Banner.png]

    PH -->|"scripts"| PJ[popup.js]
    PH -->|"loads"| LOGO[Assets/logomini.png]
    PJ -->|"messages"| BG

    BG -->|"reads/writes"| ST[(chrome.storage.local)]
    BG -->|"AI API calls"| AI[AI Providers]

    TP[train_model.py] -->|"reads"| DS[Phishing_Dataset/CSV]
    TP -->|"generates"| MU

    style MF fill:#2c3e50,color:#fff
    style TP fill:#5a5a5a,color:#fff
    style ST fill:#1a3c5e,color:#fff
    style AI fill:#74aa9c,color:#fff
```

---

## Unified Feature Schema (64 Features)

| Group | Count | Features |
|-------|-------|----------|
| URL/Email Lexical | 25 | NumDots, SubdomainLevel, PathLevel, UrlLength, NumDash, NumDashInHostname, AtSymbol, NumUnderscore, NumPercent, NumQueryComponents, NumAmpersand, NumHash, NumNumericChars, NoHttps, IpAddress, HostnameLength, PathLength, QueryLength, DoubleSlashInPath, NumLinks, AvgPathEntropy, HasShortenedUrl, NumSensitiveWords, Punycode, LinkMismatchRatio |
| Custom Rules → Model Inputs | 9 | SuspiciousTLD, HeaderMismatch, UrgencyScore, CredentialPhishingScore, SecrecyLanguageScore, HasShortenedUrl, BrandInSubdomain, BrandInPath, MultipleAtSigns |
| DNS | 5 | DomainExists, MXRecordCount, ARecordCount, RandomStringDomain, HasMXRecord |
| Deep Scan Page | 13 | InsecureForms, RelativeFormAction, ExtFormAction, AbnormalFormAction, SubmitInfoToEmail, PctExtHyperlinks, PctExtResourceUrls, ExtFavicon, PctNullSelfRedirectHyperlinks, IframeOrEmbed, MissingTitle, ImagesOnlyInForm, EmbeddedBrandName |
| BEC / Linkless | 5 | FinancialRequestScore, AuthorityImpersonationScore, PhoneCallbackPattern, ReplyToMismatch, IsLinkless |
| Attachment | 5 | HasAttachment, AttachmentCount, RiskyAttachmentExtension, DoubleExtensionFlag, AttachmentNameEntropy |
| Context Flags | 2 | dns_ran, deep_scan_ran |

**Total: 64 features**
