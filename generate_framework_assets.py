"""
Generate Framework/ architecture diagram images and updated Architecture PDF
for GoPhishFree - EECS582 Capstone Project

Generates high-quality diagrams matching the original visual style:
  - Dark navy background (#0d1b2a)
  - Neon colored borders with glow effects
  - Detailed text inside boxes
  - Professional UML-style layouts

Requires: matplotlib, numpy, fpdf2
  pip install matplotlib numpy fpdf2
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np
import os
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE_DIR, "Framework")
os.makedirs(OUT_DIR, exist_ok=True)

# ─── Color Palette (matching original images exactly) ───
BG = '#0d1b2a'
BG_LIGHTER = '#142444'
BG_BOX = '#0f2640'
TEAL = '#40e0d0'
TEAL_DIM = '#2a9a8e'
ORANGE = '#e67e22'
RED = '#e74c3c'
GREEN = '#2ecc71'
PURPLE = '#8b5cf6'
YELLOW = '#f1c40f'
PINK = '#e91e8b'
WHITE = '#f0f0f0'
GRAY = '#8899aa'
GRAY_DIM = '#556677'

DPI = 300  # High resolution output


# ═══════════════════════════════════════════════════════════
#  UTILITY HELPERS
# ═══════════════════════════════════════════════════════════

def new_figure(w=20, h=11.25):
    """Create a styled figure at 16:9 matching the originals."""
    fig, ax = plt.subplots(figsize=(w, h))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')
    fig.subplots_adjust(left=0.01, right=0.99, top=0.99, bottom=0.01)
    return fig, ax


def glow_rect(ax, x, y, w, h, border_color, fill_color=None, lw=2, radius=0.4, zorder=3):
    """Draw a rounded rectangle with a neon glow effect."""
    fc = fill_color or BG_BOX
    # Glow layers (outer to inner, increasing opacity)
    for i, (dxy, alpha) in enumerate([(1.2, 0.04), (0.8, 0.06), (0.4, 0.10)]):
        g = FancyBboxPatch((x - dxy, y - dxy), w + 2*dxy, h + 2*dxy,
                           boxstyle=f"round,pad={radius}",
                           facecolor='none', edgecolor=border_color,
                           linewidth=lw + 4 - i*1.5, alpha=alpha, zorder=zorder-1)
        ax.add_patch(g)
    # Main box
    box = FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad={radius}",
                         facecolor=fc, edgecolor=border_color,
                         linewidth=lw, alpha=0.95, zorder=zorder)
    ax.add_patch(box)
    return box


def container(ax, x, y, w, h, label, color, ls='--', lw=1.5, fontsize=10):
    """Draw a dashed container with a title at the top."""
    rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.6",
                          facecolor=color, edgecolor=color,
                          linewidth=lw, alpha=0.06, linestyle=ls, zorder=1)
    ax.add_patch(rect)
    border = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.6",
                            facecolor='none', edgecolor=color,
                            linewidth=lw, alpha=0.35, linestyle=ls, zorder=2)
    ax.add_patch(border)
    ax.text(x + w/2, y + h - 1.5, label, ha='center', va='top',
            fontsize=fontsize, color=color, fontweight='bold',
            fontfamily='sans-serif', zorder=5)


def txt(ax, x, y, text, fontsize=8, color=WHITE, ha='center', va='center',
        weight='normal', family='sans-serif', alpha=1.0, zorder=6):
    """Place text."""
    ax.text(x, y, text, fontsize=fontsize, color=color, ha=ha, va=va,
            fontweight=weight, fontfamily=family, alpha=alpha, zorder=zorder)


def arrow(ax, x1, y1, x2, y2, color=WHITE, lw=1.2, style='->', dashed=False):
    """Draw an arrow."""
    ls = '--' if dashed else '-'
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color, lw=lw,
                                linestyle=ls),
                zorder=4)


def arrow_label(ax, x1, y1, x2, y2, label, color=WHITE, lw=1.2,
                fontsize=6, dashed=False, label_offset=1.0):
    """Arrow with a text label at the midpoint."""
    arrow(ax, x1, y1, x2, y2, color, lw, dashed=dashed)
    mx, my = (x1+x2)/2, (y1+y2)/2 + label_offset
    txt(ax, mx, my, label, fontsize=fontsize, color=color, alpha=0.8)


def save(fig, name):
    path = os.path.join(OUT_DIR, name)
    fig.savefig(path, dpi=DPI, bbox_inches='tight', facecolor=BG, pad_inches=0.15)
    plt.close(fig)
    print(f"  -> {name}  ({os.path.getsize(path)/1024:.0f} KB)")


# ═══════════════════════════════════════════════════════════
#  DIAGRAM 1 — System Architecture
# ═══════════════════════════════════════════════════════════

def gen_system_architecture():
    fig, ax = new_figure()

    # Title
    txt(ax, 50, 97, 'GoPhishFree - System Architecture', 22, WHITE, weight='bold')

    # ── Chrome Extension outer container ──
    container(ax, 2, 28, 62, 66, 'Chrome Extension', TEAL, fontsize=12)

    # Gmail Content Scripts group
    container(ax, 4, 46, 28, 44, 'Gmail Content Scripts', TEAL, ls='-', lw=1)
    glow_rect(ax, 6, 72, 24, 10, TEAL)
    txt(ax, 18, 78.5, 'content.js', 10, TEAL, weight='bold')
    txt(ax, 18, 75, 'Unified Scanning + Trusted Domains', 6, GRAY)
    txt(ax, 18, 73, '500+ built-in + user custom + post-model', 5.5, GRAY_DIM)

    glow_rect(ax, 6, 58, 24, 10, GREEN)
    txt(ax, 18, 64.5, 'featureExtractor.js', 9, GREEN, weight='bold')
    txt(ax, 18, 60.5, 'FeatureExtractor (64 features),', 6, GRAY)
    txt(ax, 18, 58.5, 'DnsChecker, PageAnalyzer', 6, GRAY)

    glow_rect(ax, 6, 48, 24, 7, GREEN)
    txt(ax, 18, 52.5, 'content.css', 9, GREEN, weight='bold')
    txt(ax, 18, 49.5, 'Styles + AI Result UI', 6, GRAY)

    arrow_label(ax, 18, 72, 18, 68.5, 'extract features', TEAL, fontsize=5.5)

    # Background Service Worker
    container(ax, 34, 66, 28, 22, 'Background Service Worker', ORANGE, ls='-', lw=1)
    glow_rect(ax, 36, 68, 24, 12, ORANGE)
    txt(ax, 48, 76, 'background.js', 10, ORANGE, weight='bold')
    txt(ax, 48, 73, 'Storage, Messaging, Secure Fetch', 6.5, GRAY)
    txt(ax, 48, 70.5, 'AI Provider Adapters (BYOK)', 6.5, YELLOW)

    # Arrow: content.js -> background.js
    arrow_label(ax, 30, 77, 36, 77, 'chrome.runtime.sendMessage', WHITE, fontsize=5.5)

    # Popup Dashboard
    glow_rect(ax, 36, 48, 24, 12, PURPLE)
    txt(ax, 48, 56.5, 'Popup Dashboard', 8, PURPLE, weight='bold')
    txt(ax, 48, 53.5, 'popup.html + popup.js', 7, WHITE)
    txt(ax, 48, 51, 'Fish Tank + AI Config + Trusted Domains', 5.5, GRAY)

    # Arrow: bg -> popup
    arrow_label(ax, 48, 66, 48, 60.5, 'getFishCollection', WHITE, fontsize=5.5)

    # chrome.storage.local (cylinder)
    from matplotlib.patches import Ellipse
    ell_top = Ellipse((48, 41), 16, 4, facecolor='#1a3660', edgecolor='#4488cc',
                      linewidth=1.5, zorder=3, alpha=0.9)
    ax.add_patch(ell_top)
    rect_body = FancyBboxPatch((40, 35), 16, 6, boxstyle="square,pad=0",
                               facecolor='#1a3660', edgecolor='#4488cc',
                               linewidth=1.5, zorder=2, alpha=0.9)
    ax.add_patch(rect_body)
    ell_bot = Ellipse((48, 35), 16, 4, facecolor='#122a4a', edgecolor='#4488cc',
                      linewidth=1.5, zorder=3, alpha=0.9)
    ax.add_patch(ell_bot)
    txt(ax, 48, 38, 'chrome.storage.local', 7, '#88bbee', weight='bold')

    # Arrow: bg -> storage
    arrow_label(ax, 52, 68, 52, 43, 'read/write', '#88bbee', fontsize=5.5)

    # Static Assets
    container(ax, 4, 28, 28, 16, 'Static Assets', GRAY_DIM, ls='-', lw=1)
    glow_rect(ax, 6, 36, 24, 5, TEAL_DIM, fill_color='#0e2240')
    txt(ax, 18, 39, 'model/model_unified.json (64 features)', 6.5, TEAL)
    glow_rect(ax, 6, 30, 12, 5, GRAY_DIM, fill_color='#0e2240')
    txt(ax, 12, 32.5, 'Assets/', 6.5, GRAY)
    glow_rect(ax, 19, 30, 11, 5, GRAY_DIM, fill_color='#0e2240')
    txt(ax, 24.5, 32.5, 'manifest.json', 6, GRAY)

    # Arrow: content -> model load
    arrow_label(ax, 14, 48, 14, 41.5, 'fetch model\nJSON', TEAL, fontsize=5)

    # ── External Services ──
    container(ax, 66, 56, 32, 18, 'External Services', ORANGE, fontsize=10)
    glow_rect(ax, 68, 58, 14, 10, YELLOW, fill_color='#1a2a10')
    txt(ax, 75, 64, 'Cloudflare / Google', 7, YELLOW, weight='bold')
    txt(ax, 75, 61, 'DNS-over-HTTPS', 6, GRAY)
    txt(ax, 75, 59, '(Tier 2 - domain names only)', 5, GRAY_DIM)

    glow_rect(ax, 84, 58, 12, 10, RED, fill_color='#2a1010')
    txt(ax, 90, 64, 'Target Webpages', 7, RED, weight='bold')
    txt(ax, 90, 61, '(Tier 3 - HTML only,', 5.5, GRAY)
    txt(ax, 90, 59, 'sandboxed)', 5.5, GRAY)

    # Arrow: FE -> DNS
    arrow_label(ax, 30, 63, 68, 63, 'DNS queries', YELLOW, fontsize=5.5)
    # Arrow: bg -> Web
    arrow_label(ax, 62, 72, 84, 68.5, 'fetch HTML\n(credentials: omit)', RED, fontsize=5)

    # ── AI Providers (BYOK) ── NEW
    container(ax, 66, 30, 32, 22, 'AI Providers (BYOK, Optional)', GREEN, fontsize=10)
    providers = [
        ('OpenAI', '#74aa9c', 68, 42), ('Anthropic', '#d4a574', 77, 42),
        ('Google\nGemini', '#4285f4', 86, 42), ('Azure\nOpenAI', '#7b68ee', 68, 34),
        ('Custom\nEndpoint', GRAY, 77, 34),
    ]
    for name, col, px, py in providers:
        glow_rect(ax, px, py, 8, 6.5, col, fill_color='#0e1e30', lw=1.2)
        txt(ax, px + 4, py + 3.25, name, 5.5, col, weight='bold')

    # Arrow: bg -> AI
    arrow_label(ax, 62, 72, 72, 49, 'features-only JSON\n(no email content)', GREEN, fontsize=5.5)

    # ── OFFLINE section ──
    txt(ax, 50, 24, 'OFFLINE', 10, GRAY_DIM, weight='bold')
    glow_rect(ax, 20, 8, 60, 14, GRAY_DIM, fill_color='#0a1420', lw=1)
    txt(ax, 50, 18, 'train_model.py  +  Kaggle Dataset  →  model/ JSON export', 8, GRAY)
    txt(ax, 50, 14, 'Random Forest (200 trees) + CalibratedClassifierCV (isotonic) → model_unified.json', 6.5, TEAL_DIM)
    txt(ax, 50, 10.5, '64-feature unified schema  ·  Synthetic augmentation (36k samples)  ·  96.6% accuracy', 6, GRAY_DIM)

    # Arrow: offline -> model
    arrow_label(ax, 20, 22, 14, 36, 'export', GRAY_DIM, fontsize=5.5)

    save(fig, 'system-architecture.png')


# ═══════════════════════════════════════════════════════════
#  DIAGRAM 2 — Risk Scoring Pipeline
# ═══════════════════════════════════════════════════════════

def gen_risk_scoring_pipeline():
    fig, ax = new_figure(20, 13)

    txt(ax, 50, 98, 'Risk Scoring Pipeline', 22, WHITE, weight='bold')
    txt(ax, 50, 95, 'Unified Calibrated Model + Post-Model Intelligence', 12, TEAL)

    # ── Stage 1: Feature Extraction (left) ──
    container(ax, 1, 40, 22, 52, 'Feature Extraction', TEAL, ls='-', fontsize=10)

    groups = [
        ('URL / Email (25)', TEAL, 82),
        ('Custom Rules (9)', GREEN, 76),
        ('DNS (5)', YELLOW, 70),
        ('Deep Scan (13)', ORANGE, 64),
        ('BEC / Linkless (5)', PURPLE, 58),
        ('Attachment (5)', RED, 52),
        ('Context Flags (2)', GRAY, 46),
    ]
    for label, color, y in groups:
        glow_rect(ax, 3, y, 18, 4.5, color, lw=1.2)
        txt(ax, 12, y + 2.25, label, 6.5, color, weight='bold')

    # Arrow down to buildUnifiedVector
    for _, _, y in groups:
        arrow(ax, 21, y + 2.25, 23.5, y + 2.25, TEAL, lw=0.8)

    glow_rect(ax, 3, 40, 18, 3.5, TEAL, lw=1.5)
    txt(ax, 12, 41.75, 'buildUnifiedVector()', 6.5, TEAL, weight='bold')

    # Vertical connector bar
    ax.plot([23.5, 23.5], [44, 85], color=TEAL, linewidth=1.5, alpha=0.4, zorder=3)

    # ── Stage 2: Unified ML Model (center-top) ──
    container(ax, 26, 52, 28, 40, 'Unified ML Model', TEAL, ls='-', fontsize=10)

    steps = [
        ('64 Feature Vector', TEAL, 82),
        ('Z-Score Normalization\n(StandardScaler)', '#4488cc', 75),
        ('200 Decision Trees\n(max_depth=20)', '#4488cc', 67),
        ('Soft Vote\n(avg leaf probability)', '#4488cc', 59),
        ('Isotonic Calibration\n(lookup table interpolation)', TEAL, 53),
    ]

    prev_y = None
    for label, color, y in steps:
        glow_rect(ax, 29, y, 22, 5.5, color, lw=1.5)
        txt(ax, 40, y + 2.75, label, 7, WHITE, weight='bold')
        if prev_y is not None:
            arrow(ax, 40, prev_y, 40, y + 5.5, WHITE, lw=1.2)
        prev_y = y

    # Arrow out of calibration
    arrow(ax, 54, 55.75, 58, 55.75, TEAL, lw=2)

    # ── Score derivation ──
    glow_rect(ax, 58, 62, 18, 10, '#8b5cf6', lw=2)
    txt(ax, 67, 69.5, 'riskScore =', 9, WHITE, weight='bold')
    txt(ax, 67, 66.5, 'round(100 x prob)', 9, '#8b5cf6', weight='bold')
    txt(ax, 67, 63.5, 'calibrated probability', 6, GRAY)

    glow_rect(ax, 58, 52, 18, 7, GRAY_DIM, lw=1.2)
    txt(ax, 67, 56.5, 'confidence =', 7, WHITE, weight='bold')
    txt(ax, 67, 53.5, '|prob - 0.5| x 2', 7, TEAL)

    arrow(ax, 54, 53, 58, 55, GRAY, lw=1)

    # ── NEW: Post-Model Intelligence (center) ──
    container(ax, 26, 22, 50, 24, 'Post-Model Intelligence', PINK, ls='-', fontsize=10)

    glow_rect(ax, 28, 34, 14, 8, GREEN, lw=1.2)
    txt(ax, 35, 39.5, 'Trusted Domain?', 6, GREEN, weight='bold')
    txt(ax, 35, 36, '500+ built-in', 5, GRAY)
    txt(ax, 35, 34.5, '+ user custom', 5, GRAY)

    glow_rect(ax, 44, 34, 14, 8, YELLOW, lw=1.2)
    txt(ax, 51, 39.5, 'Free Provider?', 6, YELLOW, weight='bold')
    txt(ax, 51, 36.5, 'gmail, outlook,', 5, GRAY)
    txt(ax, 51, 35, 'icloud, yahoo...', 5, GRAY)

    glow_rect(ax, 60, 34, 14, 8, RED, lw=1.2)
    txt(ax, 67, 39.5, 'BEC / Attach', 6, RED, weight='bold')
    txt(ax, 67, 37, 'Rule Boosts', 6, RED, weight='bold')
    txt(ax, 67, 35, 'Floor 70-80', 5, GRAY)

    glow_rect(ax, 28, 24, 14, 7, GREEN, lw=1)
    txt(ax, 35, 28.5, 'Trusted Cap', 6, GREEN, weight='bold')
    txt(ax, 35, 25.5, 'Score <= 30', 5.5, WHITE)

    glow_rect(ax, 44, 24, 14, 7, YELLOW, lw=1)
    txt(ax, 51, 28.5, 'No Dampening', 6, YELLOW, weight='bold')
    txt(ax, 51, 25.5, 'Score unchanged', 5.5, WHITE)

    glow_rect(ax, 60, 24, 14, 7, ORANGE, lw=1)
    txt(ax, 67, 28.5, 'Newsletter Cap', 6, ORANGE, weight='bold')
    txt(ax, 67, 25.5, 'Score <= 45', 5.5, WHITE)

    arrow(ax, 35, 34, 35, 31.5, GREEN, lw=0.8)
    arrow(ax, 51, 34, 51, 31.5, YELLOW, lw=0.8)
    arrow(ax, 67, 34, 67, 31.5, ORANGE, lw=0.8)

    # Arrow from score to post-model
    arrow(ax, 67, 62, 51, 42.5, PINK, lw=1.5)

    # ── Fish classification (bottom row) ──
    fish = [
        ('0-49: Friendly Fish\nLow Risk', GREEN, 3),
        ('50-75: Suspicious Fish\nMedium Risk', ORANGE, 27),
        ('76-89: Phishy Puffer\nHigh Risk', RED, 51),
        ('90-100: Mega Phish Shark\nDangerous', '#ff1a1a', 75),
    ]
    for label, color, x in fish:
        glow_rect(ax, x, 3, 22, 7, color, lw=1.5)
        txt(ax, x + 11, 6.5, label, 6.5, color, weight='bold')

    # Arrows from post-model to fish
    arrow(ax, 35, 24, 14, 10.5, GREEN, lw=0.8)
    arrow(ax, 43, 24, 38, 10.5, ORANGE, lw=0.8)
    arrow(ax, 58, 24, 62, 10.5, RED, lw=0.8)
    arrow(ax, 67, 24, 86, 10.5, '#ff1a1a', lw=0.8)

    # ── AI Enhancement (right side, top) ──
    container(ax, 78, 50, 20, 22, 'AI (BYOK)', GREEN, fontsize=9)
    glow_rect(ax, 80, 60, 16, 6, GREEN, lw=1.2)
    txt(ax, 88, 64, 'shouldCallAi()', 6, GREEN, weight='bold')
    txt(ax, 88, 61.5, 'Gating Logic', 5, GRAY)

    glow_rect(ax, 80, 52, 16, 6, '#74aa9c', lw=1.2)
    txt(ax, 88, 56, 'AI Provider', 6, '#74aa9c', weight='bold')
    txt(ax, 88, 53, 'Features Only', 5, GRAY)

    arrow(ax, 88, 60, 88, 58.5, GREEN, lw=1)

    # Arrow from confidence to gating
    arrow(ax, 76, 55.5, 80, 63, GRAY_DIM, lw=0.8, dashed=True)

    save(fig, 'risk-scoring-pipeline.png')


# ═══════════════════════════════════════════════════════════
#  DIAGRAM 3 — ML Model Architecture
# ═══════════════════════════════════════════════════════════

def gen_ml_model_architecture():
    fig, ax = new_figure(20, 12)

    txt(ax, 50, 97, 'GoPhishFree — ML Model Architecture', 20, WHITE, weight='bold')
    txt(ax, 50, 94, 'Supervised Learning  ·  scikit-learn  ·  Random Forest + Isotonic Calibration', 10, TEAL)

    # SECTION labels
    sections = [
        ('SECTION 1', 8, 90), ('SECTION 2', 32, 90), ('SECTION 3', 57, 90),
        ('SECTION 4', 72, 90), ('SECTION 5', 89, 90),
    ]
    for label, x, y in sections:
        txt(ax, x, y, label, 6, GRAY_DIM, weight='bold')

    # ── Section 1: Training Data ──
    container(ax, 1, 52, 14, 36, 'Training Data', TEAL, ls='-', fontsize=8)
    glow_rect(ax, 2, 72, 12, 10, TEAL, lw=1)
    txt(ax, 8, 79, 'Kaggle Phishing', 6.5, WHITE, weight='bold')
    txt(ax, 8, 76.5, 'Dataset', 6.5, WHITE, weight='bold')
    txt(ax, 8, 74, 'Phishing_Legitimate_full.csv', 4.5, GRAY)

    txt(ax, 8, 70, '80/20 Stratified Split', 5.5, TEAL)
    txt(ax, 3.5, 66.5, '✓ Class 0: Legitimate', 5.5, GREEN, ha='left')
    txt(ax, 3.5, 64, '✗ Class 1: Phishing', 5.5, RED, ha='left')
    txt(ax, 3.5, 61, 'Binary Classification', 5, GRAY, ha='left')

    glow_rect(ax, 2.5, 54, 5.5, 5, GREEN, lw=1)
    txt(ax, 5.25, 56.5, 'Training\nSet (80%)', 4.5, GREEN, weight='bold')
    glow_rect(ax, 8.5, 54, 5.5, 5, ORANGE, lw=1)
    txt(ax, 11.25, 56.5, 'Test\nSet (20%)', 4.5, ORANGE, weight='bold')

    txt(ax, 8, 52.5, 'random_state=42', 4.5, GRAY_DIM)

    # Arrow to section 2
    arrow(ax, 15, 68, 17.5, 68, TEAL, lw=1.2)

    # ── Section 2: Feature Engineering — 64 Features ──
    container(ax, 17, 44, 30, 44, 'Feature Engineering — 64 Unified Features', TEAL, ls='-', fontsize=8)

    # URL Structure
    glow_rect(ax, 18, 72, 12, 14, TEAL, lw=1)
    txt(ax, 24, 84, 'URL Structure (9)', 6, TEAL, weight='bold')
    url_feats = ['NumDots', 'SubdomainLevel', 'PathLevel', 'UrlLength', 'NumDash',
                 'NumDashInHostname', 'HostnameLength', 'PathLength', 'QueryLength']
    for i, f in enumerate(url_feats):
        txt(ax, 24, 81.5 - i*1.05, f, 4.5, WHITE)

    # Special Characters
    glow_rect(ax, 31, 72, 10, 14, PURPLE, lw=1)
    txt(ax, 36, 84, 'Special Chars (7)', 5.5, PURPLE, weight='bold')
    sp_feats = ['AtSymbol', 'NumUnderscore', 'NumPercent', 'NumAmpersand',
                'NumHash', 'NumNumericChars', 'DoubleSlashInPath']
    for i, f in enumerate(sp_feats):
        txt(ax, 36, 81.5 - i*1.05, f, 4.5, WHITE)

    # Security & Patterns
    glow_rect(ax, 18, 56, 12, 14, YELLOW, lw=1)
    txt(ax, 24, 68.5, 'Patterns (9)', 5.5, YELLOW, weight='bold')
    pat_feats = ['NoHttps', 'IpAddress', 'Punycode', 'HasShortenedUrl',
                 'LinkMismatchRatio', 'NumSensitiveWords', 'NumLinks',
                 'AvgPathEntropy', 'SuspiciousTLD']
    for i, f in enumerate(pat_feats):
        txt(ax, 24, 66 - i*1.05, f, 4.5, WHITE)

    # Custom Rule inputs
    glow_rect(ax, 31, 63, 10, 7, ORANGE, lw=1)
    txt(ax, 36, 68.5, 'Custom Rules (5)', 5.5, ORANGE, weight='bold')
    cr_feats = ['HeaderMismatch', 'UrgencyScore', 'CredentialPhishing',
                'SecrecyLanguage', 'BrandInSubdomain']
    for i, f in enumerate(cr_feats):
        txt(ax, 36, 66.5 - i*1.05, f, 4.5, WHITE)

    # BEC / Linkless
    glow_rect(ax, 31, 54, 10, 7, PINK, lw=1)
    txt(ax, 36, 59.5, 'BEC/Linkless (5)', 5.5, PINK, weight='bold')
    bec_feats = ['FinancialRequest', 'AuthorityImperson', 'PhoneCallback',
                 'ReplyToMismatch', 'IsLinkless']
    for i, f in enumerate(bec_feats):
        txt(ax, 36, 58 - i*1.05, f, 4.5, WHITE)

    # Attachment
    glow_rect(ax, 18, 44, 12, 10, RED, lw=1)
    txt(ax, 24, 52.5, 'Attachment (5)', 5.5, RED, weight='bold')
    att_feats = ['HasAttachment', 'AttachmentCount', 'RiskyExtension',
                 'DoubleExtension', 'NameEntropy']
    for i, f in enumerate(att_feats):
        txt(ax, 24, 51 - i*1.05, f, 4.5, WHITE)

    # Content Analysis
    glow_rect(ax, 31, 46.5, 10, 6, GREEN, lw=1)
    txt(ax, 36, 51.5, 'Context (2)', 5.5, GREEN, weight='bold')
    ctx_feats = ['dns_ran', 'deep_scan_ran']
    for i, f in enumerate(ctx_feats):
        txt(ax, 36, 50 - i*1.05, f, 4.5, WHITE)

    # Arrow to section 3
    arrow(ax, 42, 68, 44, 68, TEAL, lw=1.2)

    # ── Section 3: Preprocessing ──
    container(ax, 48, 58, 12, 30, 'Preprocessing', TEAL, ls='-', fontsize=8)
    glow_rect(ax, 49, 72, 10, 10, '#4488cc', lw=1.2)
    txt(ax, 54, 79.5, 'StandardScaler', 7, '#88bbee', weight='bold')
    txt(ax, 54, 77, '(Z-Score Normalization)', 5, GRAY)
    # Z-score formula
    txt(ax, 54, 74, 'z = (x − μ) / σ', 8, WHITE, weight='bold')

    glow_rect(ax, 49, 60, 10, 8, GRAY_DIM, lw=1)
    txt(ax, 54, 65.5, 'fillna(0) —', 6, WHITE, weight='bold')
    txt(ax, 54, 63, 'Missing Value', 5.5, GRAY)
    txt(ax, 54, 61, 'Imputation', 5.5, GRAY)

    # Arrow to section 4
    arrow(ax, 60, 75, 63, 75, TEAL, lw=1.2)

    # ── Section 4: Random Forest + Calibration ──
    container(ax, 63, 52, 16, 36, 'Random Forest\n+ Calibration', TEAL, ls='-', fontsize=8)

    glow_rect(ax, 64, 72, 14, 10, TEAL, lw=1.5)
    txt(ax, 71, 79.5, 'Soft Vote', 8, TEAL, weight='bold')
    txt(ax, 71, 77, '(Average Probability)', 5.5, GRAY)
    txt(ax, 71, 74, '200 Trees', 7, WHITE, weight='bold')

    # Hyperparameters
    glow_rect(ax, 64, 60, 14, 10, GRAY_DIM, lw=1)
    txt(ax, 65, 67.5, 'n_estimators = 200', 5, WHITE, ha='left')
    txt(ax, 65, 65.5, 'max_depth = 20', 5, WHITE, ha='left')
    txt(ax, 65, 63.5, 'min_samples_leaf = 2', 5, WHITE, ha='left')
    txt(ax, 65, 61.5, 'random_state = 42', 5, WHITE, ha='left')

    # Isotonic calibration
    glow_rect(ax, 64, 53, 14, 6, TEAL, lw=1.5)
    txt(ax, 71, 57, 'CalibratedClassifierCV', 5.5, TEAL, weight='bold')
    txt(ax, 71, 54.5, '(Isotonic, 5-fold CV)', 5, WHITE)

    arrow(ax, 71, 72, 71, 70.5, WHITE, lw=1)
    arrow(ax, 71, 60, 71, 59.5, TEAL, lw=1)

    # Arrow to section 5
    arrow(ax, 79, 75, 82, 75, TEAL, lw=1.2)

    # ── Section 5: Model Evaluation ──
    container(ax, 82, 58, 16, 30, 'Model Evaluation', TEAL, ls='-', fontsize=8)

    glow_rect(ax, 83.5, 80, 13, 5, '#4488cc', lw=1)
    txt(ax, 90, 82.5, '5-Fold Cross Validation', 6, WHITE, weight='bold')

    glow_rect(ax, 83.5, 72.5, 13, 6, GREEN, lw=1.5)
    txt(ax, 90, 77, '~95.5% Test Accuracy', 7, GREEN, weight='bold')
    txt(ax, 90, 74, '(Unified Model)', 5.5, GRAY)

    glow_rect(ax, 83.5, 65.5, 13, 5.5, '#4488cc', lw=1)
    txt(ax, 90, 68.5, 'Precision, Recall,', 5.5, WHITE, weight='bold')
    txt(ax, 90, 66.5, 'F1-Score, Confusion Matrix', 4.5, GRAY)

    glow_rect(ax, 83.5, 59, 13, 5.5, ORANGE, lw=1)
    txt(ax, 90, 62, 'Per-Type Evaluation:', 5, ORANGE, weight='bold')
    txt(ax, 90, 60, 'URL, BEC, Attach, DeepScan', 4.5, GRAY)

    # ── Section 6: DNS + Deep Scan Extension (bottom) ──
    txt(ax, 4, 40, 'SECTION 6', 6, GRAY_DIM, weight='bold', ha='left')
    txt(ax, 12, 40, 'DNS Extension (+5 features)', 7, YELLOW, weight='bold', ha='left')
    dns_feats = ['DomainExists', 'MXRecordCount', 'ARecordCount', 'RandomStringDomain', 'HasMXRecord']
    for i, f in enumerate(dns_feats):
        glow_rect(ax, 2 + i*11.5, 34, 10, 4, YELLOW, lw=0.8)
        txt(ax, 7 + i*11.5, 36, f, 4.5, YELLOW, weight='bold')

    txt(ax, 4, 31, 'SECTION 7', 6, GRAY_DIM, weight='bold', ha='left')
    txt(ax, 12, 31, 'Deep Scan Extension (+13 Page Features = 38 Total with original)', 7, ORANGE, weight='bold', ha='left')
    deep_feats = ['InsecureForms', 'RelativeFormAction', 'ExtFormAction', 'AbnormalFormAction',
                  'SubmitInfoToEmail', 'PctExtHyperlinks', 'PctExtResourceUrls', 'ExtFavicon']
    for i, f in enumerate(deep_feats):
        glow_rect(ax, 2 + i*12.3, 25, 11.5, 4, ORANGE, lw=0.8)
        txt(ax, 7.75 + i*12.3, 27, f, 4.5, ORANGE, weight='bold')

    deep_feats2 = ['PctNullSelfRedirect', 'IframeOrEmbed', 'MissingTitle', 'ImagesOnlyInForm', 'EmbeddedBrandName']
    for i, f in enumerate(deep_feats2):
        glow_rect(ax, 2 + i*14, 20, 13, 4, ORANGE, lw=0.8)
        txt(ax, 8.5 + i*14, 22, f, 4.5, ORANGE, weight='bold')

    # ── Section 8: Browser Deployment ──
    txt(ax, 72, 47, 'SECTION 8', 6, GRAY_DIM, weight='bold', ha='left')
    txt(ax, 80, 47, 'Browser Deployment', 8, TEAL, weight='bold', ha='left')

    glow_rect(ax, 63, 8, 35, 10, TEAL, lw=1)
    txt(ax, 80.5, 16, 'Export to JSON → model_unified.json', 6.5, WHITE, weight='bold')
    txt(ax, 80.5, 13.5, 'In-browser inference: traverse 200 trees', 5.5, GRAY)
    txt(ax, 80.5, 11.5, '→ soft vote → isotonic calibration → probability (0.0–1.0)', 5.5, GRAY)

    glow_rect(ax, 63, 2, 35, 5, TEAL, lw=1.5)
    txt(ax, 80.5, 4.5, 'Risk Score = round(100 × calibrated_probability)', 7, TEAL, weight='bold')

    save(fig, 'ai-model-architecture.png')


# ═══════════════════════════════════════════════════════════
#  DIAGRAM 4 — Email Scan Sequence
# ═══════════════════════════════════════════════════════════

def gen_email_scan_sequence():
    fig, ax = new_figure(22, 14)

    txt(ax, 50, 97, 'Email Scan Sequence Diagram', 20, WHITE, weight='bold')
    txt(ax, 50, 94.5, 'Unified Model + AI Enhancement', 11, TEAL)

    # Actors (top + bottom bars)
    actors = [
        ('User', 6, GRAY_DIM),
        ('Gmail DOM', 16, GRAY_DIM),
        ('content.js', 28, TEAL),
        ('FeatureExtractor', 40, GREEN),
        ('DnsChecker', 52, YELLOW),
        ('Unified Model', 63, TEAL),
        ('background.js', 75, ORANGE),
        ('AI Provider', 87, GREEN),
        ('chrome.storage', 96, '#88bbee'),
    ]

    for name, x, color in actors:
        glow_rect(ax, x-5.5, 89, 11, 4, color, lw=1.2)
        txt(ax, x, 91, name, 6, color, weight='bold')
        glow_rect(ax, x-5.5, 3, 11, 4, color, lw=1.2)
        txt(ax, x, 5, name, 6, color, weight='bold')
        # Lifeline
        ax.plot([x, x], [7, 89], color=color, linewidth=0.5, alpha=0.2, zorder=1)

    # Sequence messages (from_x, to_x, label, y, color, dashed?)
    msgs = [
        (6, 16, 'Opens email', 86, WHITE, False),
        (16, 28, 'URL change detected', 83, WHITE, False),
        (28, 28, 'showLoadingBadge()', 80.5, YELLOW, False),
        (28, 16, 'extractEmailData()', 78, WHITE, False),
        (16, 28, '{ sender, links, text, attachments }', 75.5, GRAY, False),
        (28, 40, 'extractEmailFeatures()', 73, TEAL, False),
        (40, 28, '44 email-level features', 70.5, TEAL, False),
        (28, 52, 'checkDomains() [Tier 2]', 67.5, YELLOW, True),
        (52, 28, 'DNS features', 65, YELLOW, True),
        (28, 40, 'buildUnifiedVector(features, dns, null, flags)', 62, TEAL, False),
        (40, 28, '64-element feature vector', 59.5, TEAL, False),
        (28, 63, 'predictWithCalibratedForest()', 57, TEAL, False),
        (63, 28, 'calibratedProb', 54.5, TEAL, False),
        (28, 28, 'riskScore = round(100 × prob)', 52, PURPLE, False),
        (28, 28, 'confidence = |prob − 0.5| × 2', 49.5, GRAY, False),
        (28, 28, 'deriveReasons() [informational only]', 47, GRAY, False),
        (28, 16, 'Display risk badge + side panel', 44, WHITE, False),
        (28, 75, 'saveScanResult', 41, ORANGE, False),
        (75, 96, 'Update history + fish collection', 38.5, '#88bbee', False),
        # AI Enhancement section
        (28, 28, 'shouldCallAi()? — gating check', 35, GREEN, False),
        (28, 28, 'buildAiPayload() — features-only JSON', 32.5, GREEN, False),
        (28, 75, 'sendMessage("runAiAnalysis", payload)', 30, GREEN, False),
        (75, 87, 'API call (features-only JSON)', 27.5, GREEN, False),
        (87, 75, '{ aiRiskScore, riskTier, topSignals }', 25, GREEN, False),
        (75, 75, 'validateAiResponse()', 22.5, ORANGE, False),
        (75, 28, 'validated AI result', 20, GREEN, False),
        (28, 16, 'Display AI score + agreement badge', 17.5, GREEN, False),
    ]

    for x1, x2, label, y, color, dashed in msgs:
        if x1 == x2:
            # Self-message
            ax.annotate('', xy=(x1+3, y-0.5), xytext=(x1+3, y+0.5),
                        arrowprops=dict(arrowstyle='->', color=color, lw=0.8),
                        zorder=3)
            txt(ax, x1+4, y+0.5, label, 5, color, ha='left')
        else:
            arrow(ax, x1, y, x2, y, color, lw=1, dashed=dashed)
            mid = (x1 + x2) / 2
            txt(ax, mid, y+1, label, 5, color)

    # "optional" label
    txt(ax, 45, 68.5, 'optional', 4.5, YELLOW, alpha=0.7)

    # Separator for AI section
    ax.plot([3, 97], [36.5, 36.5], color=GREEN, linewidth=0.5, alpha=0.3,
            linestyle='--', zorder=2)
    txt(ax, 97, 36.5, 'AI Enhancement', 5, GREEN, ha='right', alpha=0.5)

    save(fig, 'email-scan-sequence-diagram.png')


# ═══════════════════════════════════════════════════════════
#  DIAGRAM 5 — Class Diagram
# ═══════════════════════════════════════════════════════════

def gen_class_diagram():
    fig, ax = new_figure(20, 12)

    txt(ax, 50, 97, 'Class Diagram', 20, WHITE, weight='bold')
    txt(ax, 50, 94, 'Feature Extraction Module', 12, TEAL)

    # ── FeatureExtractor ──
    glow_rect(ax, 2, 38, 40, 52, TEAL, lw=2)
    txt(ax, 22, 88, 'FeatureExtractor', 12, TEAL, weight='bold')
    ax.plot([4, 40], [86, 86], color=TEAL, linewidth=0.8, alpha=0.5, zorder=5)

    # Attributes
    fe_attrs = [
        'suspiciousTLDs: Set<string>',
        'shortenerDomains: Set<string>',
        'urgencyKeywords: string[]',
        'credentialKeywords: string[]',
        'financialKeywords: string[]',
        'authorityKeywords: string[]',
        'riskyExtensions: Set<string>',
    ]
    for i, a in enumerate(fe_attrs):
        txt(ax, 5, 83.5 - i*2.2, a, 5.5, GRAY, ha='left', family='monospace')

    ax.plot([4, 40], [67, 67], color=TEAL, linewidth=0.8, alpha=0.5, zorder=5)

    # Methods
    fe_methods = [
        'extractURLFeatures(url): Object',
        'extractEmailFeatures(emailData): Object',
        'aggregateURLFeatures(links): Object',
        'countLinkMismatches(links): number',
        'calculateLinkMismatchRatio(links): number',
        'detectHeaderMismatch(name, domain): number',
        'calculateUrgencyScore(text): number',
        'calculateCredentialRequestScore(text): number',
        'calculateFinancialRequestScore(text): number',
        'calculateAuthorityImpersonationScore(text): number',
        'detectPhoneCallbackPattern(text): number',
        'detectReplyToMismatch(replyTo, domain): number',
        'hasRiskyAttachmentExtension(attachments): number',
        'hasDoubleExtension(attachments): number',
        'calculateAttachmentNameEntropy(attachments): number',
        'buildUnifiedVector(features, dns, page, flags): number[64]',
    ]
    for i, m in enumerate(fe_methods):
        color = TEAL if 'buildUnifiedVector' in m else (PINK if any(k in m for k in ['Financial', 'Authority', 'Phone', 'ReplyTo', 'Risky', 'Double', 'Entropy']) else WHITE)
        txt(ax, 5, 64.5 - i*1.65, m, 5, color, ha='left', family='monospace')

    # ── DnsChecker ──
    glow_rect(ax, 56, 64, 22, 26, ORANGE, lw=2)
    txt(ax, 67, 88, 'DnsChecker', 12, ORANGE, weight='bold')
    ax.plot([58, 76], [86, 86], color=ORANGE, linewidth=0.8, alpha=0.5, zorder=5)

    dns_attrs = ['cache: Map<string, Object>', 'CACHE_TTL: 5min', 'TIMEOUT: 4s']
    for i, a in enumerate(dns_attrs):
        txt(ax, 59, 83.5 - i*2.2, a, 5.5, GRAY, ha='left', family='monospace')

    ax.plot([58, 76], [76.5, 76.5], color=ORANGE, linewidth=0.8, alpha=0.5, zorder=5)

    dns_methods = [
        'checkDomain(domain): Promise<Object>',
        'checkDomains(domains): Promise<Object>',
        'dnsQuery(domain, type): Promise<Object>',
        'isRandomString(domain): boolean',
        'shannonEntropy(str): number',
    ]
    for i, m in enumerate(dns_methods):
        txt(ax, 59, 74 - i*2, m, 5, WHITE, ha='left', family='monospace')

    # ── PageAnalyzer ──
    glow_rect(ax, 2, 6, 40, 28, RED, lw=2)
    txt(ax, 22, 32, 'PageAnalyzer', 12, RED, weight='bold')
    ax.plot([4, 40], [30, 30], color=RED, linewidth=0.8, alpha=0.5, zorder=5)

    pa_attrs = ['brandNames: string[]']
    for i, a in enumerate(pa_attrs):
        txt(ax, 5, 27.5 - i*2.2, a, 5.5, GRAY, ha='left', family='monospace')

    ax.plot([4, 40], [25, 25], color=RED, linewidth=0.8, alpha=0.5, zorder=5)

    pa_methods = [
        'extractFeatures(doc, pageUrl): Object',
        'detectInsecureForms(doc): number',
        'detectExtFormAction(doc, domain): number',
        'detectAbnormalFormAction(doc): number',
        'calcPctExtHyperlinks(doc, domain): number',
        'calcPctExtResourceUrls(doc, domain): number',
        'detectIframeOrFrame(doc): number',
        'detectEmbeddedBrand(doc, domain): number',
        'defaultFeatures(): Object',
    ]
    for i, m in enumerate(pa_methods):
        txt(ax, 5, 23 - i*1.8, m, 5, WHITE, ha='left', family='monospace')

    # ── FishEntity ──
    glow_rect(ax, 56, 6, 22, 52, PURPLE, lw=2)
    txt(ax, 67, 56, 'FishEntity', 12, PURPLE, weight='bold')
    ax.plot([58, 76], [54, 54], color=PURPLE, linewidth=0.8, alpha=0.5, zorder=5)

    fish_attrs = [
        'type: string', 'w, h: number (dimensions)',
        'x, y: number (position)', 'vx, vy: number (velocity)',
        'scale: number', 'currentScaleX: number',
        'targetScaleX: number', 'courseTimer: number',
        'el: HTMLElement',
    ]
    for i, a in enumerate(fish_attrs):
        txt(ax, 59, 51.5 - i*2.2, a, 5.5, GRAY, ha='left', family='monospace')

    ax.plot([58, 76], [30, 30], color=PURPLE, linewidth=0.8, alpha=0.5, zorder=5)

    fish_methods = [
        'update(dt): void',
        'destroy(): void',
        '_randomizeAnimations(): void',
        '_schedulePuff(): void',
    ]
    for i, m in enumerate(fish_methods):
        txt(ax, 59, 27.5 - i*2.2, m, 5.5, WHITE, ha='left', family='monospace')

    # Relationship lines
    ax.plot([42, 56], [75, 75], color=WHITE, linewidth=1, alpha=0.4,
            linestyle='--', zorder=3)
    txt(ax, 49, 76.5, 'used together', 5.5, GRAY)

    ax.plot([22, 22], [38, 34.5], color=WHITE, linewidth=1, alpha=0.4,
            linestyle='--', zorder=3)
    txt(ax, 28, 36, 'used together', 5.5, GRAY, ha='left')

    save(fig, 'class-diagram.png')


# ═══════════════════════════════════════════════════════════
#  DIAGRAM 6 — AI Enhancement Flow
# ═══════════════════════════════════════════════════════════

def gen_ai_enhancement_flow():
    fig, ax = new_figure()

    txt(ax, 50, 97, 'AI Enhancement Flow (BYOK)', 20, WHITE, weight='bold')
    txt(ax, 50, 94, 'Features-Only · No Email Content · Strict JSON Schema', 10, TEAL)

    # ── User Configuration (top-left) ──
    container(ax, 2, 70, 28, 22, 'User Configuration', TEAL, ls='-', fontsize=9)

    glow_rect(ax, 4, 78, 12, 8, TEAL, lw=1.2)
    txt(ax, 10, 83, 'Enhance with AI', 7, TEAL, weight='bold')
    txt(ax, 10, 80, 'Toggle (popup.html)', 5.5, GRAY)

    glow_rect(ax, 18, 78, 10, 8, PURPLE, lw=1.2)
    txt(ax, 23, 83, 'Configure AI', 7, PURPLE, weight='bold')
    txt(ax, 23, 80, 'Modal', 5.5, GRAY)

    glow_rect(ax, 4, 72, 24, 4.5, '#4488cc', lw=1)
    txt(ax, 16, 74.25, 'chrome.storage.local  (keys NEVER synced)', 5.5, '#88bbee')

    arrow(ax, 16, 78, 18, 82, TEAL, lw=0.8)

    # ── Gating Logic (top-right) ──
    container(ax, 32, 70, 30, 22, 'Gating Logic — shouldCallAi()', YELLOW, ls='-', fontsize=9)

    glow_rect(ax, 34, 72, 26, 12, YELLOW, lw=1.5)
    txt(ax, 47, 82.5, 'Call AI if ANY condition is true:', 7, YELLOW, weight='bold')
    conditions = [
        'Local risk score in uncertain range (30-80)',
        'Local confidence below 0.6',
        'Deep scan found form / password / off-domain action',
        'Risky attachment present (dangerous extensions)',
        'Reply-to domain mismatch detected',
    ]
    for i, c in enumerate(conditions):
        txt(ax, 36, 80 - i*1.8, f'•  {c}', 5, WHITE, ha='left')

    glow_rect(ax, 34, 72, 12, 4, GREEN, lw=1)
    txt(ax, 40, 74, '→ Proceed to AI', 5.5, GREEN, weight='bold')

    glow_rect(ax, 48, 72, 12, 4, GRAY_DIM, lw=1)
    txt(ax, 54, 74, '→ Skip (confident)', 5.5, GRAY)

    # ── Payload Construction (middle-left) ──
    container(ax, 2, 22, 28, 44, 'Features-Only Payload', GREEN, ls='-', fontsize=9)
    txt(ax, 16, 62, 'buildAiPayload()', 9, GREEN, weight='bold')

    payload_sections = [
        ('email_signals', 'reply_to_mismatch, from_domain', TEAL, 57),
        ('url_signals', 'link_count, domains, shortener, entropy', TEAL, 52),
        ('language_cues', 'urgency, credential, financial, callback', PURPLE, 47),
        ('attachment_signals', 'has_attachment, risky_ext, double_ext', RED, 42),
        ('dns_signals', 'dns_ran, domain_resolves, mx_present', YELLOW, 37),
        ('deep_scan_signals', 'has_form, password_input, off_domain', ORANGE, 32),
        ('local_model', 'risk_score, confidence, top_reasons', '#4488cc', 27),
    ]
    for name, desc, color, y in payload_sections:
        glow_rect(ax, 4, y, 24, 4, color, lw=0.8)
        txt(ax, 7, y + 2.5, name, 5.5, color, weight='bold', ha='left')
        txt(ax, 7, y + 0.8, desc, 4, GRAY, ha='left')

    glow_rect(ax, 4, 23, 24, 3, RED, lw=1.5)
    txt(ax, 16, 24.5, 'NO body · NO subject · NO sender address', 5.5, RED, weight='bold')

    # Arrow from gating to payload
    arrow(ax, 40, 72, 16, 64, GREEN, lw=1.2)

    # ── Provider Adapters (middle-right) ──
    container(ax, 34, 28, 30, 36, 'Provider Adapters (background.js)', ORANGE, ls='-', fontsize=9)

    provs = [
        ('callOpenAI()', '#74aa9c', 53), ('callAnthropic()', '#d4a574', 48),
        ('callGoogle()', '#4285f4', 43), ('callAzureOpenAI()', '#7b68ee', 38),
        ('callCustom()', GRAY, 33),
    ]
    for name, color, y in provs:
        glow_rect(ax, 36, y, 14, 4, color, lw=1)
        txt(ax, 43, y + 2, name, 6, color, weight='bold')

    glow_rect(ax, 52, 38, 10, 20, '#4488cc', lw=1.2)
    txt(ax, 57, 55, 'System', 6, '#88bbee', weight='bold')
    txt(ax, 57, 52.5, 'Prompt', 6, '#88bbee', weight='bold')
    txt(ax, 57, 49.5, '————', 4, GRAY)
    txt(ax, 57, 47, 'No tools', 5, WHITE)
    txt(ax, 57, 45, 'No browsing', 5, WHITE)
    txt(ax, 57, 43, 'No links', 5, WHITE)
    txt(ax, 57, 41, 'JSON only', 5, WHITE)

    # Arrow from payload to providers
    arrow(ax, 28, 45, 36, 45, GREEN, lw=1.2)

    # ── Response Validation (bottom-right) ──
    container(ax, 68, 22, 30, 44, 'Response Validation', '#4488cc', ls='-', fontsize=9)

    glow_rect(ax, 70, 48, 26, 14, '#4488cc', lw=1.5)
    txt(ax, 83, 60, 'Strict JSON Schema:', 7, '#88bbee', weight='bold')
    schema_fields = [
        '"aiRiskScore": 0-100',
        '"riskTier": "Safe|Caution|Suspicious|Dangerous"',
        '"phishType": ["URL-Credential|BEC|Callback|..."]',
        '"topSignals": ["...", "...", "..."]',
        '"confidence": 0-1',
        '"notes": "one short sentence"',
    ]
    for i, f in enumerate(schema_fields):
        txt(ax, 72, 57 - i*1.8, f, 4.5, WHITE, ha='left', family='monospace')

    glow_rect(ax, 70, 38, 12, 8, GREEN, lw=1.5)
    txt(ax, 76, 43, 'Valid ✓', 8, GREEN, weight='bold')
    txt(ax, 76, 40, 'Display AI Score', 5.5, WHITE)

    glow_rect(ax, 84, 38, 12, 8, RED, lw=1.5)
    txt(ax, 90, 43, 'Invalid ✗', 8, RED, weight='bold')
    txt(ax, 90, 40, '"AI unavailable"', 5.5, GRAY)

    # Agreement Badge
    glow_rect(ax, 70, 24, 26, 10, TEAL, lw=1.5)
    txt(ax, 83, 32, 'Agreement Badge', 8, TEAL, weight='bold')
    txt(ax, 83, 29, '|AI score − local score| > 20  →  "Needs review"', 5.5, YELLOW)
    txt(ax, 83, 26.5, 'Otherwise  →  "Aligned"', 5.5, GREEN)

    # Arrows
    arrow(ax, 50, 45, 70, 55, ORANGE, lw=1.2)  # providers -> validation
    arrow(ax, 76, 38, 76, 34.5, GREEN, lw=1)
    arrow(ax, 90, 38, 90, 34.5, RED, lw=0.8)

    save(fig, 'ai-enhancement-flow.png')


# ═══════════════════════════════════════════════════════════
#  PDF — Architecture Document
# ═══════════════════════════════════════════════════════════

def gen_architecture_pdf():
    """Generate the architecture document PDF using fpdf2."""
    try:
        from fpdf import FPDF
    except ImportError:
        print("  !! fpdf2 not installed — generating PDF with matplotlib fallback")
        gen_architecture_pdf_fallback()
        return

    class ArchPDF(FPDF):
        def header(self):
            if self.page_no() > 1:
                self.set_font('Helvetica', 'I', 8)
                self.set_text_color(120, 120, 120)
                self.cell(0, 5, 'GoPhishFree - Architecture Document | EECS582 Capstone', align='L')
                self.ln(8)

        def footer(self):
            self.set_y(-15)
            self.set_font('Helvetica', 'I', 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

        def section_heading(self, num, title):
            self.set_font('Helvetica', 'B', 14)
            self.set_text_color(30, 60, 90)
            self.cell(0, 10, f'{num}. {title}', new_x='LMARGIN', new_y='NEXT')
            self.ln(2)

        def body_text(self, text):
            self.set_font('Helvetica', '', 10)
            self.set_text_color(40, 40, 40)
            self.multi_cell(0, 5.5, text)
            self.ln(2)

        def figure_ref(self, caption):
            self.set_font('Helvetica', 'I', 9)
            self.set_text_color(80, 80, 80)
            self.cell(0, 6, caption, new_x='LMARGIN', new_y='NEXT')
            self.ln(2)

    pdf = ArchPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ── Title Page ──
    pdf.add_page()
    pdf.ln(40)
    pdf.set_font('Helvetica', 'B', 28)
    pdf.set_text_color(30, 60, 90)
    pdf.cell(0, 15, 'GoPhishFree', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 18)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 12, 'Architecture Document', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(10)
    pdf.set_font('Helvetica', '', 11)
    pdf.set_text_color(80, 80, 80)
    info = [
        'Course: EECS 582 - Capstone Project',
        'Team Number: 24',
        'Team Members: Ty Farrington, Brett Suhr, Andrew Reyes, Nicholas Holmes, Kaleb Howard',
        'Project Name: GoPhishFree',
        'Date: February 2026',
    ]
    for line in info:
        pdf.cell(0, 7, line, align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(10)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(30, 82, 118)
    pdf.cell(0, 8, 'Project Synopsis', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 5.5,
        'A privacy-first Chrome extension that detects phishing emails in Gmail using a '
        'unified 64-feature calibrated Random Forest model with optional cloud AI enhancement '
        '(BYOK). All core ML processing runs locally; AI receives only extracted signal features '
        '- never email body, subject, or sender address.', align='C')

    # ── Section 1: System Overview ──
    pdf.add_page()
    pdf.section_heading('1', 'System Overview')
    pdf.body_text(
        'GoPhishFree is a Chrome Manifest V3 extension that scans emails in real time as users '
        'read them in Gmail. The entire detection pipeline - feature extraction, machine-learning '
        'inference, and risk scoring - executes locally inside the browser, ensuring that no email '
        'content ever leaves the user\'s device. The system is composed of five major components: '
        'a Gmail content script that orchestrates unified scanning and renders the UI, a feature '
        'extraction module that derives 64 numerical signals across 7 groups (URL, custom rules, '
        'DNS, page structure, BEC/linkless, attachment, and context flags), a background service '
        'worker that manages storage, proxies network requests, and hosts AI provider adapters, '
        'a popup dashboard that presents a gamified "fish tank" collection and AI configuration, '
        'and an optional cloud AI enhancement layer that provides a second opinion using '
        'features-only payloads via the user\'s own API key (BYOK).')
    pdf.figure_ref(
        'Figure 1 - System Architecture: High-level component map showing content scripts, '
        'service worker, popup, AI providers, and external services.')

    # Embed image
    img_path = os.path.join(OUT_DIR, 'system-architecture.png')
    if os.path.exists(img_path):
        pdf.image(img_path, w=180)
        pdf.ln(4)

    # ── Section 2: Unified Detection Pipeline ──
    pdf.add_page()
    pdf.section_heading('2', 'Unified Detection Pipeline')
    pdf.body_text(
        'Detection is organized into three progressive tiers, each adding deeper analysis. Unlike '
        'the previous approach with separate models and post-hoc rule adjustments, the current '
        'architecture uses a single unified Random Forest model that accepts all 64 features in '
        'one pass. Features from unavailable tiers (e.g., DNS not run, Deep Scan not triggered) '
        'are default-filled with 0 and signaled via context flags (dns_ran, deep_scan_ran).')

    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, 'Tier 1 - Email Analysis (always active)', new_x='LMARGIN', new_y='NEXT')
    pdf.body_text(
        'When a user opens an email, the content script extracts the sender address, display name, '
        'body text, attachment metadata, and every hyperlink. The FeatureExtractor class computes '
        '25 URL lexical features, 9 custom rule features (urgency, credential requests, secrecy '
        'language, suspicious TLD, header mismatch), 5 BEC/linkless features (financial request '
        'scoring, authority impersonation, phone callback patterns, reply-to mismatch, linkless '
        'detection), and 5 attachment features (risky extensions, double extensions, filename entropy). '
        'All features are assembled into a 64-element vector via buildUnifiedVector().')

    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, 'Tier 2 - DNS Validation (enabled by default)', new_x='LMARGIN', new_y='NEXT')
    pdf.body_text(
        'If Enhanced Scanning is toggled on (the default), GoPhishFree queries Cloudflare\'s '
        'DNS-over-HTTPS resolver (with Google DNS as a fallback) for the sender\'s domain and '
        'every linked domain. Five DNS features are derived: whether the domain resolves, MX '
        'record count, A record count, whether the domain label is a random string based on Shannon '
        'entropy analysis, and whether MX records are present. Results are cached with a 10-minute TTL. '
        'The dns_ran context flag is set to 1 when DNS features are populated.')

    pdf.set_font('Helvetica', 'B', 11)
    pdf.cell(0, 7, 'Tier 3 - Deep Scan (user-initiated)', new_x='LMARGIN', new_y='NEXT')
    pdf.body_text(
        'Users may optionally trigger a Deep Scan, which fetches the raw HTML of up to 10 linked '
        'pages through the background service worker. The fetch is sandboxed: credentials are omitted, '
        'responses are capped at 2 MB, content-type is validated, redirects are checked, and no '
        'JavaScript is executed. The PageAnalyzer class extracts 13 page-structure features. The '
        'deep_scan_ran context flag is set to 1 and the unified model re-scores with the expanded vector.')

    # ── Section 3: Machine Learning Model ──
    pdf.add_page()
    pdf.section_heading('3', 'Machine Learning Model')
    pdf.body_text(
        'GoPhishFree uses supervised learning with scikit-learn\'s RandomForestClassifier wrapped in '
        'CalibratedClassifierCV for binary classification (legitimate vs. phishing). The training '
        'dataset is augmented from approximately 10,000 Kaggle samples to ~36,000 by generating '
        'scan-scenario variants (base, DNS-augmented, full) as well as synthetic BEC phishing, '
        'attachment phishing, legitimate newsletter, and transactional email samples to teach the '
        'model to handle all phishing types and missing feature groups gracefully.')
    pdf.body_text(
        'Preprocessing consists of selecting the 64 unified feature columns, imputing missing values '
        'with zero, and applying StandardScaler Z-score normalization. The classifier is configured '
        'with 200 estimators, a maximum tree depth of 20, a minimum of 2 samples per leaf, and '
        'parallel training across all CPU cores. CalibratedClassifierCV applies isotonic regression '
        'with 5-fold cross-validation to ensure well-calibrated probabilities.')
    pdf.body_text(
        'Model evaluation uses classification reports, confusion matrix, feature importance analysis, '
        'and per-phishing-type evaluation (URL-credential, BEC-linkless, attachment-led, deep scan '
        'impersonation). The unified model achieves approximately 96.6% test accuracy with 100%% '
        'detection on synthetic BEC/linkless and attachment-led phishing samples.')
    pdf.body_text(
        'After training, the full Random Forest structure - every tree\'s split features, thresholds, '
        'child pointers, and leaf probabilities - is exported to JSON along with the scaler parameters '
        'and the isotonic calibration lookup table (x_values, y_values). At runtime the content script '
        'performs inference by traversing all 200 trees, averaging leaf probabilities (soft voting), '
        'and interpolating through the calibration lookup to produce a calibrated probability.')

    pdf.figure_ref(
        'Figure 3 - ML Model Architecture: End-to-end pipeline from training data through '
        '64-feature engineering, preprocessing, Random Forest + isotonic calibration, evaluation, '
        'and browser deployment.')
    img_path = os.path.join(OUT_DIR, 'ai-model-architecture.png')
    if os.path.exists(img_path):
        pdf.image(img_path, w=180)
        pdf.ln(4)

    # ── Section 4: Risk Score Composition ──
    pdf.add_page()
    pdf.section_heading('4', 'Risk Score Composition & Post-Model Intelligence')
    pdf.body_text(
        'The base risk score is computed as: riskScore = round(100 x calibrated_probability). '
        'Features that were formerly separate rules (urgency score, credential request score, '
        'suspicious TLD, header mismatch) are now direct model inputs, allowing the Random '
        'Forest to learn optimal weighting from data.')
    pdf.body_text(
        'After the ML model produces its calibrated score, a post-model intelligence layer '
        'applies targeted adjustments. BEC rule boosts raise the floor to 70-80 for emails '
        'exhibiting strong financial request, authority impersonation, or phone callback signals. '
        'Trusted domain dampening caps the score at 30 for emails from the 500+ built-in trusted '
        'corporate domains (or user-added custom domains) when no BEC or attachment signals are '
        'present. Newsletter detection caps scores at 45 for emails exhibiting unsubscribe links, '
        '"view in browser" patterns, and newsletter footer text from non-trusted domains.')
    pdf.body_text(
        'Critically, free/public email providers (gmail.com, outlook.com, icloud.com, yahoo.com, '
        'protonmail.com, hotmail.com, etc.) are explicitly excluded from trusted domain dampening. '
        'Anyone can register on these services, so a phishing email from scammer@gmail.com is '
        'scored on its own merits without any dampening. This distinction is maintained by a '
        'separate FREE_EMAIL_PROVIDERS set.')
    pdf.body_text(
        'Users can manage trusted domains through the popup settings UI: adding custom trusted '
        'domains (which will receive dampening) or blocking built-in trusted domains (overriding '
        'the whitelist). Changes propagate instantly to the content script via chrome.storage '
        'change listeners. The priority order is: user blocked > user trusted > built-in list.')
    pdf.body_text(
        'The isotonic calibration ensures that the output probability is well-calibrated: a score '
        'of 70 means approximately 70%% likelihood of phishing according to the model. A confidence '
        'metric is derived as |probability - 0.5| x 2, ranging from 0 (maximum uncertainty) to 1 '
        '(maximum confidence). The resulting score maps to four risk levels displayed as themed fish: '
        'Friendly Fish (0-49, Low), Suspicious Fish (50-75, Medium), Phishy Pufferfish (76-89, '
        'High), and Mega Phish Shark (90-100, Dangerous).')

    pdf.figure_ref(
        'Figure 2 - Risk Scoring Pipeline: Unified calibrated pipeline from 64 features through '
        'buildUnifiedVector, Random Forest, isotonic calibration, to risk classification.')
    img_path = os.path.join(OUT_DIR, 'risk-scoring-pipeline.png')
    if os.path.exists(img_path):
        pdf.image(img_path, w=180)
        pdf.ln(4)

    # ── Section 5: AI Enhancement ──
    pdf.add_page()
    pdf.section_heading('5', 'AI Enhancement (Cloud BYOK)')
    pdf.body_text(
        'GoPhishFree includes an optional cloud AI enhancement that provides a second opinion '
        'on email risk. Users bring their own API key (BYOK) for one of five supported providers: '
        'OpenAI, Anthropic, Google Gemini, Azure OpenAI, or any custom OpenAI-compatible endpoint. '
        'Keys are stored exclusively in chrome.storage.local and are never synced.')
    pdf.body_text(
        'When the "Enhance with AI" toggle is enabled, AI analysis runs automatically after each '
        'local scan, subject to gating logic. The shouldCallAi() function checks whether AI is '
        'useful: local risk score in the uncertain range (30-80), local confidence below 0.6, '
        'deep scan found suspicious forms/password inputs/off-domain actions, risky attachment '
        'present, or reply-to domain mismatch detected. If none of these conditions apply, AI '
        'is skipped with a "high confidence" message.')
    pdf.body_text(
        'The AI payload is constructed by buildAiPayload() and contains only extracted signal '
        'features: email identity signals, URL/link signals, language cues (as scores, not raw '
        'text), attachment metadata, DNS signals, deep scan signals, and the local model\'s risk '
        'score and confidence. NO email body, subject line, or sender address is ever transmitted.')
    pdf.body_text(
        'The system prompt enforces strict rules: no tools, no browsing, no link visiting, analyze '
        'only the provided JSON signals, and output must be strict JSON matching the required schema '
        '(aiRiskScore, riskTier, phishType, topSignals, confidence, notes). Invalid responses are '
        'rejected and the UI shows "AI unavailable". An agreement badge indicates whether the AI '
        'and local scores are "Aligned" (within 20 points) or "Needs review" (differ by more than 20).')

    pdf.figure_ref('Figure 5 - AI Enhancement Flow: BYOK provider routing, features-only payload, '
                   'and strict JSON schema validation.')
    img_path = os.path.join(OUT_DIR, 'ai-enhancement-flow.png')
    if os.path.exists(img_path):
        pdf.image(img_path, w=180)
        pdf.ln(4)

    # ── Section 6: Runtime Scan Flow ──
    pdf.add_page()
    pdf.section_heading('6', 'Runtime Scan Flow')
    pdf.body_text(
        'The diagram below illustrates the full sequence from the moment a user opens an email '
        'to the final risk badge display and optional AI enhancement. A MutationObserver in the '
        'content script detects Gmail navigation events, triggers feature extraction across all '
        'available tiers, assembles the 64-element unified vector, runs calibrated Random Forest '
        'inference, derives informational reasons (without modifying the score), renders the badge '
        'and side panel, persists the result via the background service worker, and optionally '
        'triggers AI analysis if the gating conditions are met.')

    pdf.figure_ref(
        'Figure 4 - Email Scan Sequence: User opens email -> DOM detection -> 64-feature extraction '
        '-> calibrated inference -> risk badge -> AI enhancement -> storage.')
    img_path = os.path.join(OUT_DIR, 'email-scan-sequence-diagram.png')
    if os.path.exists(img_path):
        pdf.image(img_path, w=180)
        pdf.ln(4)

    # ── Section 7: Security & Privacy ──
    pdf.add_page()
    pdf.section_heading('7', 'Security & Privacy')
    pdf.body_text(
        'GoPhishFree enforces strict privacy guarantees. All ML inference and feature extraction '
        'execute entirely within the browser - no email content, URLs, or metadata are transmitted '
        'to any external server during core scanning. DNS-over-HTTPS queries send only domain names '
        '(never email bodies or user data) to Cloudflare or Google public resolvers. Deep Scan '
        'fetches omit all credentials and cookies, cap response sizes at 2 MB, validate content '
        'types, enforce an 8-second timeout, and parse HTML via DOMParser without executing any '
        'scripts.')
    pdf.body_text(
        'The optional AI Enhancement sends only extracted signal features to the configured AI '
        'provider - never the email body, subject line, sender address, or any raw text content. '
        'API keys are stored exclusively in chrome.storage.local (never synced to Chrome Sync or '
        'any external service). The AI system prompt enforces strict rules preventing tool use, '
        'browsing, or link visiting, and requires responses in a strict JSON schema. Invalid '
        'responses are silently rejected.')
    pdf.body_text(
        'The extension requires no backend server and stores all scan data locally via the Chrome '
        'Storage API. The user maintains full control over whether AI enhancement is enabled and '
        'which provider receives the features-only payload.')
    pdf.body_text(
        'The trusted domain whitelist (500+ domains) distinguishes between corporate/organizational '
        'domains that only employees can send from (e.g., google.com, microsoft.com) and free/public '
        'email providers where anyone can register (e.g., gmail.com, outlook.com, icloud.com). Free '
        'email providers never receive trusted dampening, preventing attackers from exploiting the '
        'whitelist by sending phishing from commonly trusted mail services. Users can further '
        'customize the trust list by adding or blocking domains through the popup settings.')

    # ── Save PDF ──
    pdf_path = os.path.join(OUT_DIR, 'GoPhishFree_Architecture_Document.pdf')
    pdf.output(pdf_path)
    print(f"  -> GoPhishFree_Architecture_Document.pdf  ({os.path.getsize(pdf_path)/1024:.0f} KB)")

    # Copy to docs/Sprint1
    dst = os.path.join(BASE_DIR, 'docs', 'Sprint1', 'GoPhishFree_Architecture_Document.pdf')
    if os.path.exists(os.path.dirname(dst)):
        shutil.copy2(pdf_path, dst)
        print(f"  -> docs/Sprint1/GoPhishFree_Architecture_Document.pdf (copy)")


def gen_architecture_pdf_fallback():
    """Fallback PDF generation using matplotlib PdfPages if fpdf2 is not installed."""
    from matplotlib.backends.backend_pdf import PdfPages
    pdf_path = os.path.join(OUT_DIR, 'GoPhishFree_Architecture_Document.pdf')

    with PdfPages(pdf_path) as pdf:
        # Title page
        fig, ax = new_figure(11, 8.5)
        txt(ax, 50, 70, 'GoPhishFree', 32, TEAL, weight='bold')
        txt(ax, 50, 60, 'Architecture Document', 20, WHITE)
        txt(ax, 50, 50, 'EECS 582 - Capstone Project - Team 24', 12, GRAY)
        txt(ax, 50, 44, 'February 2026', 10, GRAY_DIM)
        pdf.savefig(fig, facecolor=BG)
        plt.close(fig)

        # Embed each diagram
        for fname in ['system-architecture.png', 'risk-scoring-pipeline.png',
                      'ai-model-architecture.png', 'email-scan-sequence-diagram.png',
                      'class-diagram.png', 'ai-enhancement-flow.png']:
            fpath = os.path.join(OUT_DIR, fname)
            if os.path.exists(fpath):
                img = plt.imread(fpath)
                fig, ax = plt.subplots(figsize=(11, 8.5))
                fig.patch.set_facecolor(BG)
                ax.imshow(img)
                ax.axis('off')
                pdf.savefig(fig, facecolor=BG)
                plt.close(fig)

    print(f"  -> GoPhishFree_Architecture_Document.pdf (fallback, {os.path.getsize(pdf_path)/1024:.0f} KB)")
    dst = os.path.join(BASE_DIR, 'docs', 'Sprint1', 'GoPhishFree_Architecture_Document.pdf')
    if os.path.exists(os.path.dirname(dst)):
        shutil.copy2(pdf_path, dst)


# ═══════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════

def _clean_pycache():
    """Remove __pycache__ from project root (Chrome rejects dirs starting with _)."""
    import shutil
    pc = os.path.join(BASE_DIR, '__pycache__')
    if os.path.isdir(pc):
        shutil.rmtree(pc, ignore_errors=True)
        print('  (cleaned __pycache__)')


if __name__ == '__main__':
    print('Generating Framework architecture diagrams...')
    gen_system_architecture()
    gen_risk_scoring_pipeline()
    gen_ml_model_architecture()
    gen_email_scan_sequence()
    gen_class_diagram()
    gen_ai_enhancement_flow()
    print('\nGenerating Architecture PDF...')
    gen_architecture_pdf()
    _clean_pycache()
    print('\nDone!')
