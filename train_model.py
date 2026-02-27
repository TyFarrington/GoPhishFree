"""
@file train_model.py
@description Trains a unified Random Forest classifier on a 64-feature schema
             covering all analysis tiers (email lexical, DNS, deep scan,
             BEC/linkless, attachments) plus context flags. Features from
             tiers that have not run are default-filled with 0; the model
             learns to score emails with or without those tiers via the
             dns_ran / deep_scan_ran context flags. Output probabilities are
             calibrated via isotonic regression so that:
                 riskScore = round(100 * calibrated_probability)
             The trained model is exported as a JSON file containing tree
             structures, scaler parameters, and a calibration lookup table
             for direct in-browser inference by the Chrome extension.

@programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
@dateCreated 2025-02-01
@dateRevised 2026-02-14 - Sprint 2 - Added comprehensive comments and documentation (All programmers)

@preconditions Python 3.8+ with pandas, numpy, scikit-learn, and joblib installed.
               The Kaggle phishing dataset CSV must exist at the path
               'Phishing_Dataset/Phishing_Legitimate_full.csv' relative to
               the working directory. The CSV must contain columns matching
               the URL_EMAIL_FEATURES and DEEPSCAN_FEATURES lists, plus a
               'CLASS_LABEL' column (1 = phishing, 0 = legitimate).
@acceptableInput A well-formed CSV file with numeric feature columns and a
                 binary CLASS_LABEL column. No command-line arguments are
                 required; all configuration is embedded in the script.
@unacceptableInput Missing or corrupted CSV files; CSVs without the
                   CLASS_LABEL column; non-numeric feature values; CSV files
                   with zero rows.

@postconditions The 'model/' directory is created (if absent) and populated
                with: model_unified.json (tree structures + calibration for
                JS inference), feature_names.json (ordered 64-feature list),
                model_calibrated.pkl, model_rf.pkl, and scaler.pkl (sklearn
                artifacts for future retraining). Training metrics and
                per-type evaluation are printed to stdout.
@returnValues None (script entry point). Functions return DataFrames, trained
              model objects, and calibration arrays as documented below.

@errorConditions FileNotFoundError if the CSV path is invalid; ValueError if
                 CLASS_LABEL is missing; sklearn exceptions if the dataset is
                 too small for stratified splitting or cross-validation.
@sideEffects Creates files in the 'model/' directory. Removes __pycache__
             from the project root (Chrome rejects directories starting
             with underscore). Prints extensive training diagnostics to
             stdout.
@invariants The UNIFIED_FEATURES list always has exactly 64 entries. Feature
            order is fixed and must match featureExtractor.js's
            buildUnifiedVector(). Random seeds (42, 77) ensure reproducible
            training and synthetic data generation.
@knownFaults Synthetic BEC and attachment samples are generated with
             heuristic distributions rather than real-world data, which
             may not perfectly represent actual BEC or attachment-led
             phishing campaigns. The isotonic calibration lookup table
             uses 200 evenly spaced points and interpolation gaps may
             cause minor rounding differences at boundary values.
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
import os

# ======================================================================
# UNIFIED FEATURE SCHEMA (64 features)
#
# Defines the canonical ordering of all model input features. This
# ordering is contractual: featureExtractor.js buildUnifiedVector()
# must produce a vector with features in this exact order. When adding
# new features, always append to the end of the relevant group and
# update buildUnifiedVector() in featureExtractor.js to match.
#
# The 64 features are organised into 7 logical groups:
#   Group 1 — URL/Email Lexical   (25 features)
#   Group 2 — Custom Rule Signals (9 features)
#   Group 3 — DNS Indicators      (5 features)
#   Group 4 — Deep Scan Page      (13 features)
#   Group 5 — BEC / Linkless      (5 features)
#   Group 6 — Attachment Signals  (5 features)
#   Group 7 — Context Flags       (2 features)
# ======================================================================

# Group 1: URL/Email Lexical (25 features)
URL_EMAIL_FEATURES = [
    'NumDots', 'SubdomainLevel', 'PathLevel', 'UrlLength', 'NumDash',
    'NumDashInHostname', 'AtSymbol', 'TildeSymbol', 'NumUnderscore',
    'NumPercent', 'NumQueryComponents', 'NumAmpersand', 'NumHash',
    'NumNumericChars', 'NoHttps', 'IpAddress', 'DomainInSubdomains',
    'DomainInPaths', 'HttpsInHostname', 'HostnameLength', 'PathLength',
    'QueryLength', 'DoubleSlashInPath', 'NumSensitiveWords',
    'FrequentDomainNameMismatch'
]

# Group 2: Former custom rules promoted to model inputs (9 features)
CUSTOM_RULE_FEATURES = [
    'SuspiciousTLD', 'ShortenerDomain', 'Punycode',
    'LinkMismatchCount', 'LinkMismatchRatio', 'HeaderMismatch',
    'UrgencyScore', 'CredentialRequestScore', 'LinkCount'
]

# Group 3: DNS features (5 features)
DNS_FEATURES = [
    'DomainExists', 'HasMXRecord', 'MultipleIPs',
    'RandomStringDomain', 'UnresolvedDomains'
]

# Group 4: Deep Scan page features (13 features)
DEEPSCAN_FEATURES = [
    'InsecureForms', 'RelativeFormAction', 'ExtFormAction',
    'AbnormalFormAction', 'SubmitInfoToEmail',
    'PctExtHyperlinks', 'PctExtResourceUrls', 'ExtFavicon',
    'PctNullSelfRedirectHyperlinks',
    'IframeOrFrame', 'MissingTitle', 'ImagesOnlyInForm',
    'EmbeddedBrandName'
]

# Group 5: BEC / Linkless features (5 features)
BEC_FEATURES = [
    'FinancialRequestScore', 'AuthorityImpersonationScore',
    'PhoneCallbackPattern', 'ReplyToMismatch', 'IsLinkless'
]

# Group 6: Attachment features (5 features)
ATTACHMENT_FEATURES = [
    'HasAttachment', 'AttachmentCount', 'RiskyAttachmentExtension',
    'DoubleExtensionFlag', 'AttachmentNameEntropy'
]

# Group 7: Context flags (2 features)
CONTEXT_FLAGS = [
    'dns_ran', 'deep_scan_ran'
]

# Full ordered list (64 features)
UNIFIED_FEATURES = (
    URL_EMAIL_FEATURES +
    CUSTOM_RULE_FEATURES +
    DNS_FEATURES +
    DEEPSCAN_FEATURES +
    BEC_FEATURES +
    ATTACHMENT_FEATURES +
    CONTEXT_FLAGS
)

assert len(UNIFIED_FEATURES) == 64, f"Expected 64 features, got {len(UNIFIED_FEATURES)}"


# ======================================================================
# DATA PREPARATION
# Loads the raw CSV, maps available columns to the unified 64-feature
# schema, generates data augmentation variants (to teach the model to
# handle missing tiers), and synthesises BEC / attachment / legitimate
# newsletter samples to cover attack vectors absent from the URL-only
# Kaggle dataset.
# ======================================================================

def load_and_prepare_unified_data(csv_path):
    """
    Load the Kaggle phishing dataset and build a unified 64-feature DataFrame.

    Features available in the CSV are used directly. Features NOT in the
    CSV (BEC, attachment, DNS, custom rules) are default-filled with 0
    and the context flags are set appropriately.

    The dataset is augmented with three variants per sample to teach the
    model to score correctly with and without DNS / deep scan information:
        Variant A — base only        (dns_ran=0, deep_scan_ran=0)
        Variant B — base + sim. DNS  (dns_ran=1, deep_scan_ran=0)
        Variant C — full features    (dns_ran=1, deep_scan_ran=1)

    Additional synthetic samples for BEC phishing, attachment-led phishing,
    legitimate newsletters, and legitimate transactional emails are
    appended to improve coverage of non-URL attack vectors.

    @param csv_path: Filesystem path to the Kaggle CSV dataset.
    @type csv_path: str
    @returns: Tuple of (X, y) where X is a DataFrame with 64 feature
              columns and y is a Series of binary labels (1=phishing, 0=legit).
    @rtype: tuple[pd.DataFrame, pd.Series]
    """
    df = pd.read_csv(csv_path)
    y_raw = df['CLASS_LABEL']
    n = len(df)

    print(f"Raw dataset: {n} samples, Phishing={y_raw.sum()}, Legit={(y_raw == 0).sum()}")

    # Start building a DataFrame aligned to UNIFIED_FEATURES
    unified = pd.DataFrame(0.0, index=range(n), columns=UNIFIED_FEATURES)

    # ---- Group 1: URL/Email features (directly from CSV) ----
    for f in URL_EMAIL_FEATURES:
        if f in df.columns:
            unified[f] = df[f].fillna(0).values

    # ---- Group 2: Custom rules (derive from CSV where possible) ----
    # Some can be approximated from URL data in the CSV
    # SuspiciousTLD, ShortenerDomain, Punycode: not in CSV -> 0
    # LinkMismatchCount, LinkMismatchRatio, HeaderMismatch: not in CSV -> 0
    # UrgencyScore: approximate from NumSensitiveWords
    if 'NumSensitiveWords' in df.columns:
        unified['UrgencyScore'] = (df['NumSensitiveWords'].fillna(0) * 0.5).clip(0, 10)
        unified['CredentialRequestScore'] = (df['NumSensitiveWords'].fillna(0) * 0.3).clip(0, 5)
    # FrequentDomainNameMismatch -> LinkMismatchCount proxy
    if 'FrequentDomainNameMismatch' in df.columns:
        unified['LinkMismatchCount'] = df['FrequentDomainNameMismatch'].fillna(0).values
        unified['LinkMismatchRatio'] = df['FrequentDomainNameMismatch'].fillna(0).values * 0.3
    # LinkCount: approximate from URL features (if URL features are nonzero, assume at least 1 link)
    unified['LinkCount'] = (unified['UrlLength'] > 0).astype(float) * 3  # rough proxy

    # ---- Group 3: DNS features -> 0 for base variant ----
    # Will be populated in augmentation variants

    # ---- Group 4: Deep Scan features (directly from CSV) ----
    for f in DEEPSCAN_FEATURES:
        if f in df.columns:
            unified[f] = df[f].fillna(0).values

    # ---- Group 5: BEC features -> 0 (not available in URL dataset) ----
    # IsLinkless = 0 for all rows (URL dataset always has links)

    # ---- Group 6: Attachment features -> 0 ----
    # Not available in Kaggle URL dataset

    # ---- Group 7: Context flags ----
    # Base variant: nothing extra ran
    unified['dns_ran'] = 0.0
    unified['deep_scan_ran'] = 0.0

    # ==================== Data Augmentation ====================
    # Create three variants of each sample so the model learns to produce
    # accurate risk scores regardless of which analysis tiers have run.
    # This prevents the model from relying solely on deep-scan features
    # that may not be available in a Tier 1 or Tier 2 scan.

    # Variant A: base only (dns_ran=0, deep_scan_ran=0)
    # Deep scan features zeroed out so model learns without them
    variant_a = unified.copy()
    for f in DEEPSCAN_FEATURES:
        variant_a[f] = 0.0
    variant_a['dns_ran'] = 0.0
    variant_a['deep_scan_ran'] = 0.0

    # Variant B: base + simulated DNS (dns_ran=1, deep_scan_ran=0)
    variant_b = unified.copy()
    for f in DEEPSCAN_FEATURES:
        variant_b[f] = 0.0
    variant_b['dns_ran'] = 1.0
    variant_b['deep_scan_ran'] = 0.0
    # Simulate DNS features for phishing vs legit
    phish_mask = y_raw == 1
    legit_mask = y_raw == 0
    rng = np.random.RandomState(42)
    # Phishing: some domains don't resolve, are random strings
    variant_b.loc[phish_mask, 'DomainExists'] = rng.choice([0, 1], size=phish_mask.sum(), p=[0.3, 0.7])
    variant_b.loc[phish_mask, 'RandomStringDomain'] = rng.choice([0, 1], size=phish_mask.sum(), p=[0.6, 0.4])
    variant_b.loc[phish_mask, 'HasMXRecord'] = rng.choice([0, 1], size=phish_mask.sum(), p=[0.5, 0.5])
    variant_b.loc[phish_mask, 'MultipleIPs'] = rng.choice([0, 1], size=phish_mask.sum(), p=[0.8, 0.2])
    # Legitimate: domains almost always resolve, have MX, multiple IPs
    variant_b.loc[legit_mask, 'DomainExists'] = 1.0
    variant_b.loc[legit_mask, 'HasMXRecord'] = rng.choice([0, 1], size=legit_mask.sum(), p=[0.05, 0.95])
    variant_b.loc[legit_mask, 'MultipleIPs'] = rng.choice([0, 1], size=legit_mask.sum(), p=[0.3, 0.7])
    variant_b.loc[legit_mask, 'RandomStringDomain'] = 0.0

    # Variant C: full features (dns_ran=1, deep_scan_ran=1)
    variant_c = unified.copy()
    variant_c['dns_ran'] = 1.0
    variant_c['deep_scan_ran'] = 1.0
    # DNS features same as variant B
    variant_c['DomainExists'] = variant_b['DomainExists'].values
    variant_c['HasMXRecord'] = variant_b['HasMXRecord'].values
    variant_c['MultipleIPs'] = variant_b['MultipleIPs'].values
    variant_c['RandomStringDomain'] = variant_b['RandomStringDomain'].values

    # Combine URL-based variants
    X = pd.concat([variant_a, variant_b, variant_c], ignore_index=True)
    y = pd.concat([y_raw, y_raw, y_raw], ignore_index=True)

    print(f"\n  URL-based variants: 3 x {n} = {len(X)} samples")

    # ==================== Synthetic BEC / Attachment Phishing ====================
    # The Kaggle dataset only contains URL-based phishing. To make the model
    # effective against Business Email Compromise (BEC), attachment-led attacks,
    # and to reduce false positives on legitimate newsletters/transactional
    # emails, we generate synthetic samples with heuristic feature distributions.
    # Each synthetic group targets a specific gap in the original dataset.
    # ============================================================================

    rng2 = np.random.RandomState(77)

    # ---- BEC phishing (financial + authority + phone scams) ----
    n_bec = 2000
    bec_phish = pd.DataFrame(0.0, index=range(n_bec), columns=UNIFIED_FEATURES)

    # Minimal URL features (BEC emails often have 0-3 simple links)
    bec_phish['LinkCount'] = rng2.choice([0, 1, 2, 3], size=n_bec, p=[0.3, 0.35, 0.25, 0.1])
    bec_phish['IsLinkless'] = (bec_phish['LinkCount'] == 0).astype(float)
    # Where links exist, they're short legitimate-looking URLs
    has_links = bec_phish['LinkCount'] > 0
    bec_phish.loc[has_links, 'UrlLength'] = rng2.randint(20, 80, size=has_links.sum())
    bec_phish.loc[has_links, 'NumDots'] = rng2.randint(1, 4, size=has_links.sum())
    bec_phish.loc[has_links, 'HostnameLength'] = rng2.randint(8, 30, size=has_links.sum())

    # BEC signals (the key distinguishers)
    bec_phish['FinancialRequestScore'] = rng2.choice([1,2,3,4,5], size=n_bec, p=[0.15,0.25,0.3,0.2,0.1])
    bec_phish['AuthorityImpersonationScore'] = rng2.choice([0,1,2,3], size=n_bec, p=[0.2,0.3,0.3,0.2])
    bec_phish['UrgencyScore'] = rng2.choice([1,2,3,4,5], size=n_bec, p=[0.1,0.2,0.3,0.25,0.15])
    bec_phish['CredentialRequestScore'] = rng2.choice([0,1,2,3], size=n_bec, p=[0.4,0.3,0.2,0.1])
    bec_phish['PhoneCallbackPattern'] = rng2.choice([0, 1], size=n_bec, p=[0.4, 0.6])
    bec_phish['ReplyToMismatch'] = rng2.choice([0, 1], size=n_bec, p=[0.5, 0.5])
    bec_phish['HeaderMismatch'] = rng2.choice([0, 1], size=n_bec, p=[0.4, 0.6])
    bec_phish['NumSensitiveWords'] = rng2.randint(1, 8, size=n_bec)

    # DNS: BEC often uses real-looking domains or free email
    bec_phish['DomainExists'] = rng2.choice([0, 1], size=n_bec, p=[0.15, 0.85])
    bec_phish['HasMXRecord'] = rng2.choice([0, 1], size=n_bec, p=[0.3, 0.7])
    bec_phish['RandomStringDomain'] = rng2.choice([0, 1], size=n_bec, p=[0.7, 0.3])
    bec_phish['dns_ran'] = 1.0

    y_bec = pd.Series(np.ones(n_bec, dtype=int))  # all phishing
    print(f"  Synthetic BEC phishing: {n_bec} samples")

    # ---- Attachment-led phishing ----
    n_attach = 1000
    attach_phish = pd.DataFrame(0.0, index=range(n_attach), columns=UNIFIED_FEATURES)

    # Some links but the attack vector is the attachment
    attach_phish['LinkCount'] = rng2.choice([0, 1, 2], size=n_attach, p=[0.2, 0.5, 0.3])
    attach_phish['IsLinkless'] = (attach_phish['LinkCount'] == 0).astype(float)
    has_links_a = attach_phish['LinkCount'] > 0
    attach_phish.loc[has_links_a, 'UrlLength'] = rng2.randint(20, 60, size=has_links_a.sum())
    attach_phish.loc[has_links_a, 'NumDots'] = rng2.randint(1, 3, size=has_links_a.sum())

    # Attachment signals
    attach_phish['HasAttachment'] = 1.0
    attach_phish['AttachmentCount'] = rng2.choice([1, 2, 3], size=n_attach, p=[0.7, 0.2, 0.1])
    attach_phish['RiskyAttachmentExtension'] = rng2.choice([0, 1], size=n_attach, p=[0.3, 0.7])
    attach_phish['DoubleExtensionFlag'] = rng2.choice([0, 1], size=n_attach, p=[0.6, 0.4])
    attach_phish['AttachmentNameEntropy'] = rng2.uniform(2.5, 5.0, size=n_attach)

    # Supporting text signals
    attach_phish['UrgencyScore'] = rng2.choice([0,1,2,3], size=n_attach, p=[0.2,0.3,0.3,0.2])
    attach_phish['CredentialRequestScore'] = rng2.choice([0,1,2], size=n_attach, p=[0.5,0.3,0.2])
    attach_phish['FinancialRequestScore'] = rng2.choice([0,1,2], size=n_attach, p=[0.5,0.3,0.2])
    attach_phish['HeaderMismatch'] = rng2.choice([0, 1], size=n_attach, p=[0.5, 0.5])

    y_attach = pd.Series(np.ones(n_attach, dtype=int))  # all phishing
    print(f"  Synthetic attachment phishing: {n_attach} samples")

    # ---- Legitimate newsletters / notifications (reduce false positives) ----
    n_legit_news = 2000
    legit_news = pd.DataFrame(0.0, index=range(n_legit_news), columns=UNIFIED_FEATURES)

    # Newsletters have LOTS of links (tracking links, articles, ads)
    legit_news['LinkCount'] = rng2.randint(5, 40, size=n_legit_news)
    legit_news['UrlLength'] = rng2.randint(60, 300, size=n_legit_news)  # long tracking URLs
    legit_news['NumDots'] = rng2.randint(2, 8, size=n_legit_news)
    legit_news['SubdomainLevel'] = rng2.choice([0,1,2], size=n_legit_news, p=[0.3,0.5,0.2])
    legit_news['PathLevel'] = rng2.randint(2, 10, size=n_legit_news)
    legit_news['HostnameLength'] = rng2.randint(10, 40, size=n_legit_news)
    legit_news['PathLength'] = rng2.randint(20, 150, size=n_legit_news)
    legit_news['QueryLength'] = rng2.randint(0, 200, size=n_legit_news)
    legit_news['NumQueryComponents'] = rng2.randint(0, 10, size=n_legit_news)
    legit_news['NumAmpersand'] = rng2.randint(0, 8, size=n_legit_news)
    legit_news['NumNumericChars'] = rng2.randint(2, 40, size=n_legit_news)
    legit_news['NumDash'] = rng2.randint(0, 6, size=n_legit_news)
    legit_news['NumUnderscore'] = rng2.randint(0, 4, size=n_legit_news)
    legit_news['NumPercent'] = rng2.randint(0, 5, size=n_legit_news)
    # HTTP links common in newsletters (tracking pixels, old links)
    legit_news['NoHttps'] = rng2.choice([0, 1], size=n_legit_news, p=[0.5, 0.5])
    # Link mismatches from tracking redirects (legitimate)
    legit_news['FrequentDomainNameMismatch'] = rng2.choice([0, 1], size=n_legit_news, p=[0.4, 0.6])
    legit_news['LinkMismatchCount'] = rng2.choice([0,1,2,3], size=n_legit_news, p=[0.3,0.3,0.25,0.15])
    legit_news['LinkMismatchRatio'] = legit_news['LinkMismatchCount'] / legit_news['LinkCount'].clip(1)

    # NO BEC/phishing signals in legitimate newsletters
    legit_news['FinancialRequestScore'] = 0.0
    legit_news['AuthorityImpersonationScore'] = 0.0
    legit_news['PhoneCallbackPattern'] = 0.0
    legit_news['ReplyToMismatch'] = 0.0
    legit_news['HeaderMismatch'] = 0.0
    legit_news['UrgencyScore'] = rng2.choice([0, 1], size=n_legit_news, p=[0.8, 0.2])  # rare mild urgency
    legit_news['CredentialRequestScore'] = 0.0
    legit_news['RiskyAttachmentExtension'] = 0.0
    legit_news['DoubleExtensionFlag'] = 0.0
    legit_news['IsLinkless'] = 0.0

    # DNS: legitimate domains always resolve with MX
    legit_news['DomainExists'] = 1.0
    legit_news['HasMXRecord'] = 1.0
    legit_news['MultipleIPs'] = rng2.choice([0, 1], size=n_legit_news, p=[0.2, 0.8])
    legit_news['RandomStringDomain'] = 0.0
    legit_news['dns_ran'] = 1.0

    y_legit_news = pd.Series(np.zeros(n_legit_news, dtype=int))  # all legitimate
    print(f"  Synthetic legit newsletters: {n_legit_news} samples")

    # ---- Legitimate transactional emails (account confirmations, receipts) ----
    n_legit_txn = 1000
    legit_txn = pd.DataFrame(0.0, index=range(n_legit_txn), columns=UNIFIED_FEATURES)

    legit_txn['LinkCount'] = rng2.randint(1, 8, size=n_legit_txn)
    legit_txn['UrlLength'] = rng2.randint(30, 150, size=n_legit_txn)
    legit_txn['NumDots'] = rng2.randint(1, 5, size=n_legit_txn)
    legit_txn['PathLevel'] = rng2.randint(1, 6, size=n_legit_txn)
    legit_txn['HostnameLength'] = rng2.randint(8, 30, size=n_legit_txn)
    legit_txn['PathLength'] = rng2.randint(10, 80, size=n_legit_txn)
    legit_txn['QueryLength'] = rng2.randint(0, 50, size=n_legit_txn)
    # Transactional emails may mention "account" but in a safe context
    legit_txn['CredentialRequestScore'] = rng2.choice([0, 1], size=n_legit_txn, p=[0.7, 0.3])
    legit_txn['NumSensitiveWords'] = rng2.choice([0, 1, 2], size=n_legit_txn, p=[0.5, 0.3, 0.2])
    # May have payment words in receipts (but no BEC signals)
    legit_txn['FinancialRequestScore'] = rng2.choice([0, 1], size=n_legit_txn, p=[0.6, 0.4])
    legit_txn['AuthorityImpersonationScore'] = 0.0
    legit_txn['PhoneCallbackPattern'] = 0.0
    legit_txn['ReplyToMismatch'] = 0.0
    legit_txn['HeaderMismatch'] = 0.0
    legit_txn['IsLinkless'] = 0.0
    # Attachments: may have receipts/invoices but with safe extensions
    legit_txn['HasAttachment'] = rng2.choice([0, 1], size=n_legit_txn, p=[0.6, 0.4])
    legit_txn['AttachmentCount'] = (legit_txn['HasAttachment'] > 0).astype(float)
    legit_txn['RiskyAttachmentExtension'] = 0.0  # safe extensions
    legit_txn['DoubleExtensionFlag'] = 0.0
    legit_txn['AttachmentNameEntropy'] = rng2.uniform(1.5, 3.0, size=n_legit_txn) * legit_txn['HasAttachment']

    legit_txn['DomainExists'] = 1.0
    legit_txn['HasMXRecord'] = 1.0
    legit_txn['MultipleIPs'] = rng2.choice([0, 1], size=n_legit_txn, p=[0.3, 0.7])
    legit_txn['dns_ran'] = 1.0

    y_legit_txn = pd.Series(np.zeros(n_legit_txn, dtype=int))  # all legitimate
    print(f"  Synthetic legit transactional: {n_legit_txn} samples")

    # ==================== Combine Everything ====================
    X = pd.concat([
        variant_a, variant_b, variant_c,            # URL-based variants
        bec_phish, attach_phish,                     # synthetic phishing
        legit_news, legit_txn                        # synthetic legitimate
    ], ignore_index=True)
    y = pd.concat([
        y_raw, y_raw, y_raw,                         # URL-based labels
        y_bec, y_attach,                              # phishing labels
        y_legit_news, y_legit_txn                     # legitimate labels
    ], ignore_index=True)

    print(f"\nFinal unified dataset:")
    print(f"  Shape: {X.shape}")
    print(f"  Features: {len(UNIFIED_FEATURES)}")
    print(f"  Phishing: {(y == 1).sum()}, Legitimate: {(y == 0).sum()}")
    print(f"  URL variants: {3 * n} + Synthetic: {n_bec + n_attach + n_legit_news + n_legit_txn}")

    return X, y


# ======================================================================
# MODEL TRAINING
# Trains a Random Forest classifier, applies StandardScaler feature
# normalisation, wraps the model in isotonic calibration for reliable
# probability estimates, and evaluates via cross-validation.
# ======================================================================

def train_unified_model(X, y):
    """
    Train a single Random Forest classifier wrapped with isotonic calibration.

    Pipeline:
        1. Stratified 80/20 train-test split
        2. StandardScaler feature normalisation
        3. RandomForest training (200 estimators, max_depth=20)
        4. CalibratedClassifierCV with isotonic regression (5-fold)
        5. Evaluation: accuracy, cross-validation, classification report

    @param X: Feature matrix with 64 columns matching UNIFIED_FEATURES.
    @type X: pd.DataFrame
    @param y: Binary label series (1=phishing, 0=legitimate).
    @type y: pd.Series
    @returns: Tuple of (calibrated_model, raw_rf, scaler, test_accuracy).
    @rtype: tuple[CalibratedClassifierCV, RandomForestClassifier, StandardScaler, float]
    """
    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Base Random Forest
    print("\nTraining Random Forest (200 estimators, 64 features)...")
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_scaled, y_train)

    # Calibrate with isotonic regression (better than sigmoid for RF)
    print("Calibrating probabilities (isotonic, 5-fold)...")
    calibrated = CalibratedClassifierCV(rf, method='isotonic', cv=5)
    calibrated.fit(X_train_scaled, y_train)

    # ---- Evaluation ----
    rf_train = rf.score(X_train_scaled, y_train)
    rf_test = rf.score(X_test_scaled, y_test)
    cal_test = calibrated.score(X_test_scaled, y_test)

    print(f"\nRaw RF - Training accuracy:    {rf_train:.4f}")
    print(f"Raw RF - Test accuracy:        {rf_test:.4f}")
    print(f"Calibrated - Test accuracy:    {cal_test:.4f}")

    # Cross-validation on raw RF
    cv_scores = cross_val_score(rf, scaler.transform(X), y, cv=5, scoring='accuracy')
    print(f"5-fold CV accuracy:            {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

    # Classification report
    y_pred = calibrated.predict(X_test_scaled)
    print("\nClassification Report (Calibrated Model):")
    print(classification_report(y_test, y_pred,
                                target_names=['Legitimate', 'Phishing']))

    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:")
    print(cm)

    # Feature importance (from underlying RF)
    importance = dict(zip(UNIFIED_FEATURES, rf.feature_importances_))
    print("\nTop 15 most important features:")
    for feat, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True)[:15]:
        print(f"  {feat}: {imp:.4f}")

    return calibrated, rf, scaler, cal_test


# ======================================================================
# CALIBRATION EXPORT
# Builds a lookup table mapping raw Random Forest probabilities to
# isotonic-calibrated probabilities. This table is embedded in the
# exported JSON model so the browser-side inference engine can apply
# calibration without needing the full sklearn CalibratedClassifierCV.
# ======================================================================

def build_calibration_table(calibrated_model, rf, scaler, X, n_points=200):
    """
    Build an isotonic calibration lookup table by sampling the raw RF
    probability space uniformly and mapping each point through the
    calibrated model's internal calibrators.

    @param calibrated_model: The CalibratedClassifierCV-wrapped model.
    @type calibrated_model: CalibratedClassifierCV
    @param rf: The underlying (uncalibrated) RandomForestClassifier.
    @type rf: RandomForestClassifier
    @param scaler: The StandardScaler used during training (unused here
                   but kept for API consistency).
    @type scaler: StandardScaler
    @param X: Training data (unused; kept for API consistency).
    @type X: pd.DataFrame or None
    @param n_points: Number of evenly spaced points in [0.0, 1.0].
    @type n_points: int
    @returns: Tuple of (x_values, y_values) where x = raw probability
              and y = calibrated probability, both as lists of floats.
    @rtype: tuple[list[float], list[float]]
    """
    # Generate evenly spaced raw probabilities
    x_raw = np.linspace(0.0, 1.0, n_points)

    # We need to map raw probs -> calibrated probs
    # Use the calibrated model's calibrators directly
    # CalibratedClassifierCV stores calibrators in .calibrated_classifiers_
    # Each has a .calibrators_ list (one per class)

    # Approach: create synthetic predictions at each raw prob level
    # and see what the calibrator maps them to
    y_cal = []
    for raw_p in x_raw:
        # For isotonic calibration, we can use the calibrator's predict method
        # The calibrators map raw probability -> calibrated probability
        try:
            # Access the first calibrated classifier's calibrator for class 1
            cal_cls = calibrated_model.calibrated_classifiers_[0]
            calibrator = cal_cls.calibrators_[1]  # class 1 (phishing)
            mapped = calibrator.predict(np.array([raw_p]))[0]
            y_cal.append(float(np.clip(mapped, 0.0, 1.0)))
        except Exception:
            y_cal.append(float(raw_p))  # fallback: identity

    return x_raw.tolist(), y_cal


# ======================================================================
# MODEL EXPORT
# Serialises the trained model in two formats:
#   1. sklearn pickle files (.pkl) for future retraining in Python
#   2. A single JSON file containing tree structures, scaler stats, and
#      calibration lookup table for in-browser inference via JavaScript
# ======================================================================

def export_unified_model(calibrated, rf, scaler, feature_names, output_dir='model'):
    """
    Export all model artifacts to the output directory.

    Produces:
        model_calibrated.pkl  — Full CalibratedClassifierCV for Python reuse
        model_rf.pkl          — Raw RandomForestClassifier
        scaler.pkl            — Fitted StandardScaler
        feature_names.json    — Ordered list of 64 feature names
        model_unified.json    — Combined trees + scaler + calibration for JS

    @param calibrated: Trained CalibratedClassifierCV model.
    @type calibrated: CalibratedClassifierCV
    @param rf: Underlying RandomForestClassifier.
    @type rf: RandomForestClassifier
    @param scaler: Fitted StandardScaler.
    @type scaler: StandardScaler
    @param feature_names: Ordered list of feature name strings.
    @type feature_names: list[str]
    @param output_dir: Directory path for output files.
    @type output_dir: str
    """
    os.makedirs(output_dir, exist_ok=True)

    # Sklearn artifacts
    joblib.dump(calibrated, f'{output_dir}/model_calibrated.pkl')
    joblib.dump(rf, f'{output_dir}/model_rf.pkl')
    joblib.dump(scaler, f'{output_dir}/scaler.pkl')

    # Feature names
    with open(f'{output_dir}/feature_names.json', 'w') as f:
        json.dump(feature_names, f, indent=2)

    # Build calibration lookup table
    print("\nBuilding calibration lookup table...")
    x_vals, y_vals = build_calibration_table(calibrated, rf, scaler, None)

    # Export trees + calibration
    export_unified_json(rf, scaler, feature_names, x_vals, y_vals,
                        f'{output_dir}/model_unified.json')

    print(f"Model exported to {output_dir}/")


def export_unified_json(rf, scaler, feature_names, cal_x, cal_y, output_path):
    """
    Export the Random Forest tree structures, scaler parameters, feature
    importances, and isotonic calibration lookup table to a single JSON
    file for direct browser-side inference in the Chrome extension.

    Each tree is serialised as parallel arrays (feature indices, thresholds,
    left/right children, leaf values) matching sklearn's internal tree
    representation. The scaler mean and scale arrays allow the JS engine
    to normalise feature vectors identically to training.

    @param rf: Trained RandomForestClassifier.
    @type rf: RandomForestClassifier
    @param scaler: Fitted StandardScaler with mean_ and scale_ arrays.
    @type scaler: StandardScaler
    @param feature_names: Ordered list of 64 feature name strings.
    @type feature_names: list[str]
    @param cal_x: Raw probability x-values for calibration lookup.
    @type cal_x: list[float]
    @param cal_y: Calibrated probability y-values for calibration lookup.
    @type cal_y: list[float]
    @param output_path: Filesystem path for the output JSON file.
    @type output_path: str
    """
    trees = []
    for estimator in rf.estimators_:
        tree = estimator.tree_
        trees.append({
            'feature':        tree.feature.tolist(),
            'threshold':      tree.threshold.tolist(),
            'children_left':  tree.children_left.tolist(),
            'children_right': tree.children_right.tolist(),
            'value':          tree.value.squeeze(axis=1).tolist()
        })

    avg_importances = {
        name: float(rf.feature_importances_[i])
        for i, name in enumerate(feature_names)
    }

    model_data = {
        'model_type':          'unified_random_forest',
        'n_estimators':        len(rf.estimators_),
        'n_features':          len(feature_names),
        'feature_names':       feature_names,
        'feature_importances': avg_importances,
        'scaler_mean':         scaler.mean_.tolist(),
        'scaler_scale':        scaler.scale_.tolist(),
        'calibration': {
            'method': 'isotonic',
            'x_values': cal_x,
            'y_values': cal_y
        },
        'trees':               trees
    }

    with open(output_path, 'w') as f:
        json.dump(model_data, f)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  {os.path.basename(output_path)}: {size_mb:.1f} MB  ({len(trees)} trees, {len(feature_names)} features)")


# ======================================================================
# PER-TYPE EVALUATION
# Tags each test sample by inferred phishing style (URL credential,
# deep-scan impersonation, linkless BEC, attachment-led) based on
# active feature values, then reports accuracy, precision, recall,
# and F1 for each group independently.
# ======================================================================

def evaluate_by_type(calibrated, scaler, X_test, y_test):
    """
    Heuristic-tag test samples by phishing style and report classification
    metrics separately for each type. Uses feature values to infer which
    attack vector each sample represents.

    Tags assigned:
        'linkless_bec'            — No links; BEC-style social engineering
        'attachment_led'          — Attack vector is an attachment
        'deepscan_impersonation'  — Deep-scan page features are active
        'url_credential_phish'    — Standard URL-based credential phishing
        'other'                   — Does not match any heuristic

    @param calibrated: Trained CalibratedClassifierCV model.
    @type calibrated: CalibratedClassifierCV
    @param scaler: Fitted StandardScaler for feature normalisation.
    @type scaler: StandardScaler
    @param X_test: Test feature matrix (64 columns).
    @type X_test: pd.DataFrame
    @param y_test: True labels for the test set.
    @type y_test: pd.Series
    """
    X_scaled = scaler.transform(X_test)
    y_pred = calibrated.predict(X_scaled)
    y_prob = calibrated.predict_proba(X_scaled)[:, 1]

    # Heuristic tagging based on feature values
    tags = []
    feat_idx = {name: i for i, name in enumerate(UNIFIED_FEATURES)}
    for i in range(len(X_test)):
        row = X_test.iloc[i] if hasattr(X_test, 'iloc') else X_test[i]

        # Check which features are active (use .iloc for positional access)
        has_url = row.iloc[feat_idx['UrlLength']] > 0 if hasattr(row, 'iloc') else row[feat_idx['UrlLength']] > 0
        has_deepscan = row.iloc[feat_idx['deep_scan_ran']] > 0 if hasattr(row, 'iloc') else row[feat_idx['deep_scan_ran']] > 0
        is_linkless = row.iloc[feat_idx['LinkCount']] == 0 if hasattr(row, 'iloc') else row[feat_idx['LinkCount']] == 0
        has_attach = row.iloc[feat_idx['HasAttachment']] > 0 if hasattr(row, 'iloc') else row[feat_idx['HasAttachment']] > 0

        page_active = any(
            (row.iloc[feat_idx[f]] if hasattr(row, 'iloc') else row[feat_idx[f]]) > 0
            for f in ['InsecureForms', 'ExtFormAction', 'EmbeddedBrandName', 'IframeOrFrame']
            if f in feat_idx
        )

        if is_linkless:
            tags.append('linkless_bec')
        elif has_attach:
            tags.append('attachment_led')
        elif has_deepscan and page_active:
            tags.append('deepscan_impersonation')
        elif has_url:
            tags.append('url_credential_phish')
        else:
            tags.append('other')

    tags = np.array(tags)

    print("\n" + "=" * 60)
    print("Per-Type Evaluation")
    print("=" * 60)

    for tag in sorted(set(tags)):
        mask = tags == tag
        n_samples = mask.sum()
        if n_samples < 10:
            print(f"\n  [{tag}] - {n_samples} samples (too few for report)")
            continue

        y_t = y_test.values[mask] if hasattr(y_test, 'values') else y_test[mask]
        y_p = y_pred[mask]

        print(f"\n  [{tag}] - {n_samples} samples")
        # Only print report if both classes are present
        if len(set(y_t)) > 1:
            report = classification_report(y_t, y_p,
                                           target_names=['Legitimate', 'Phishing'],
                                           output_dict=True)
            print(f"    Accuracy:  {report['accuracy']:.4f}")
            print(f"    Precision: {report['Phishing']['precision']:.4f}")
            print(f"    Recall:    {report['Phishing']['recall']:.4f}")
            print(f"    F1:        {report['Phishing']['f1-score']:.4f}")
        else:
            label = 'Phishing' if y_t[0] == 1 else 'Legitimate'
            correct = (y_t == y_p).sum()
            print(f"    All {label} - {correct}/{n_samples} correct ({correct/n_samples:.1%})")


# ======================================================================
# MAIN ENTRY POINT
# Orchestrates the full training pipeline: data loading, model training,
# artifact export, and per-type evaluation reporting.
# ======================================================================

def main():
    """
    Entry point for the training pipeline. Loads the dataset, trains the
    unified Random Forest model with isotonic calibration, exports all
    model artifacts (JSON for browser, pickle for Python), and runs
    per-type evaluation diagnostics.
    """
    csv_path = 'Phishing_Dataset/Phishing_Legitimate_full.csv'

    print("=" * 60)
    print("GoPhishFree - Unified Model Training (64 features)")
    print("=" * 60)

    # Load and prepare data
    print("\nLoading and preparing unified dataset...")
    X, y = load_and_prepare_unified_data(csv_path)

    # Train
    print("\nTraining unified model...")
    calibrated, rf, scaler, test_score = train_unified_model(X, y)

    # Export
    print("\nExporting unified model for JS inference...")
    export_unified_model(calibrated, rf, scaler, UNIFIED_FEATURES)

    # Per-type evaluation on test split
    print("\nRunning per-type evaluation...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    evaluate_by_type(calibrated, scaler, X_test, y_test)

    # Summary
    print("\n" + "=" * 60)
    print(f"Unified model: {test_score:.4f} accuracy ({len(UNIFIED_FEATURES)} features)")
    print(f"Model file:    model/model_unified.json")
    print(f"Calibration:   isotonic regression (direct 0-100 mapping)")
    print("=" * 60)


def _clean_pycache():
    """
    Remove __pycache__ directory from the project root. Chrome extension
    loading rejects directories whose names start with an underscore,
    so this cleanup prevents load failures during development.
    """
    import shutil
    base = os.path.dirname(os.path.abspath(__file__))
    pc = os.path.join(base, '__pycache__')
    if os.path.isdir(pc):
        shutil.rmtree(pc, ignore_errors=True)
        print("  (cleaned __pycache__)")


if __name__ == '__main__':
    main()
    _clean_pycache()
