# Feature Mapping Documentation

This document maps the 64 features in the unified model to their extraction sources, descriptions, and positions in the unified vector.

## Unified Feature Schema (64 Features)

The extension uses a single Random Forest model trained on 64 features, organized into 7 groups. Features that are unavailable at scan time (e.g., DNS or Deep Scan not run) are default-filled with 0 and flagged via context flags.

---

## Group 1: URL/Email Lexical Features (25)

These features are extracted from links found in the email body and aggregated across all URLs.

| # | Feature | Description | Source |
|---|---------|-------------|--------|
| 1 | `NumDots` | Number of dots (.) in URL | URL parsing |
| 2 | `SubdomainLevel` | Number of subdomain levels | URL parsing |
| 3 | `PathLevel` | Number of path levels (/) | URL parsing |
| 4 | `UrlLength` | Total URL length | URL parsing |
| 5 | `NumDash` | Number of dashes (-) in URL | URL parsing |
| 6 | `NumDashInHostname` | Number of dashes in hostname | URL parsing |
| 7 | `AtSymbol` | Presence of @ symbol (0/1) | URL parsing |
| 8 | `NumUnderscore` | Number of underscores (_) | URL parsing |
| 9 | `NumPercent` | Number of percent signs (%) | URL parsing |
| 10 | `NumQueryComponents` | Number of query parameters | URL parsing |
| 11 | `NumAmpersand` | Number of ampersands (&) | URL parsing |
| 12 | `NumHash` | Number of hash symbols (#) | URL parsing |
| 13 | `NumNumericChars` | Number of numeric characters | URL parsing |
| 14 | `NoHttps` | Missing HTTPS (0/1) | URL parsing |
| 15 | `IpAddress` | IP address in URL (0/1) | URL parsing |
| 16 | `HostnameLength` | Length of hostname | URL parsing |
| 17 | `PathLength` | Length of path | URL parsing |
| 18 | `QueryLength` | Length of query string | URL parsing |
| 19 | `DoubleSlashInPath` | Double slash in path (0/1) | URL parsing |
| 20 | `NumLinks` | Total number of links in email | Email DOM |
| 21 | `AvgPathEntropy` | Average Shannon entropy of URL paths | URL parsing |
| 22 | `HasShortenedUrl` | URL shortener detected (0/1) | Domain list |
| 23 | `NumSensitiveWords` | Count of sensitive keywords | Text analysis |
| 24 | `Punycode` | Punycode encoding detected (0/1) | URL parsing |
| 25 | `LinkMismatchRatio` | Ratio of mismatched anchor text to URL domain | Link analysis |

---

## Group 2: Custom Rules Promoted to Model Inputs (9)

These were formerly post-hoc rule-based adjustments, now promoted to direct model features.

| # | Feature | Description | Source |
|---|---------|-------------|--------|
| 26 | `SuspiciousTLD` | Suspicious TLD detected (0/1) | TLD list |
| 27 | `HeaderMismatch` | Display name doesn't match sender domain (0/1) | Email header |
| 28 | `UrgencyScore` | Urgency keyword density | Text analysis |
| 29 | `CredentialPhishingScore` | Credential request keyword density | Text analysis |
| 30 | `SecrecyLanguageScore` | Secrecy/privacy language density | Text analysis |
| 31 | `HasShortenedUrl` | URL shortener present (0/1) | Domain list |
| 32 | `BrandInSubdomain` | Known brand name found in subdomain (0/1) | Domain analysis |
| 33 | `BrandInPath` | Known brand name found in URL path (0/1) | URL analysis |
| 34 | `MultipleAtSigns` | Multiple @ symbols in URL (0/1) | URL parsing |

---

## Group 3: DNS Features (5)

Populated when Enhanced Scanning (Tier 2) is enabled. Default-filled with 0 when DNS has not run.

| # | Feature | Description | Source |
|---|---------|-------------|--------|
| 35 | `DomainExists` | Sender domain resolves (0/1) | Cloudflare DoH |
| 36 | `MXRecordCount` | Number of MX records | Cloudflare DoH |
| 37 | `ARecordCount` | Number of A records | Cloudflare DoH |
| 38 | `RandomStringDomain` | Domain appears randomly generated (entropy) | Shannon entropy |
| 39 | `HasMXRecord` | MX records present (0/1) | Cloudflare DoH |

---

## Group 4: Deep Scan Page Features (13)

Populated when user triggers Deep Scan (Tier 3). Default-filled with 0 when Deep Scan has not run.

| # | Feature | Description | Source |
|---|---------|-------------|--------|
| 40 | `InsecureForms` | Forms with insecure action URLs | Page DOM |
| 41 | `RelativeFormAction` | Forms with relative action (ambiguous target) | Page DOM |
| 42 | `ExtFormAction` | Forms submitting to external domains | Page DOM |
| 43 | `AbnormalFormAction` | Forms with empty/# action | Page DOM |
| 44 | `SubmitInfoToEmail` | Forms submitting via mailto: | Page DOM |
| 45 | `PctExtHyperlinks` | Percentage of external hyperlinks | Page DOM |
| 46 | `PctExtResourceUrls` | Percentage of external resources | Page DOM |
| 47 | `ExtFavicon` | Favicon loaded from external domain | Page DOM |
| 48 | `PctNullSelfRedirectHyperlinks` | Percentage of null/self redirect links | Page DOM |
| 49 | `IframeOrEmbed` | Hidden iframes/embeds detected | Page DOM |
| 50 | `MissingTitle` | Page has no title tag | Page DOM |
| 51 | `ImagesOnlyInForm` | Forms contain only images (no text inputs) | Page DOM |
| 52 | `EmbeddedBrandName` | Known brand name found in page content | Page DOM |

---

## Group 5: BEC / Linkless Features (5)

Detect business email compromise and linkless phishing patterns.

| # | Feature | Description | Source |
|---|---------|-------------|--------|
| 53 | `FinancialRequestScore` | Financial keywords (wire, invoice, payment, etc.) | Text analysis |
| 54 | `AuthorityImpersonationScore` | Authority keywords (ceo, payroll, director, etc.) | Text analysis |
| 55 | `PhoneCallbackPattern` | "Call" + phone number pattern detected (0/1) | Regex pattern |
| 56 | `ReplyToMismatch` | Reply-to domain differs from sender domain (0/1) | Email header |
| 57 | `IsLinkless` | Email contains zero links (0/1) | Email DOM |

---

## Group 6: Attachment Features (5)

Detect attachment-based phishing vectors.

| # | Feature | Description | Source |
|---|---------|-------------|--------|
| 58 | `HasAttachment` | Email has attachments (0/1) | Email DOM |
| 59 | `AttachmentCount` | Number of attachments | Email DOM |
| 60 | `RiskyAttachmentExtension` | Risky file extension present (.exe, .scr, etc.) | Extension list |
| 61 | `DoubleExtensionFlag` | Double extension detected (e.g., .pdf.exe) (0/1) | Filename analysis |
| 62 | `AttachmentNameEntropy` | Shannon entropy of attachment filenames | Entropy calculation |

---

## Group 7: Context Flags (2)

Tell the model which optional scan tiers have run.

| # | Feature | Description | Values |
|---|---------|-------------|--------|
| 63 | `dns_ran` | Whether DNS checks were performed | 0 = no, 1 = yes |
| 64 | `deep_scan_ran` | Whether Deep Scan was performed | 0 = no, 1 = yes |

---

## Feature Extraction Process

1. **Email Detection**: Content script detects email open via URL change / DOM mutation
2. **DOM Extraction**: Extracts sender info, links, text content, attachments from Gmail DOM
3. **URL Analysis**: For each link, extracts URL lexical features (Group 1)
4. **Aggregation**: Aggregates URL features across all links (averages/max)
5. **Custom Rule Features**: Computes TLD, header mismatch, urgency, credential scores (Group 2)
6. **BEC Detection**: Scans text for financial, authority, callback patterns (Group 5)
7. **Attachment Analysis**: Checks extensions, double extensions, filename entropy (Group 6)
8. **DNS Checks** (if enabled): Queries Cloudflare DoH for domain validation (Group 3)
9. **Deep Scan** (if triggered): Fetches/parses linked page HTML for structure analysis (Group 4)
10. **Vector Assembly**: `buildUnifiedVector(features, dns, page, flags)` creates the 64-element array
11. **Default Filling**: Missing groups filled with 0; context flags indicate availability
12. **Inference**: Z-score normalize -> 200-tree Random Forest -> isotonic calibration -> `round(100 x prob)`

## Model Input Format

The unified model expects a 64-element feature vector in the exact order listed above (positions 1-64). The `buildUnifiedVector()` function in `featureExtractor.js` constructs this vector, matching the `UNIFIED_FEATURES` list in `train_model.py`.

## Feature Normalization

Features are Z-score normalized using StandardScaler parameters (mean and scale arrays) saved during training and exported to `model_unified.json`. The same normalization is applied at inference time in `predictWithCalibratedForest()`.

## Calibration

After normalization and tree traversal, the raw soft-vote probability is mapped through an isotonic calibration lookup table (also stored in `model_unified.json`). This ensures the final probability is well-calibrated and the resulting 0-100 score is stable and meaningful.

## AI Payload Mapping

When AI Enhancement is active, the features are also packaged into a human-readable JSON payload by `buildAiPayload()`:

| Payload Section | Features Included |
|----------------|-------------------|
| `email_signals` | reply_to_mismatch, from_domain, sender_seen_before |
| `url_signals` | link_count, link_domains, has_shortener, has_ip_url, punycode, suspicious_tld, entropy, mismatch |
| `language_cues` | urgency_score, credential_score, financial_request_score, callback_score, secrecy_score |
| `attachment_signals` | has_attachment, count, risky_ext, double_ext |
| `dns_signals` | dns_ran, domain_resolves, mx_present, a_record_count_bucket |
| `deep_scan_signals` | deep_scan_ran, has_form, has_password_input, form_action_off_domain, iframe_count, redirect_count |
| `local_model` | local_risk_score, local_confidence, top_local_reasons |

No email body, subject, or sender address is included in the AI payload.

## Limitations

- Some features rely on heuristic lists (suspicious TLD list, brand name list, risky extension list)
- Features are aggregated from multiple links, which may differ from single-URL dataset samples
- Text analysis is limited to visible content in Gmail UI
- Deep Scan features require user consent and optional host permissions
- BEC features use keyword matching rather than semantic understanding
- Attachment features depend on Gmail DOM visibility (some attachments may not be detected)
