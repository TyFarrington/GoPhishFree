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

---

## Mermaid Diagrams (Interactive)

*The diagrams below are Mermaid-formatted versions that render interactively on GitHub.*

## High-Level System Architecture

```mermaid
graph TB
    subgraph Chrome Extension
        subgraph "Content Scripts (Gmail Page)"
            CS[content.js<br/>Scanning & Inference Engine]
            FE[featureExtractor.js<br/>FeatureExtractor · DnsChecker · PageAnalyzer]
            CSS[content.css<br/>Badge & Panel Styles]
        end

        subgraph "Background Service Worker"
            BG[background.js<br/>Storage · Messaging · Fetch Proxy]
        end

        subgraph "Popup Dashboard"
            PH[popup.html<br/>Fish Tank Markup & CSS]
            PJ[popup.js<br/>Animation & Data Display]
        end

        subgraph "Static Assets"
            MODEL[model/<br/>model_trees.json<br/>model_deepscan.json]
            ASSETS[Assets/<br/>Logo.png · Banner.png]
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

    subgraph "Offline Training"
        TP[train_model.py<br/>scikit-learn Random Forest]
        DS[Phishing_Dataset/<br/>Kaggle CSV]
    end

    %% Runtime data flow
    CS -->|"extractEmailFeatures()"| FE
    FE -->|"DNS queries (domains only)"| CF
    FE -.->|"fallback"| GD
    CS -->|"chrome.runtime.sendMessage()"| BG
    BG -->|"chrome.storage.local"| BG
    PJ -->|"chrome.runtime.sendMessage()"| BG
    CS -->|"fetch(model_trees.json)"| MODEL
    BG -->|"fetch(url, credentials:omit)"| WEB

    %% Offline training
    TP -->|"reads"| DS
    TP -->|"exports JSON"| MODEL

    style CS fill:#1a5276,color:#fff
    style FE fill:#1a6e5f,color:#fff
    style BG fill:#6e3a1a,color:#fff
    style PJ fill:#4a1a6e,color:#fff
    style TP fill:#5a5a5a,color:#fff
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

    CS -- "saveScanResult" --> BG
    CS -- "requestPermissions" --> BG
    CS -- "fetchPageHTML" --> BG
    PJ -- "getFishCollection" --> BG
    PJ -- "clearHistory" --> BG
    PJ -- "getFishStats" --> BG
    BG -- "read/write" --> ST
    CS -- "uses" --> FE

    style ST fill:#2c3e50,color:#fff
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
        +extractURLFeatures(url) Object
        +extractEmailFeatures(emailData) Object
        +aggregateURLFeatures(links) Object
        +countLinkMismatches(links) number
        +calculateLinkMismatchRatio(links) number
        +detectHeaderMismatch(displayName, domain) number
        +countSensitiveWords(text) number
        +calculateUrgencyScore(text) number
        +calculateCredentialRequestScore(text) number
        +extractDomain(input) string
        +isIPAddress(hostname) boolean
        +hasSuspiciousTLD(hostname) boolean
        +isShortenerDomain(hostname) boolean
        +checkDomainInSubdomains(hostname) boolean
        +checkDomainInPaths(hostname, pathname) boolean
        +getDefaultURLFeatures() Object
        +mapToModelInput(features) number[]
        +getCustomFeatures(features) Object
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

## Email Scan Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Gmail as Gmail DOM
    participant CS as content.js
    participant FE as FeatureExtractor
    participant DNS as DnsChecker
    participant ML as ML Model (JSON)
    participant BG as background.js
    participant Store as chrome.storage

    User->>Gmail: Opens email
    Gmail-->>CS: URL change / DOM mutation detected
    CS->>CS: checkEmailView()
    CS->>CS: showLoadingBadge()
    CS->>Gmail: extractEmailData() (DOM queries)
    Gmail-->>CS: { senderEmail, links, text, attachments }

    CS->>FE: extractEmailFeatures(emailData)
    FE-->>CS: 25 ML features + 10 custom features

    opt Enhanced Scanning enabled (Tier 2)
        CS->>DNS: checkDomains([sender, link domains])
        DNS->>DNS: Cloudflare DoH (A + MX records)
        DNS-->>CS: { DomainExists, HasMXRecord, MultipleIPs, RandomStringDomain }
    end

    CS->>ML: predictWithForest(25 features)
    ML-->>CS: mlProbability (0.0 – 1.0)

    CS->>CS: computeCustomAdjustment(customFeatures)
    Note over CS: Tier S/A/B scoring + combo bonus
    CS->>CS: computeDnsAdjustment(dnsFeatures)
    CS->>CS: riskScore = mlScore + custom + dns

    CS->>Gmail: updateRiskBadge(riskLevel, score, fishData)
    CS->>Gmail: Update side panel (score, reasons, links)
    CS->>CS: showFishCaughtAnimation()

    CS->>BG: sendMessage("saveScanResult", { score, fishType, ... })
    BG->>Store: Update scanHistory, fishCollection, recentCatches
    Store-->>BG: success
    BG-->>CS: { fishCollection, flaggedCount }
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
    participant ML2 as Deep Scan Model

    User->>CS: Clicks "Deep Scan Links"
    CS->>User: confirm() security warning
    User-->>CS: OK

    CS->>BG: sendMessage("requestPermissions")
    Note over BG: Validates sender.tab.url<br/>Hardcoded origins
    BG->>BG: chrome.permissions.request()
    BG-->>CS: { granted: true }

    CS->>CS: loadDeepScanModel() (lazy load)
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
    CS->>CS: Build 38-element feature vector
    CS->>ML2: predictWithForestModel(38 features)
    ML2-->>CS: mlProbability
    CS->>CS: Recompute custom + DNS adjustments
    CS->>CS: showDeepScanResult(newPrediction)
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

## Risk Scoring Pipeline

```mermaid
flowchart LR
    subgraph "Stage 1: ML Model"
        A[25 Email Features] --> B[Z-Score Normalisation]
        B --> C[200 Decision Trees]
        C --> D["Soft Vote<br/>(avg leaf probability)"]
        D --> E["mlScore = prob × 80"]
    end

    subgraph "Stage 2: Custom Rules"
        F[10 Custom Features] --> G{Tier Classification}
        G -->|"Tier S"| H["Punycode +15<br/>Link Mismatch +14"]
        G -->|"Tier A"| I["Header Mismatch +10<br/>Credentials +5-15<br/>Shortener +8"]
        G -->|"Tier B"| J["Suspicious TLD +5<br/>Urgency +2-6"]
        H --> K[Combination Bonus]
        I --> K
        J --> K
        K -->|"2+ strong"| L["+8"]
        K -->|"3+ strong"| M["+15"]
    end

    subgraph "Stage 3: DNS (Tier 2)"
        N[4 DNS Features] --> O{Tier Classification}
        O -->|"Tier S"| P["No DNS +15"]
        O -->|"Tier A"| Q["Random Domain +10<br/>Unresolved +6"]
        O -->|"Tier B"| R["No MX +5"]
        O -->|"Safety"| S["Multiple IPs -3"]
    end

    E --> T["riskScore = clamp(0, 100,<br/>mlScore + custom + dns)"]
    K --> T
    O --> T

    T --> U{"Score Range"}
    U -->|"0-49"| V["🐟 Friendly Fish<br/>Low Risk"]
    U -->|"50-75"| W["🐠 Suspicious Fish<br/>Medium Risk"]
    U -->|"76-89"| X["🐡 Phishy Puffer<br/>High Risk"]
    U -->|"90-100"| Y["🦈 Mega Phish Shark<br/>Dangerous"]

    style E fill:#1a5276,color:#fff
    style K fill:#1a6e5f,color:#fff
    style O fill:#6e3a1a,color:#fff
    style T fill:#5c1a6e,color:#fff
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
    CS -->|"loads"| MT[model/model_trees.json]
    CS -->|"loads"| MD[model/model_deepscan.json]
    CS -->|"loads"| BANNER[Assets/Banner.png]

    PH -->|"scripts"| PJ[popup.js]
    PH -->|"loads"| LOGO[Assets/Logo.png]
    PJ -->|"messages"| BG

    BG -->|"reads/writes"| ST[(chrome.storage.local)]

    TP[train_model.py] -->|"reads"| DS[Phishing_Dataset/CSV]
    TP -->|"generates"| MT
    TP -->|"generates"| MD

    style MF fill:#2c3e50,color:#fff
    style TP fill:#5a5a5a,color:#fff
    style ST fill:#1a3c5e,color:#fff
```
