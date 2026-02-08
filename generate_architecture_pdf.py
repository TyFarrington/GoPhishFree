"""
Generate Architecture Document PDF for GoPhishFree
EECS582 Capstone Project
"""

from fpdf import FPDF
from PIL import Image
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMEWORK = os.path.join(BASE_DIR, "Framework")
ASSETS = os.path.join(BASE_DIR, "Assets")

# ── Page constants ──────────────────────────────────────────────
PAGE_W = 215.9          # Letter width mm
PAGE_H = 279.4          # Letter height mm
MARGIN = 18
CONTENT_W = PAGE_W - 2 * MARGIN


class ArchPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 6, "GoPhishFree - Architecture Document  |  EECS582 Capstone", align="C")
            self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    # ── helpers ──────────────────────────────────────────────────
    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(26, 82, 118)          # steel-blue
        self.cell(0, 9, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(26, 82, 118)
        self.line(self.l_margin, self.get_y(), self.l_margin + CONTENT_W, self.get_y())
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(44, 62, 80)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(CONTENT_W, 5.2, text)
        self.ln(2)

    def bullet(self, text, bold_prefix=""):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        x = self.get_x()
        self.cell(6, 5.2, "-")                       # bullet char
        if bold_prefix:
            self.set_font("Helvetica", "B", 10)
            self.cell(self.get_string_width(bold_prefix) + 1, 5.2, bold_prefix)
            self.set_font("Helvetica", "", 10)
        self.multi_cell(CONTENT_W - 6, 5.2, text)
        self.ln(1)

    def add_image_fit(self, img_path, caption="", max_h=100):
        """Add image scaled to page width, with optional caption."""
        if not os.path.exists(img_path):
            self.body_text(f"[Image not found: {img_path}]")
            return
        img = Image.open(img_path)
        iw, ih = img.size
        ratio = ih / iw
        disp_w = CONTENT_W
        disp_h = disp_w * ratio
        if disp_h > max_h:
            disp_h = max_h
            disp_w = disp_h / ratio

        # page break check
        if self.get_y() + disp_h + 14 > PAGE_H - 20:
            self.add_page()

        x = self.l_margin + (CONTENT_W - disp_w) / 2
        self.image(img_path, x=x, y=self.get_y(), w=disp_w, h=disp_h)
        self.set_y(self.get_y() + disp_h + 2)

        if caption:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 5, caption, align="C", new_x="LMARGIN", new_y="NEXT")
            self.ln(4)


def build_pdf():
    pdf = ArchPDF("P", "mm", "Letter")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(True, margin=18)
    pdf.set_margins(MARGIN, MARGIN, MARGIN)

    # ══════════════════════════════════════════════════════════════
    # COVER / TITLE PAGE
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()

    # Logo
    logo = os.path.join(ASSETS, "Logo.png")
    if os.path.exists(logo):
        pdf.image(logo, x=(PAGE_W - 50) / 2, y=30, w=50)
        pdf.set_y(85)
    else:
        pdf.set_y(50)

    # Title
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(26, 82, 118)
    pdf.cell(0, 14, "GoPhishFree", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 8, "Architecture Document", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Divider
    pdf.set_draw_color(26, 82, 118)
    pdf.set_line_width(0.6)
    pdf.line(60, pdf.get_y(), PAGE_W - 60, pdf.get_y())
    pdf.ln(8)

    # Meta table
    meta = [
        ("Course", "EECS 582 - Capstone Project"),
        ("Team Number", "2"),
        ("Team Members", "Ty Farrington, Mohanad Abdalla, Connor Kroll, Christian Razo"),
        ("Project Name", "GoPhishFree"),
        ("Date", "February 8, 2026"),
    ]
    pdf.set_font("Helvetica", "", 11)
    for label, value in meta:
        pdf.set_text_color(100, 100, 100)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(45, 7, label + ":", align="R")
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 7, "   " + value, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # Synopsis
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(26, 82, 118)
    pdf.cell(0, 8, "Project Synopsis", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(CONTENT_W, 6,
        "A privacy-first Chrome extension that detects phishing emails in Gmail using "
        "a locally-run Random Forest machine learning model and a three-tier risk scoring pipeline.",
        align="C")

    # ══════════════════════════════════════════════════════════════
    # PAGE 2+  -  Architecture Narrative
    # ══════════════════════════════════════════════════════════════
    pdf.add_page()

    # ── 1. Overview ──────────────────────────────────────────────
    pdf.section_title("1.  System Overview")
    pdf.body_text(
        "GoPhishFree is a Chrome Manifest V3 extension that scans emails in real time "
        "as users read them in Gmail. The entire detection pipeline - feature extraction, "
        "machine-learning inference, and risk scoring - executes locally inside the browser, "
        "ensuring that no email content ever leaves the user's device. The system is composed "
        "of four major components: a Gmail content script that orchestrates scanning and renders "
        "the UI, a feature extraction module that derives numerical signals from email metadata "
        "and URLs, a background service worker that manages storage and proxies network requests, "
        "and a popup dashboard that presents a gamified \"fish tank\" collection of scanned emails."
    )

    # Diagram 1 - System Architecture
    pdf.sub_title("Figure 1 - System Architecture")
    pdf.add_image_fit(os.path.join(FRAMEWORK, "system-architecture.png"),
                      "High-level component map showing content scripts, service worker, popup, and external services.",
                      max_h=95)

    # ── 2. Three-Tier Detection Pipeline ─────────────────────────
    pdf.section_title("2.  Three-Tier Detection Pipeline")
    pdf.body_text(
        "Detection is organized into three progressive tiers, each adding deeper analysis "
        "at the cost of additional permissions or latency."
    )

    pdf.sub_title("Tier 1 - Email Analysis (always active)")
    pdf.body_text(
        "When a user opens an email, the content script extracts the sender address, display "
        "name, body text, attachment metadata, and every hyperlink. The FeatureExtractor class "
        "computes 25 numerical features from this data - covering URL structure (dot count, "
        "subdomain depth, path length, query parameters), special-character frequency (@ symbol, "
        "tildes, underscores, percent-encoding), security indicators (missing HTTPS, IP-based "
        "URLs, double slashes in paths), suspicious patterns (domain appearing in subdomains or "
        "paths, link-text mismatches), and content signals (sensitive-word count, query "
        "complexity). An additional 10 custom features capture higher-level behavioural cues "
        "such as punycode usage, header-address mismatch, URL-shortener links, urgency language, "
        "and credential-request phrases. The 25 ML features are Z-score normalized using the "
        "training scaler's mean and standard deviation, then fed into the Random Forest model "
        "for probability estimation."
    )

    pdf.sub_title("Tier 2 - DNS Validation (enabled by default)")
    pdf.body_text(
        "If Enhanced Scanning is toggled on (the default), GoPhishFree queries Cloudflare's "
        "DNS-over-HTTPS resolver (with Google DNS as a fallback) for the sender's domain and "
        "every linked domain. Four DNS features are derived: whether the domain resolves at all, "
        "whether it has MX records, whether the A-record returns multiple IPs (a sign of "
        "legitimate load-balanced infrastructure), and whether the domain label is a random "
        "string based on Shannon entropy analysis. DNS results are cached with a 10-minute TTL "
        "to minimize latency on subsequent scans."
    )

    pdf.sub_title("Tier 3 - Deep Scan (user-initiated)")
    pdf.body_text(
        "Users may optionally trigger a Deep Scan, which fetches the raw HTML of up to 10 "
        "linked pages through the background service worker. The fetch is sandboxed: credentials "
        "are omitted, responses are capped at 2 MB, content-type is validated, redirects are "
        "checked, and no JavaScript is executed. The PageAnalyzer class extracts 13 page-structure "
        "features - insecure forms, external form actions, abnormal action URLs, mailto "
        "submissions, external hyperlink and resource ratios, external favicons, null/self-redirect "
        "links, iframes, missing page titles, image-only forms, and embedded brand names. These "
        "13 features are appended to the original 25 to form a 38-element vector, which is run "
        "through a separate Deep Scan Random Forest model for a refined probability."
    )

    # Diagram 2 - Risk Scoring Pipeline
    pdf.sub_title("Figure 2 - Risk Scoring Pipeline")
    pdf.add_image_fit(os.path.join(FRAMEWORK, "risk-scoring-pipeline.png"),
                      "Three-stage pipeline: ML probability, custom rule adjustments, and DNS adjustments converge into a 0-100 risk score.",
                      max_h=90)

    # ── 3. ML Model ──────────────────────────────────────────────
    pdf.section_title("3.  Machine Learning Model")
    pdf.body_text(
        "GoPhishFree uses supervised learning with scikit-learn's RandomForestClassifier for "
        "binary classification (legitimate vs. phishing). The training dataset is a publicly "
        "available Kaggle corpus (Phishing_Legitimate_full.csv) containing labelled URL and "
        "email samples. Data is split 80/20 with stratified sampling (random_state=42) to "
        "preserve class balance."
    )
    pdf.body_text(
        "Preprocessing consists of selecting the relevant feature columns, imputing missing "
        "values with zero, and applying StandardScaler Z-score normalization. The classifier "
        "is configured with 200 estimators, a maximum tree depth of 20, a minimum of 2 samples "
        "per leaf, and parallel training across all CPU cores (n_jobs=-1). Model evaluation uses "
        "5-fold cross-validation, a classification report (precision, recall, F1-score per class), "
        "and a confusion matrix. The Tier 1 model achieves approximately 90% test accuracy, while "
        "the Deep Scan model reaches approximately 93%."
    )
    pdf.body_text(
        "After training, the full Random Forest structure - every tree's split features, "
        "thresholds, child pointers, and leaf probabilities - is exported to JSON along with "
        "the scaler's mean and scale arrays. At runtime the content script loads this JSON and "
        "performs inference by traversing all 200 trees in JavaScript, averaging the leaf "
        "probabilities (soft voting) to produce a phishing probability between 0.0 and 1.0."
    )

    # Diagram 3 - ML Model Architecture
    pdf.sub_title("Figure 3 - ML Model Architecture")
    pdf.add_image_fit(os.path.join(FRAMEWORK, "ai-model-architecture.png"),
                      "End-to-end ML pipeline: training data, 25/38 features, preprocessing, Random Forest (200 trees), evaluation, and browser deployment.",
                      max_h=90)

    # ── 4. Risk Scoring ──────────────────────────────────────────
    pdf.section_title("4.  Risk Score Composition")
    pdf.body_text(
        "The final risk score is computed as: Risk Score = (ML Probability x 80) + Custom "
        "Adjustment + DNS Adjustment, clamped to the range 0-100. The ML component contributes "
        "up to 80 points. Custom rules add points through a tiered weighting scheme: Tier S "
        "(\"smoking gun\") signals such as punycode domains (+15) or link-text mismatch above "
        "30% (+14); Tier A (\"strong\") signals like header-address mismatch (+10) or credential-"
        "request language (up to +15); and Tier B (\"soft\") signals such as suspicious TLDs (+5) "
        "or urgency language (up to +6). A combination bonus adds +8 for two or more strong "
        "signals, or +15 for three or more. DNS adjustments add up to +15 for non-resolving "
        "domains, +10 for random-string domains, or subtract 3 points for domains with multiple "
        "IPs (indicating legitimate CDN infrastructure)."
    )
    pdf.body_text(
        "The resulting score maps to four risk levels displayed as themed fish: Friendly Fish "
        "(0-49, Low), Suspicious Fish (50-75, Medium), Phishy Pufferfish (76-89, High), and "
        "Mega Phish Shark (90-100, Dangerous). The fish type, score, human-readable reasons, "
        "and timestamp are persisted to chrome.storage.local and displayed in the popup fish tank."
    )

    # ── 5. Email Scan Sequence ───────────────────────────────────
    pdf.section_title("5.  Runtime Scan Flow")
    pdf.body_text(
        "The diagram below illustrates the full sequence from the moment a user opens an email "
        "to the final risk badge display. A MutationObserver in the content script detects Gmail "
        "navigation events, triggers feature extraction, runs ML inference, applies custom and "
        "DNS adjustments, renders the badge and side panel, and persists the result via the "
        "background service worker."
    )

    # Diagram 4 - Email Scan Sequence
    pdf.sub_title("Figure 4 - Email Scan Sequence")
    pdf.add_image_fit(os.path.join(FRAMEWORK, "email-scan-sequence-diagram.png"),
                      "Sequence diagram: User opens email -> DOM detection -> feature extraction -> ML inference -> risk badge -> storage.",
                      max_h=95)

    # ── 6. Security & Privacy ────────────────────────────────────
    pdf.section_title("6.  Security & Privacy")
    pdf.body_text(
        "GoPhishFree enforces strict privacy guarantees. All ML inference and feature extraction "
        "execute entirely within the browser - no email content, URLs, or metadata are transmitted "
        "to any external server. DNS-over-HTTPS queries send only domain names (never email bodies "
        "or user data) to Cloudflare or Google public resolvers. Deep Scan fetches omit all "
        "credentials and cookies, cap response sizes at 2 MB, validate content types, enforce an "
        "8-second timeout, and parse HTML via DOMParser without executing any scripts. The "
        "extension requires no API keys, no backend server, and stores all data locally via the "
        "Chrome Storage API."
    )

    # ══════════════════════════════════════════════════════════════
    # Save
    # ══════════════════════════════════════════════════════════════
    out_path = os.path.join(BASE_DIR, "Framework", "GoPhishFree_Architecture_Document.pdf")
    pdf.output(out_path)
    print(f"PDF saved to: {out_path}")


if __name__ == "__main__":
    build_pdf()
