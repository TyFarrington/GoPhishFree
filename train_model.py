"""
GoPhishFree – ML Model Training Script

Trains two Random Forest classifiers for phishing detection and exports
their full decision-tree structures to JSON so that content.js can
perform real inference in the browser without a backend.

Models trained:
  1. Tier 1 Enhanced (25 features) – email-only features extractable from Gmail
  2. Deep Scan (38 features)       – email features + 13 page structure features

The JSON export contains:
  - Scaler parameters (mean, scale) for Z-score normalisation
  - Tree structures (feature splits, thresholds, leaf counts)
  - Feature names and importance scores

Usage:
  python train_model.py

Outputs:
  model/model_trees.json          – Tier 1 model for JS inference
  model/model_deepscan.json       – Deep Scan model for JS inference
  model/feature_names.json        – Tier 1 feature list
  model/feature_names_deepscan.json
  model/*.pkl                     – Sklearn artifacts for retraining
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
import os

# ──────────────────────────────────────────────────────────────────────
# Features that can be extracted locally from Gmail UI (Tier 1 Enhanced)
# ORDER MATTERS – featureExtractor.js mapToModelInput() must match this
# ──────────────────────────────────────────────────────────────────────
LOCAL_FEATURES = [
    'NumDots', 'SubdomainLevel', 'PathLevel', 'UrlLength', 'NumDash',
    'NumDashInHostname', 'AtSymbol', 'TildeSymbol', 'NumUnderscore',
    'NumPercent', 'NumQueryComponents', 'NumAmpersand', 'NumHash',
    'NumNumericChars', 'NoHttps', 'IpAddress', 'DomainInSubdomains',
    'DomainInPaths', 'HttpsInHostname', 'HostnameLength', 'PathLength',
    'QueryLength', 'DoubleSlashInPath', 'NumSensitiveWords',
    'FrequentDomainNameMismatch'
]

# ──────────────────────────────────────────────────────────────────────
# Additional features extracted by Tier 3 Deep Scan (page visit required).
# These exist in the Kaggle dataset and are used by model_deepscan.json.
# ORDER MATTERS – content.js mapToDeepScanInput() must match
#   LOCAL_FEATURES + DEEPSCAN_FEATURES
# ──────────────────────────────────────────────────────────────────────
DEEPSCAN_FEATURES = [
    'InsecureForms', 'RelativeFormAction', 'ExtFormAction',
    'AbnormalFormAction', 'SubmitInfoToEmail',
    'PctExtHyperlinks', 'PctExtResourceUrls', 'ExtFavicon',
    'PctNullSelfRedirectHyperlinks',
    'IframeOrFrame', 'MissingTitle', 'ImagesOnlyInForm',
    'EmbeddedBrandName'
]


# ──────────────────────────── data prep ────────────────────────────────

def load_and_prepare_data(csv_path):
    """Load dataset and keep only the features present in LOCAL_FEATURES."""
    df = pd.read_csv(csv_path)

    # Keep only LOCAL_FEATURES columns that actually exist in the CSV
    available_features = [f for f in LOCAL_FEATURES if f in df.columns]

    X = df[available_features].fillna(0)
    y = df['CLASS_LABEL']

    print(f"Using {len(available_features)} features: {available_features}")
    print(f"Dataset shape: {X.shape}")
    print(f"Phishing samples: {y.sum()}, Legitimate samples: {(y == 0).sum()}")

    return X, y, available_features


def load_and_prepare_deepscan_data(csv_path):
    """Load dataset with LOCAL + DEEPSCAN features (38 total)."""
    df = pd.read_csv(csv_path)

    all_features = LOCAL_FEATURES + DEEPSCAN_FEATURES
    available = [f for f in all_features if f in df.columns]

    X = df[available].fillna(0)
    y = df['CLASS_LABEL']

    print(f"Using {len(available)} features: {available}")
    print(f"Dataset shape: {X.shape}")
    print(f"Phishing samples: {y.sum()}, Legitimate samples: {(y == 0).sum()}")

    return X, y, available


# ──────────────────────────── training ─────────────────────────────────

def train_model(X, y):
    """Train a Random Forest and print evaluation metrics."""
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train model
    print("\nTraining Random Forest model (200 estimators)...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_scaled, y_train)

    # ── Evaluation ──
    train_score = model.score(X_train_scaled, y_train)
    test_score = model.score(X_test_scaled, y_test)

    print(f"\nTraining accuracy: {train_score:.4f}")
    print(f"Test accuracy:     {test_score:.4f}")

    # Cross-validation
    cv_scores = cross_val_score(model, scaler.transform(X), y, cv=5, scoring='accuracy')
    print(f"5-fold CV accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")

    # Classification report
    y_pred = model.predict(X_test_scaled)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred,
                                target_names=['Legitimate', 'Phishing']))

    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:")
    print(cm)

    # Feature importance
    feature_importance = dict(zip(X.columns, model.feature_importances_))
    print("\nTop 10 most important features:")
    for feature, importance in sorted(feature_importance.items(),
                                      key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {feature}: {importance:.4f}")

    return model, scaler, test_score


# ──────────────────────────── export ───────────────────────────────────

def export_model_for_js(model, scaler, feature_names, output_dir='model'):
    """Export everything JS needs: tree structures, scaler, feature list."""
    os.makedirs(output_dir, exist_ok=True)

    # Sklearn artefacts (for later reuse / retraining)
    joblib.dump(model, f'{output_dir}/model.pkl')
    joblib.dump(scaler, f'{output_dir}/scaler.pkl')

    # Feature names in training order
    with open(f'{output_dir}/feature_names.json', 'w') as f:
        json.dump(feature_names, f, indent=2)

    # Full model for JS inference
    export_trees_to_json(model, scaler, feature_names,
                         f'{output_dir}/model_trees.json')

    print(f"\nModel exported to {output_dir}/")


def export_trees_to_json(model, scaler, feature_names, output_path):
    """
    Export the *full* Random Forest structure so JS can traverse each tree
    and aggregate votes — real inference, not just importance scores.

    Each tree is stored as parallel arrays (mirrors sklearn internals):
        feature      – feature index used at each node (-2 for leaves)
        threshold    – split threshold at each node
        children_left  – index of left child (-1 for leaves)
        children_right – index of right child (-1 for leaves)
        value        – [n_legitimate, n_phishing] sample counts at node
    """
    trees = []
    for estimator in model.estimators_:
        tree = estimator.tree_
        trees.append({
            'feature':        tree.feature.tolist(),
            'threshold':      tree.threshold.tolist(),
            'children_left':  tree.children_left.tolist(),
            'children_right': tree.children_right.tolist(),
            # value shape is (n_nodes, 1, n_classes) → flatten to (n_nodes, n_classes)
            'value':          tree.value.squeeze(axis=1).tolist()
        })

    # Aggregate feature importances
    avg_importances = {
        name: float(model.feature_importances_[i])
        for i, name in enumerate(feature_names)
    }

    model_data = {
        'model_type':           'random_forest',
        'n_estimators':         len(model.estimators_),
        'n_features':           len(feature_names),
        'feature_names':        feature_names,
        'feature_importances':  avg_importances,
        'scaler_mean':          scaler.mean_.tolist(),
        'scaler_scale':         scaler.scale_.tolist(),
        'trees':                trees
    }

    with open(output_path, 'w') as f:
        json.dump(model_data, f)          # no indent – keeps file compact

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    filename = os.path.basename(output_path)
    print(f"  {filename}: {size_mb:.1f} MB  ({len(trees)} trees)")


# ──────────────────────────── main ─────────────────────────────────────

def main():
    csv_path = 'Phishing_Dataset/Phishing_Legitimate_full.csv'

    # ── Model 1: Tier 1 Enhanced (25 features) ──────────────────
    print("=" * 60)
    print("GoPhishFree – Tier 1 Enhanced Model (25 features)")
    print("=" * 60)

    print("\nLoading dataset...")
    X, y, feature_names = load_and_prepare_data(csv_path)

    print("\nTraining model...")
    model, scaler, test_score = train_model(X, y)

    print("\nExporting model for JS inference...")
    export_model_for_js(model, scaler, feature_names)

    # ── Model 2: Deep Scan (38 features) ────────────────────────
    print("\n" + "=" * 60)
    print("GoPhishFree – Tier 3 Deep Scan Model (38 features)")
    print("=" * 60)

    print("\nLoading expanded dataset...")
    X_ds, y_ds, ds_features = load_and_prepare_deepscan_data(csv_path)

    print("\nTraining deep scan model...")
    ds_model, ds_scaler, ds_score = train_model(X_ds, y_ds)

    print("\nExporting deep scan model for JS inference...")
    export_model_for_js(ds_model, ds_scaler, ds_features, output_dir='model')
    # Rename the exported files so both models coexist
    # (export_model_for_js writes model_trees.json; rename to deepscan variant)
    os.replace('model/model_trees.json', 'model/model_deepscan.json')
    os.replace('model/model.pkl', 'model/model_deepscan.pkl')
    os.replace('model/scaler.pkl', 'model/scaler_deepscan.pkl')

    # Restore the Tier 1 feature_names.json (overwritten by deepscan export)
    with open('model/feature_names.json', 'w') as f:
        json.dump(feature_names, f, indent=2)
    # Also save deepscan feature names
    with open('model/feature_names_deepscan.json', 'w') as f:
        json.dump(ds_features, f, indent=2)

    # Re-export Tier 1 model_trees.json (was overwritten)
    export_trees_to_json(model, scaler, feature_names, 'model/model_trees.json')

    # ── Summary ─────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print(f"Tier 1 model:     {test_score:.4f} accuracy  ({len(feature_names)} features)")
    print(f"Deep Scan model:  {ds_score:.4f} accuracy  ({len(ds_features)} features)")
    print("=" * 60)


if __name__ == '__main__':
    main()
