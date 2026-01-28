"""
Train ML model for GoPhishFree on locally-extractable features
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import json

# Features that can be extracted locally from Gmail UI
LOCAL_FEATURES = [
    'NumDots', 'SubdomainLevel', 'PathLevel', 'UrlLength', 'NumDash',
    'NumDashInHostname', 'AtSymbol', 'NumUnderscore', 'NumPercent',
    'NumQueryComponents', 'NumAmpersand', 'NumHash', 'NumNumericChars',
    'NoHttps', 'IpAddress', 'HostnameLength', 'PathLength', 'QueryLength',
    'DoubleSlashInPath'
]

# Additional features we'll compute from email content
# These map to our FeatureExtractor outputs
FEATURE_MAPPING = {
    # URL features (from LOCAL_FEATURES)
    'NumDots': 'NumDots',
    'SubdomainLevel': 'SubdomainLevel',
    'PathLevel': 'PathLevel',
    'UrlLength': 'UrlLength',
    'NumDash': 'NumDash',
    'NumDashInHostname': 'NumDashInHostname',
    'AtSymbol': 'AtSymbol',
    'NumUnderscore': 'NumUnderscore',
    'NumPercent': 'NumPercent',
    'NumQueryComponents': 'NumQueryComponents',
    'NumAmpersand': 'NumAmpersand',
    'NumHash': 'NumHash',
    'NumNumericChars': 'NumNumericChars',
    'NoHttps': 'NoHttps',
    'IpAddress': 'IpAddress',
    'HostnameLength': 'HostnameLength',
    'PathLength': 'PathLength',
    'QueryLength': 'QueryLength',
    'DoubleSlashInPath': 'DoubleSlashInPath',
    # Additional features we can compute
    'NumSensitiveWords': 'NumSensitiveWords',  # From dataset
}

def load_and_prepare_data(csv_path):
    """Load dataset and prepare features"""
    df = pd.read_csv(csv_path)
    
    # Select features available locally
    available_features = [f for f in LOCAL_FEATURES if f in df.columns]
    
    # Add NumSensitiveWords if available
    if 'NumSensitiveWords' in df.columns:
        available_features.append('NumSensitiveWords')
    
    # Use available features
    X = df[available_features].fillna(0)
    y = df['CLASS_LABEL']
    
    print(f"Using {len(available_features)} features: {available_features}")
    print(f"Dataset shape: {X.shape}")
    print(f"Phishing samples: {y.sum()}, Legitimate samples: {(y == 0).sum()}")
    
    return X, y, available_features

def train_model(X, y):
    """Train Random Forest model"""
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    print("\nTraining Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    train_score = model.score(X_train_scaled, y_train)
    test_score = model.score(X_test_scaled, y_test)
    
    print(f"\nTraining accuracy: {train_score:.4f}")
    print(f"Test accuracy: {test_score:.4f}")
    
    # Feature importance
    feature_importance = dict(zip(X.columns, model.feature_importances_))
    print("\nTop 10 most important features:")
    for feature, importance in sorted(feature_importance.items(), 
                                      key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {feature}: {importance:.4f}")
    
    return model, scaler, test_score

def export_model_for_js(model, scaler, feature_names, output_dir='model'):
    """Export model in format suitable for TensorFlow.js or simple JS inference"""
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    # Save sklearn model (we'll use a JS-compatible approach)
    joblib.dump(model, f'{output_dir}/model.pkl')
    joblib.dump(scaler, f'{output_dir}/scaler.pkl')
    
    # Export feature names and order
    with open(f'{output_dir}/feature_names.json', 'w') as f:
        json.dump(feature_names, f, indent=2)
    
    # For JS inference, we'll create a simplified model representation
    # Extract tree structure for simple JS inference
    export_trees_to_json(model, scaler, feature_names, f'{output_dir}/model_trees.json')
    
    print(f"\nModel exported to {output_dir}/")

def export_trees_to_json(model, scaler, feature_names, output_path):
    """Export Random Forest model metadata for JS inference"""
    # Calculate feature importances (average across all trees)
    feature_importances = {}
    for i, tree in enumerate(model.estimators_):
        for j, feature_name in enumerate(feature_names):
            if feature_name not in feature_importances:
                feature_importances[feature_name] = []
            feature_importances[feature_name].append(tree.feature_importances_[j])
    
    avg_importances = {k: sum(v) / len(v) for k, v in feature_importances.items()}
    
    # Export model metadata
    model_data = {
        'n_estimators': len(model.estimators_),
        'feature_names': feature_names,
        'feature_importances': avg_importances,
        'scaler_mean': scaler.mean_.tolist(),
        'scaler_scale': scaler.scale_.tolist(),
        'model_type': 'random_forest',
        'n_features': len(feature_names)
    }
    
    with open(output_path, 'w') as f:
        json.dump(model_data, f, indent=2)

def extract_tree_rules(tree, feature_names):
    """Extract simplified rules from a decision tree"""
    # Simplified: return feature thresholds
    # Full implementation would traverse tree
    return {
        'feature_importances': dict(zip(feature_names, tree.feature_importances_))
    }

def main():
    csv_path = 'Phishing_Dataset/Phishing_Legitimate_full.csv'
    
    print("Loading dataset...")
    X, y, feature_names = load_and_prepare_data(csv_path)
    
    print("\nTraining model...")
    model, scaler, test_score = train_model(X, y)
    
    print("\nExporting model...")
    export_model_for_js(model, scaler, feature_names)
    
    print("\nModel training complete!")
    print(f"Test accuracy: {test_score:.4f}")
    print("\nNote: For production, consider converting to TensorFlow.js")
    print("or implementing a simpler JS-based inference using exported rules.")

if __name__ == '__main__':
    main()
