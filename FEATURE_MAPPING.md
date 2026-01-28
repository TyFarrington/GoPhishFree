# Feature Mapping Documentation

This document maps the features extracted locally from Gmail emails to the Kaggle phishing dataset features used for model training.

## Locally Extractable Features

### URL Lexical Features

These features are extracted from links found in the email body:

| Local Feature | Dataset Feature | Description |
|--------------|----------------|-------------|
| `NumDots` | `NumDots` | Number of dots (.) in URL |
| `SubdomainLevel` | `SubdomainLevel` | Number of subdomain levels |
| `PathLevel` | `PathLevel` | Number of path levels (/) |
| `UrlLength` | `UrlLength` | Total URL length |
| `NumDash` | `NumDash` | Number of dashes (-) in URL |
| `NumDashInHostname` | `NumDashInHostname` | Number of dashes in hostname |
| `AtSymbol` | `AtSymbol` | Presence of @ symbol (0/1) |
| `NumUnderscore` | `NumUnderscore` | Number of underscores (_) |
| `NumPercent` | `NumPercent` | Number of percent signs (%) |
| `NumQueryComponents` | `NumQueryComponents` | Number of query parameters |
| `NumAmpersand` | `NumAmpersand` | Number of ampersands (&) |
| `NumHash` | `NumHash` | Number of hash symbols (#) |
| `NumNumericChars` | `NumNumericChars` | Number of numeric characters |
| `NoHttps` | `NoHttps` | Missing HTTPS (0/1) |
| `IpAddress` | `IpAddress` | IP address in URL (0/1) |
| `HostnameLength` | `HostnameLength` | Length of hostname |
| `PathLength` | `PathLength` | Length of path |
| `QueryLength` | `QueryLength` | Length of query string |
| `DoubleSlashInPath` | `DoubleSlashInPath` | Double slash in path (0/1) |

### Additional Local Features

These features are computed from email content but may not directly map to dataset features:

| Local Feature | Dataset Equivalent | Description |
|--------------|-------------------|-------------|
| `SuspiciousTLD` | N/A (derived) | Suspicious TLD detection |
| `ShortenerDomain` | N/A (derived) | URL shortener detection |
| `Punycode` | N/A (derived) | Punycode encoding detection |
| `LinkMismatchCount` | `FrequentDomainNameMismatch` | Count of link mismatches |
| `LinkMismatchRatio` | Derived from above | Ratio of mismatched links |
| `HeaderMismatch` | N/A | Display name vs domain mismatch |
| `NumSensitiveWords` | `NumSensitiveWords` | Count of sensitive keywords |
| `UrgencyScore` | Derived from text | Urgency keyword count |
| `CredentialRequestScore` | Derived from text | Credential request keyword count |
| `LinkCount` | N/A | Total number of links |
| `AttachmentCount` | N/A | Number of attachments |

## Feature Extraction Process

1. **Email Detection**: Content script detects when email is opened in Gmail
2. **DOM Extraction**: Extracts sender info, links, text content from Gmail DOM
3. **URL Analysis**: For each link, extracts URL lexical features
4. **Aggregation**: Aggregates URL features (averages) for multiple links
5. **Text Analysis**: Scans email text for keywords and patterns
6. **Mismatch Detection**: Compares anchor text domains with href domains
7. **Feature Vector**: Combines all features into model input vector

## Model Input Format

The model expects a feature vector with the following order (30 features):

1. NumDots
2. SubdomainLevel
3. PathLevel
4. UrlLength
5. NumDash
6. NumDashInHostname
7. AtSymbol
8. NumUnderscore
9. NumPercent
10. NumQueryComponents
11. NumAmpersand
12. NumHash
13. NumNumericChars
14. NoHttps
15. IpAddress
16. HostnameLength
17. PathLength
18. QueryLength
19. DoubleSlashInPath
20. SuspiciousTLD
21. ShortenerDomain
22. Punycode
23. LinkMismatchCount
24. LinkMismatchRatio
25. HeaderMismatch
26. NumSensitiveWords
27. UrgencyScore
28. CredentialRequestScore
29. LinkCount
30. AttachmentCount

## Feature Normalization

Features are normalized using StandardScaler during training. For inference, the same scaling parameters are applied.

## Limitations

- Some dataset features (e.g., `PopUpWindow`, `RightClickDisabled`) require webpage analysis and cannot be extracted from email alone
- Features are aggregated from multiple links, which may differ from single-URL dataset samples
- Text analysis is limited to visible content in Gmail UI
- Some features rely on heuristics (e.g., suspicious TLD list) rather than exact dataset definitions
