/**
 * @file DemoSection.jsx
 * @description Interactive demo section for the GoPhishFree marketing website. Renders a
 *              full Gmail-style browser mockup with five simulated emails that users can
 *              click to open and watch GoPhishFree analyze in real time. Contains multiple
 *              sub-components: RiskIcon (risk-level icon selector), RiskBadge (animated
 *              classification pill), SidePanel (full analysis panel replica matching the
 *              extension's content.css panel), MiniFish (four inline SVG fish types),
 *              FishTankPopup (animated aquarium popup replicating popup.html), and
 *              EmailBodyView (email detail view with live scan animation). The main
 *              DemoSection component orchestrates scan simulation state, email selection,
 *              side panel toggling, and fish tank visibility.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions
 *   - React 18+ and Framer Motion (motion, AnimatePresence, useInView) must be installed.
 *   - Lucide React icons used: ScanSearch, RotateCcw, ShieldCheck, AlertTriangle,
 *     ShieldAlert, ShieldX, Mail, Inbox, Lock, Star, Search, ArrowLeft, X,
 *     ExternalLink, Link2.
 *   - The logo image "/logomini.png" must be served from the public directory.
 *   - A CSS class "container-main" must be defined for centered page layout.
 *   - The section element with id="demo" must correspond to the nav link target.
 *
 * @postconditions
 *   - A full demo section renders with id="demo" containing a browser mockup.
 *   - Users can click emails to open them, triggering an automatic scan animation.
 *   - Scan results display as animated risk badges; clicking badges opens the
 *     analysis side panel with risk score, reasons, links, and AI analysis info.
 *   - The GoPhishFree icon in the browser chrome toggles the fish tank popup,
 *     which shows collected fish from scanned emails with SVG aquarium decorations.
 *   - A reset button returns the demo to its initial unscanned state.
 *
 * @errorConditions
 *   - If a scan is already in progress, additional scan requests are silently ignored
 *     (handleScan guards with `if (scanningId) return`).
 *   - If an email has already been scanned, opening it will not re-trigger a scan.
 *   - If the logo image fails to load, empty alt text is used (decorative image).
 *
 * @sideEffects
 *   - Creates and clears a setInterval timer during scan simulation (cleaned up on
 *     unmount or when scanningId changes).
 *   - Uses setTimeout to delay auto-scan when opening an unscanned email (600ms)
 *     and to finalize scan completion (350ms).
 *   - Framer Motion drives continuous animations on fish swimming, bubbles, seaweed
 *     sway, caustic lights, water surface ripple, and treasure chest glow.
 *
 * @invariants
 *   - The fakeEmails array is a static constant and is never mutated at runtime.
 *   - The analysisSteps array is a static constant used only for display labels.
 *   - Each email's id is unique and serves as the key for scanStates mapping.
 *   - Only one email can be scanning at a time (scanningId is singular or null).
 *   - Fish type is always one of: "friendly", "suspicious", "phishy", "shark".
 *
 * @knownFaults
 *   - The "Install GoPhishFree" link at the bottom points to the generic Chrome Web
 *     Store homepage, not a specific extension listing.
 *   - The useInView import from Framer Motion is imported but unused in some contexts.
 *   - The ScanSearch, Mail, Star, and Search icon imports are unused in the current
 *     render but kept for potential future use.
 *   - The fish tank popup positioning assumes the browser chrome bar height is fixed;
 *     extreme zoom levels may cause misalignment.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  ScanSearch, RotateCcw, ShieldCheck, AlertTriangle, ShieldAlert, ShieldX,
  Mail, Inbox, Lock, Star, Search, ArrowLeft, X, ExternalLink, Link2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   Fake Email Dataset
   ─────────────────────────────────────────────────────────────────────
   Static array of five simulated email objects used to populate the
   demo inbox. Each email contains full metadata (sender, subject,
   body text), risk classification data (score, riskLevel, fishType),
   visual styling tokens (color, bgColor, borderColor), analysis
   reasons, and embedded link safety flags. These objects drive the
   entire demo experience — inbox rows, email body view, risk badges,
   side panel analysis, and fish tank population.
   ═══════════════════════════════════════════════════════════════════════ */

const fakeEmails = [
  {
    id: 1,
    sender: "Amazon Support",
    email: "noreply@amazon.com",
    subject: "Your order has been shipped",
    preview: "Your package #AMZ-4821 is on its way and will arrive by Thursday...",
    body: `Hi Customer,\n\nGreat news! Your order #AMZ-4821 has shipped and is on its way.\n\nEstimated delivery: Thursday, Feb 19\nCarrier: UPS Ground\nTracking: 1Z999AA10123456784\n\nYou can track your package at amazon.com/orders.\n\nThank you for shopping with us!\n\nAmazon Customer Service`,
    time: "10:32 AM",
    score: 8,
    risk: "Safe", riskLevel: "low", riskLabel: "Safe", fishType: "friendly", fishEmoji: "🐟",
    color: "#34d399", bgColor: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.35)",
    initial: "A", initialBg: "rgba(245,158,11,0.2)", initialColor: "#fbbf24",
    reasons: ["Sender domain matches known legitimate service", "No suspicious links detected", "Standard transactional email pattern"],
    links: [{ url: "https://amazon.com/orders", safe: true }],
  },
  {
    id: 2,
    sender: "BankOfAmerica Security",
    email: "security@bankofamerica-verify.com",
    subject: "Urgent: Verify your identity now",
    preview: "Your account has been locked due to suspicious activity. Click here to verify...",
    body: `URGENT SECURITY ALERT\n\nDear Valued Customer,\n\nWe have detected unusual activity on your Bank of America account. Your account has been temporarily locked for your protection.\n\nYou must verify your identity within 24 hours or your account will be permanently suspended.\n\nClick here to verify: http://bankofamerica-verify.com/secure/login\n\nBank of America Security Team`,
    time: "9:47 AM",
    score: 94,
    risk: "Dangerous", riskLevel: "dangerous", riskLabel: "Phishing", fishType: "shark", fishEmoji: "🦈",
    color: "#f87171", bgColor: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.35)",
    initial: "!", initialBg: "rgba(239,68,68,0.2)", initialColor: "#f87171",
    reasons: ["Sender domain does not match official bankofamerica.com", "Urgency tactics used to pressure action", "Suspicious login link points to impersonation domain", "BEC pattern: Fake authority figure"],
    links: [{ url: "http://bankofamerica-verify.com/secure/login", safe: false }],
  },
  {
    id: 3,
    sender: "John Smith",
    email: "jsmith@company.org",
    subject: "Meeting notes from today",
    preview: "Hey, here are the notes from our 3pm standup. Let me know if I missed anything...",
    body: `Hey team,\n\nHere are the notes from our 3pm standup:\n\n• Sprint progress: 80% complete\n• Blocker: API rate limiting issue (Mike investigating)\n• Next steps: Code review for PR #247 by EOD\n• Demo scheduled for Friday at 2pm\n\nLet me know if I missed anything!\n\nBest,\nJohn`,
    time: "8:15 AM",
    score: 3,
    risk: "Safe", riskLevel: "low", riskLabel: "Safe", fishType: "friendly", fishEmoji: "🐟",
    color: "#34d399", bgColor: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.35)",
    initial: "J", initialBg: "rgba(139,92,246,0.2)", initialColor: "#a78bfa",
    reasons: ["Internal domain sender", "No links or attachments", "Conversational tone consistent with internal communication"],
    links: [],
  },
  {
    id: 4,
    sender: "Prize Center",
    email: "winner@prize-center-global.net",
    subject: "Congratulations! You've won $5,000",
    preview: "You have been selected as a winner in our monthly draw. Claim your prize now...",
    body: `🎉 CONGRATULATIONS! 🎉\n\nDear Lucky Winner,\n\nYou have been randomly selected as the GRAND PRIZE WINNER of our International Monthly Draw!\n\nPrize Amount: $5,000.00 USD\n\nTo claim your prize, please provide the following:\n• Full Name\n• Address\n• Bank Account Number\n• SSN (for tax purposes)\n\nClaim here: http://prize-center-global.net/claim?id=892341\n\nAct fast — this offer expires in 48 hours!\n\nPrize Center International`,
    time: "7:58 AM",
    score: 78,
    risk: "High", riskLevel: "high", riskLabel: "Suspicious", fishType: "phishy", fishEmoji: "🐡",
    color: "#fb923c", bgColor: "rgba(249,115,22,0.15)", borderColor: "rgba(249,115,22,0.35)",
    initial: "$", initialBg: "rgba(249,115,22,0.2)", initialColor: "#fb923c",
    reasons: ["Unsolicited prize notification pattern", "Requests sensitive personal information (SSN, bank details)", "Unknown sender domain with no reputation", "Urgency tactic: 48-hour expiration"],
    links: [{ url: "http://prize-center-global.net/claim?id=892341", safe: false }],
  },
  {
    id: 5,
    sender: "IT Department",
    email: "it-support@internal-helpdesk.co",
    subject: "Password reset required immediately",
    preview: "Your corporate password will expire in 24 hours. Click below to reset...",
    body: `IT Security Notice\n\nDear Employee,\n\nYour corporate account password will expire in 24 hours. To avoid being locked out of company systems, please reset your password immediately.\n\nReset Password: http://internal-helpdesk.co/reset?u=employee\n\nIf you did not request this, please contact IT support.\n\nIT Department\nCorporate Helpdesk`,
    time: "Yesterday",
    score: 52,
    risk: "Medium", riskLevel: "medium", riskLabel: "Caution", fishType: "suspicious", fishEmoji: "🐠",
    color: "#fbbf24", bgColor: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.35)",
    initial: "IT", initialBg: "rgba(59,130,246,0.2)", initialColor: "#3b82f6",
    reasons: ["Sender domain does not match a known internal domain", "Password reset link uses external domain", "Moderate urgency language used"],
    links: [{ url: "http://internal-helpdesk.co/reset?u=employee", safe: false }],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   Analysis Step Labels
   ─────────────────────────────────────────────────────────────────────
   Ordered array of user-facing status messages displayed during the
   simulated scan animation. Each string corresponds to one phase of
   the progress bar, advancing at equal intervals over ~1800ms total.
   ═══════════════════════════════════════════════════════════════════════ */

const analysisSteps = [
  "Checking sender domain...",
  "Analyzing URLs...",
  "DNS reputation lookup...",
  "Extracting 64 features...",
  "Running ML inference...",
];

/* ═══════════════════════════════════════════════════════════════════════
   Helper Components
   ─────────────────────────────────────────────────────────────────────
   Small, stateless utility components used by the larger sub-components
   below. RiskIcon maps risk labels to Lucide icons; RiskBadge renders
   an animated pill showing fish emoji, risk label, and percentage.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * RiskIcon — Maps a risk classification string to its corresponding Lucide icon.
 *
 * @param {Object} props
 * @param {string} props.risk  - One of "Safe", "Medium", "High", or "Dangerous".
 * @param {number} [props.size=14] - Icon pixel size.
 * @returns {JSX.Element} The matching Lucide shield/alert icon.
 */
function RiskIcon({ risk, size = 14 }) {
  if (risk === "Safe") return <ShieldCheck size={size} />;
  if (risk === "Medium") return <AlertTriangle size={size} />;
  if (risk === "High") return <ShieldAlert size={size} />;
  return <ShieldX size={size} />;
}

/**
 * RiskBadge — Animated pill badge displaying an email's risk classification.
 *
 * Renders a spring-animated button with the email's fish emoji, risk label
 * text, and numeric phishing score percentage. Used in both the inbox row
 * (post-scan) and the email body header bar.
 *
 * @param {Object} props
 * @param {Object} props.email      - The email data object containing riskLabel,
 *                                     fishEmoji, score, bgColor, borderColor, color.
 * @param {Function} [props.onClick] - Click handler (typically opens the side panel).
 * @param {Object} [props.style]     - Additional inline styles merged onto the button.
 * @returns {JSX.Element} The animated risk badge button.
 */
function RiskBadge({ email, onClick, style: extraStyle }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.375rem",
        padding: "0.375rem 0.875rem", borderRadius: "9999px",
        background: email.bgColor, border: `1px solid ${email.borderColor}`,
        color: email.color, cursor: "pointer", transition: "all 0.2s",
        ...extraStyle,
      }}
      whileHover={{ scale: 1.05 }}
    >
      <span style={{ fontSize: "1rem" }}>{email.fishEmoji}</span>
      <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>{email.riskLabel}</span>
      <span style={{ fontSize: "0.625rem", fontWeight: 600, opacity: 0.7 }}>{email.score}%</span>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Side Panel — Analysis Panel Replica
   ─────────────────────────────────────────────────────────────────────
   Full-featured replica of the GoPhishFree extension's content.css
   analysis side panel, scaled to fit within the demo browser mockup.
   Displays risk score with color-coded glow, fish emoji and type name,
   risk indicator reasons, suspicious link analysis, AI analysis status,
   deep scan and report phish button shells, and a demo disclaimer.
   Slides in from the right via Framer Motion spring animation with a
   backdrop overlay that closes the panel on click.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * SidePanel — Slide-in analysis panel replicating the extension's side panel UI.
 *
 * When open, renders a backdrop overlay and an absolutely-positioned panel
 * that slides in from the right edge of the browser mockup. Shows the full
 * analysis breakdown for a scanned email: risk score, fish classification,
 * risk indicators, suspicious links, AI analysis availability, deep scan
 * and report phish buttons, and a demo disclaimer footer.
 *
 * @param {Object} props
 * @param {Object|null} props.email  - The email data object to display analysis for,
 *                                      or null if no email is selected.
 * @param {boolean}     props.isOpen - Whether the panel is currently visible.
 * @param {Function}    props.onClose - Callback to close the panel.
 * @returns {JSX.Element|null} The animated side panel, or null if email is null.
 */
function SidePanel({ email, isOpen, onClose }) {
  if (!email) return null;
  const scoreColor = email.score >= 90 ? "#f87171" : email.score >= 76 ? "#fb923c" : email.score >= 50 ? "#fbbf24" : "#4ade80";
  const fishName = { friendly: "Friendly Fish", suspicious: "Suspicious Fish", phishy: "Phishy Puffer", shark: "Mega Phish Shark" }[email.fishType];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)", zIndex: 40 }}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "absolute", top: 0, right: 0, width: "min(320px, 55%)", height: "100%",
              background: "linear-gradient(180deg, #0a1628 0%, #0d2847 50%, #1a4a6e 100%)",
              boxShadow: "-4px 0 30px rgba(0,0,0,0.3)", zIndex: 50, overflowY: "auto",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {/* Header with banner */}
            <div style={{
              position: "relative", background: "linear-gradient(135deg, #1e3a5f 0%, #0a1628 100%)",
              borderBottom: "2px solid rgba(64,224,208,0.3)", padding: "10px 12px 8px", textAlign: "center",
              borderRadius: "0 0 10px 10px",
            }}>
              <img src="/logomini.png" alt="" style={{ width: "40%", display: "block", margin: "0 auto", borderRadius: 8 }} />
              <span style={{
                display: "block", textAlign: "center", margin: "4px 0 4px", fontSize: 14, fontWeight: 700,
                color: "#40e0d0", textShadow: "0 0 15px rgba(64,224,208,0.5)", letterSpacing: 0.5,
              }}>Email Analysis</span>
              <button onClick={onClose} style={{
                position: "absolute", top: 8, right: 8, background: "rgba(10,22,40,0.7)",
                border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)",
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><X size={14} /></button>
            </div>

            <div style={{ padding: "14px 16px" }}>
              {/* Score */}
              <div style={{
                textAlign: "center", marginBottom: 16, padding: "16px 12px",
                background: "rgba(0,0,0,0.2)", borderRadius: 12,
                border: "1px solid rgba(64,224,208,0.15)",
              }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1 }}>Risk Score</div>
                <div style={{ fontSize: 42, fontWeight: "bold", margin: "4px 0", color: scoreColor, textShadow: `0 0 20px ${scoreColor}` }}>
                  {email.score}
                </div>
                <div style={{ fontSize: 32 }}>{email.fishEmoji}</div>
                <div style={{
                  display: "inline-block", padding: "3px 10px", borderRadius: 14,
                  fontSize: 10, fontWeight: 700, background: email.bgColor, color: email.color,
                  border: `1px solid ${email.borderColor}`, marginTop: 4,
                }}>{email.riskLabel} — {fishName}</div>
              </div>

              {/* Reasons */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#40e0d0", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⚠️</span> Risk Indicators
                </div>
                {email.reasons.map((reason, i) => (
                  <div key={i} style={{
                    padding: "8px 10px", marginBottom: 6, background: "rgba(255,255,255,0.05)",
                    borderLeft: "3px solid #40e0d0", borderRadius: 6, fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.4,
                  }}>{reason}</div>
                ))}
              </div>

              {/* Links */}
              {email.links.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#40e0d0", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🔗</span> Suspicious Links
                  </div>
                  {email.links.map((link, i) => (
                    <div key={i} style={{
                      padding: "8px 10px", marginBottom: 6, borderRadius: 6, fontSize: 10, wordBreak: "break-all",
                      background: link.safe ? "rgba(255,255,255,0.05)" : "rgba(255,107,107,0.1)",
                      borderLeft: link.safe ? "3px solid #4ade80" : "3px solid #ff6b6b",
                      color: link.safe ? "#4ade80" : "#ff6b6b",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, fontWeight: 600, fontSize: 10 }}>
                        <Link2 size={10} /> {link.safe ? "Safe" : "Suspicious"}
                      </div>
                      {link.url}
                    </div>
                  ))}
                </div>
              )}

              {/* AI Analysis Section */}
              <div style={{ marginBottom: 16, padding: "10px 12px", background: "rgba(64,224,208,0.06)", borderRadius: 10, border: "1px solid rgba(64,224,208,0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 12 }}>🤖</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#40e0d0" }}>AI Analysis</span>
                  <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 8, fontWeight: 600, marginLeft: "auto", background: "rgba(255,193,7,0.2)", color: "#ffc107" }}>
                    Extension Only
                  </span>
                </div>
                {email.score >= 30 && email.score <= 80 ? (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 12, height: 12, border: "2px solid rgba(64,224,208,0.3)", borderTop: "2px solid #2dd4bf", borderRadius: "50%", display: "inline-block" }} />
                      <span>AI enhancement would activate for this mid-range score</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                    AI not needed (high confidence local scan)
                  </div>
                )}
                <div style={{ marginTop: 6, fontSize: 8, color: "rgba(255,255,255,0.3)", lineHeight: 1.3 }}>
                  Bring your own API key (OpenAI, Anthropic, Google, Azure). Features only — no email text sent.
                </div>
              </div>

              {/* Deep Scan Links */}
              <div style={{ borderTop: "1px solid rgba(64,224,208,0.15)", paddingTop: 12 }}>
                <button style={{
                  width: "100%", padding: "10px 14px", border: "2px solid rgba(64,224,208,0.4)", borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(64,224,208,0.15), rgba(64,224,208,0.05))",
                  color: "#40e0d0", fontSize: 12, fontWeight: 600, cursor: "default",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}><span>🔬</span> Deep Scan Links</button>
                <div style={{ marginTop: 6, fontSize: 8, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.4 }}>
                  Fetches linked pages to analyze forms, resources & structure. Only domain content is downloaded — no scripts executed.
                </div>
              </div>

              {/* Report Phish */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <button style={{
                  width: "100%", padding: "10px 14px", border: "2px solid rgba(239,68,68,0.4)", borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))",
                  color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "default",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}><span>🚩</span> Report Phish</button>
                <div style={{ marginTop: 6, fontSize: 8, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.3 }}>
                  Manually flag this email as phishing and add it to your collection.
                </div>
              </div>
            </div>

            {/* Demo disclaimer */}
            <div style={{
              margin: "0 16px 8px", padding: "6px 10px", borderRadius: 8,
              background: "rgba(64,224,208,0.06)", border: "1px solid rgba(64,224,208,0.1)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
                Demo preview — AI Analysis, Deep Scan & Report Phish require the installed extension with real email data.
              </div>
            </div>

            <div style={{ height: 20, background: "linear-gradient(180deg, transparent, rgba(64,224,208,0.05))", pointerEvents: "none" }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Mini SVG Fish — Inline Fish Illustrations
   ─────────────────────────────────────────────────────────────────────
   Lightweight, inline SVG fish components for use in the fish tank
   popup and recent catches list. Four distinct fish types correspond
   to the extension's risk classification system:
     • friendly  — Blue tropical fish (safe emails)
     • suspicious — Orange puffer fish (medium-risk emails)
     • phishy    — Yellow blowfish (high-risk emails)
     • shark     — Large grey shark (dangerous/phishing emails)
   Each SVG is hand-crafted with body, fins, tail, eye, and accent
   details. The viewBox aspect ratio varies by fish type.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * MiniFish — Renders one of four inline SVG fish based on risk classification type.
 *
 * @param {Object} props
 * @param {string} props.type       - Fish type: "friendly", "suspicious", "phishy", or "shark".
 * @param {number} [props.size=32]  - Base width in pixels; height scales by aspect ratio.
 * @returns {JSX.Element} An inline SVG element of the corresponding fish.
 */
function MiniFish({ type, size = 32 }) {
  if (type === "friendly") return (
    <svg width={size} height={size * 0.625} viewBox="0 0 48 30"><g><polygon points="3,15 0,6 10,12" fill="#0277bd"/><polygon points="3,15 0,24 10,18" fill="#0277bd"/></g><ellipse cx="24" cy="15" rx="16" ry="10" fill="#29b6f6"/><ellipse cx="25" cy="18" rx="12" ry="6" fill="#e1f5fe" opacity="0.3"/><path d="M17,6 Q23,0 29,6" fill="#0288d1"/><circle cx="33" cy="12" r="3.5" fill="white"/><circle cx="34.2" cy="12" r="1.8" fill="#1a1a2e"/></svg>
  );
  if (type === "suspicious") return (
    <svg width={size} height={size * 0.87} viewBox="0 0 46 40"><g><polygon points="5,20 0,13 9,17" fill="#e65100"/><polygon points="5,20 0,27 9,23" fill="#e65100"/></g><ellipse cx="23" cy="20" rx="14" ry="11" fill="#ffb74d"/><path d="M15,10 Q20,0 29,10" fill="#f57c00"/><path d="M15,30 Q20,40 29,30" fill="#f57c00"/><circle cx="31" cy="17" r="3.5" fill="white"/><circle cx="32.2" cy="17" r="1.8" fill="#1a1a2e"/></svg>
  );
  if (type === "phishy") return (
    <svg width={size} height={size * 0.917} viewBox="0 0 48 44"><g><path d="M7,22 L2,16 Q4,22 2,28 Z" fill="#a08040"/></g><ellipse cx="26" cy="22" rx="15" ry="14" fill="#e8c840"/><ellipse cx="27" cy="27" rx="11" ry="8" fill="#fef9e0" opacity="0.55"/><circle cx="19" cy="15" r="2" fill="#8B6914" opacity="0.45"/><circle cx="28" cy="14" r="1.8" fill="#8B6914" opacity="0.4"/><circle cx="34" cy="18" r="5" fill="white"/><circle cx="35.5" cy="18" r="2.8" fill="#2a1a0a"/><ellipse cx="41" cy="23" rx="2.8" ry="2" fill="#e07858"/></svg>
  );
  // shark
  return (
    <svg width={size} height={size * 0.533} viewBox="0 0 90 48"><g><path d="M8,22 L6,18 L0,2 L5,12 L8,18 L10,20 Z" fill="#6e96ae"/><path d="M8,24 L6,28 L2,40 L6,34 L8,28 L10,26 Z" fill="#7a9ab0"/></g><path d="M8,23 Q8,21.5 10,20.5 L14,19 Q18,17 24,14 Q32,9 44,6 Q56,3 66,5 Q76,8 82,14 Q87,19 87,23 Q87,27 82,32 Q76,38 66,41 Q56,43 44,40 Q32,37 24,32 Q18,29 14,27 L10,25.5 Q8,24.5 8,23 Z" fill="#8aaec4"/><path d="M16,26 Q20,34 30,37 Q40,40 54,41 Q66,40 74,36 Q82,32 85,26 Q80,30 70,34 Q56,38 40,37 Q26,35 18,30 Z" fill="#e4eef4" opacity="0.85"/><path d="M50,5 L44,-7 Q52,-3 62,5" fill="#5a8498"/><circle cx="76" cy="18" r="3" fill="white"/><circle cx="77" cy="18" r="1.7" fill="#101820"/><path d="M72,27 Q78,32 86,27" fill="none" stroke="#3a5a6e" strokeWidth="1.3" strokeLinecap="round"/></svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Fish Tank Popup — Full Replica of popup.html
   ─────────────────────────────────────────────────────────────────────
   Complete recreation of the GoPhishFree extension popup (popup.html)
   rendered as an absolutely-positioned overlay anchored to the browser
   chrome's extension icon. Contains:
     • Header with logo, scanned email count, and total fish count
     • Animated SVG aquarium with glass reflection, caustic lights,
       light rays, water surface ripple, bubbles, floating particles,
       seaweed (animated sway), coral, treasure chest (glowing),
       pebbles, starfish, and layered sand floor
     • SVG fish that swim back and forth with direction-flip animation
     • Fish collection grid showing counts per type (4 types total)
     • Recent catches list with domain, fish icon, and risk score
     • Settings panel replica (Enhanced Scanning toggle, AI toggle,
       Trusted Domains input shell)
     • Demo disclaimer footer
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * FishTankPopup — Animated aquarium popup replicating the extension's popup.html.
 *
 * Displays a spring-animated popup containing a fully-decorated SVG fish tank
 * where collected fish swim. Also shows fish collection stats, recent catches,
 * and a settings panel shell. Fish are added to the tank as emails are scanned.
 *
 * @param {Object}  props
 * @param {boolean} props.isOpen        - Whether the popup is currently visible.
 * @param {Function} props.onClose      - Callback to close the popup.
 * @param {Array}   props.scannedEmails - Array of email objects that have been
 *                                         scanned (used to populate the tank and stats).
 * @returns {JSX.Element} The animated fish tank popup wrapped in AnimatePresence.
 */
function FishTankPopup({ isOpen, onClose, scannedEmails }) {
  const totalScanned = scannedEmails.length;
  const fishCounts = { friendly: 0, suspicious: 0, phishy: 0, shark: 0 };
  scannedEmails.forEach(e => { fishCounts[e.fishType] = (fishCounts[e.fishType] || 0) + 1; });
  const totalFish = Object.values(fishCounts).reduce((s, c) => s + c, 0);
  const typesCollected = Object.values(fishCounts).filter(c => c > 0).length;

  const fishTypeInfo = [
    { key: "friendly", name: "Friendly" },
    { key: "suspicious", name: "Suspicious" },
    { key: "phishy", name: "Phishy" },
    { key: "shark", name: "Mega Phish" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: "3.25rem", right: "0.5rem",
            width: "min(320px, 90%)", borderRadius: 16, overflow: "hidden", zIndex: 60,
            background: "linear-gradient(180deg, #0a1628 0%, #0d2847 50%, #1a4a6e 100%)",
            border: "1px solid rgba(64,224,208,0.3)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 20px rgba(64,224,208,0.1)",
            fontFamily: "'Quicksand', -apple-system, sans-serif",
          }}
        >
          {/* ── Header ── */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", background: "linear-gradient(135deg, #1e3a5f 0%, #0a1628 100%)",
            borderBottom: "2px solid rgba(64,224,208,0.3)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <img src="/logomini.png" alt="" style={{ width: 34, height: 34, borderRadius: 5 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#40e0d0", letterSpacing: 0.5 }}>GoPhishFree</span>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(10,22,40,0.8)", padding: "3px 7px", borderRadius: 16, fontSize: 10, color: "#b8d4e3" }}>
                <span>📧</span><span style={{ fontWeight: 700, color: "#40e0d0" }}>{totalScanned}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(10,22,40,0.8)", padding: "3px 7px", borderRadius: 16, fontSize: 10, color: "#b8d4e3" }}>
                <span>🎣</span><span style={{ fontWeight: 700, color: "#40e0d0" }}>{totalFish}</span>
              </div>
            </div>
          </div>

          {/* ── Fish Tank ── */}
          <div style={{
            position: "relative", height: 180, margin: "8px 8px 6px", borderRadius: 14, overflow: "hidden",
            background: "linear-gradient(180deg, #062a45 0%, #0a4570 25%, #0e5a8a 50%, #1a7aaa 72%, #c2a86e 88%, #a08050 100%)",
            border: "3px solid #2d6a8f",
            boxShadow: "inset 0 0 60px rgba(0,120,180,0.35), inset 0 -20px 30px rgba(160,130,80,0.15), 0 6px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(64,224,208,0.15)",
          }}>
            {/* Glass reflection */}
            <div style={{
              position: "absolute", top: 6, left: 8, width: "35%", height: "35%", zIndex: 20, pointerEvents: "none",
              background: "linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, transparent 70%)",
              borderRadius: "12px 6px 40% 6px",
            }} />

            {/* Caustic lights */}
            <motion.div
              animate={{ x: [0, 6, -4, 2, 0], y: [0, -3, 3, -2, 0], scale: [1, 1.03, 0.97, 1.01, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: 0, opacity: 0.07, pointerEvents: "none", zIndex: 2,
                background: "radial-gradient(ellipse 50px 40px at 25% 35%, rgba(255,255,255,0.9), transparent), radial-gradient(ellipse 40px 50px at 60% 20%, rgba(255,255,255,0.8), transparent), radial-gradient(ellipse 60px 30px at 75% 55%, rgba(255,255,255,0.7), transparent)",
              }}
            />

            {/* Light rays */}
            <div style={{
              position: "absolute", top: "-15%", left: "10%", width: "110%", height: "130%", pointerEvents: "none", zIndex: 1,
              background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.035) 32%, rgba(255,255,255,0.035) 34%, transparent 36%), linear-gradient(105deg, transparent 50%, rgba(255,255,255,0.025) 52%, rgba(255,255,255,0.025) 55%, transparent 57%)",
            }} />

            {/* Water surface with ripple */}
            <motion.div
              animate={{ y: [0, 1.5, 0], opacity: [0.6, 0.85, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 7, zIndex: 15,
                background: "linear-gradient(180deg, rgba(200,230,255,0.35), rgba(64,224,208,0.18), transparent)",
              }}
            />

            {/* Bubbles */}
            {[1,2,3,4,5].map(i => (
              <motion.div
                key={`bubble-${i}`}
                animate={{ y: [0, -90 - i * 15], x: [0, (i % 2 ? 3 : -3), 0], opacity: [0.6, 0] }}
                transition={{ duration: 3 + i * 0.8, repeat: Infinity, delay: i * 1.2, ease: "easeOut" }}
                style={{
                  position: "absolute", bottom: 35, left: 30 + i * 45, zIndex: 8,
                  width: 3 + i % 3, height: 3 + i % 3, borderRadius: "50%",
                  background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85), rgba(64,224,208,0.25), transparent)",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                }}
              />
            ))}

            {/* Floating particles */}
            {[1,2,3,4].map(i => (
              <motion.div
                key={`particle-${i}`}
                animate={{ y: [0, -60 - i * 10], x: [0, 8, -4, 0], opacity: [0, 0.5, 0.3, 0] }}
                transition={{ duration: 10 + i * 3, repeat: Infinity, delay: i * 2, ease: "linear" }}
                style={{
                  position: "absolute", top: 30 + i * 25, left: 20 + i * 60, zIndex: 3, pointerEvents: "none",
                  width: 2, height: 2, borderRadius: "50%",
                  background: i % 2 ? "rgba(200,230,255,0.45)" : "rgba(64,224,208,0.3)",
                }}
              />
            ))}

            {/* SVG Seaweed */}
            <div style={{ position: "absolute", bottom: 24, left: 12, zIndex: 7, pointerEvents: "none" }}>
              <svg width="28" height="50" viewBox="0 0 40 75">
                <motion.path animate={{ d: ["M12,75 Q8,55 14,40 Q10,28 16,15 Q14,8 18,0", "M12,75 Q16,55 10,40 Q14,28 10,15 Q14,8 12,0"] }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  fill="none" stroke="#1f7a45" strokeWidth="5" strokeLinecap="round" />
                <motion.path animate={{ d: ["M22,75 Q26,58 20,42 Q24,30 18,18", "M22,75 Q18,58 24,42 Q20,30 24,18"] }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1.2 }}
                  fill="none" stroke="#28915a" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>

            {/* SVG Coral */}
            <div style={{ position: "absolute", bottom: 24, left: 55, zIndex: 7, pointerEvents: "none" }}>
              <svg width="24" height="22" viewBox="0 0 38 36">
                <path d="M19,36 L19,24 Q16,20 10,14 Q6,10 8,6 Q10,2 14,4 Q16,6 15,10" fill="none" stroke="#e07088" strokeWidth="3" strokeLinecap="round"/>
                <path d="M19,24 Q22,18 28,14 Q32,10 30,6 Q28,2 24,4" fill="none" stroke="#d4607a" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="8" cy="5" r="2" fill="#f0a0b0"/><circle cx="30" cy="5" r="2" fill="#e890a0"/>
              </svg>
            </div>

            {/* Right seaweed */}
            <div style={{ position: "absolute", bottom: 24, right: 50, zIndex: 7, pointerEvents: "none" }}>
              <svg width="20" height="40" viewBox="0 0 35 65">
                <motion.path animate={{ d: ["M10,65 Q14,48 8,34 Q12,22 8,12", "M10,65 Q6,48 12,34 Q8,22 12,12"] }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.5 }}
                  fill="none" stroke="#28915a" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Orange coral right */}
            <div style={{ position: "absolute", bottom: 24, right: 80, zIndex: 7, pointerEvents: "none" }}>
              <svg width="20" height="18" viewBox="0 0 34 32">
                <path d="M17,32 L17,20 Q12,14 6,10 Q2,8 4,4 Q6,1 10,3" fill="none" stroke="#e8854a" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M17,20 Q22,14 28,10 Q32,8 30,4 Q28,1 24,3" fill="none" stroke="#d67540" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="4" cy="3" r="1.5" fill="#f0a060"/><circle cx="30" cy="3" r="1.5" fill="#e89050"/>
              </svg>
            </div>

            {/* Treasure chest */}
            <div style={{ position: "absolute", bottom: 24, right: 18, zIndex: 7, pointerEvents: "none" }}>
              <motion.div animate={{ filter: ["drop-shadow(0 1px 4px rgba(255,215,0,0.15))", "drop-shadow(0 1px 12px rgba(255,215,0,0.55))", "drop-shadow(0 1px 4px rgba(255,215,0,0.15))"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <svg width="22" height="18" viewBox="0 0 36 30">
                  <rect x="2" y="14" width="32" height="14" rx="2" fill="#8B5E3C"/>
                  <path d="M2,14 Q2,4 18,4 Q34,4 34,14 Z" fill="#A0703C"/>
                  <rect x="0" y="13" width="36" height="3" rx="1" fill="#c8a84a" opacity="0.8"/>
                  <rect x="14" y="11" width="8" height="8" rx="2" fill="#d4b050"/>
                  <circle cx="18" cy="15.5" r="1" fill="#8B5E3C"/>
                  <ellipse cx="10" cy="12" rx="3" ry="1.5" fill="#e8c040" opacity="0.7"/>
                </svg>
              </motion.div>
            </div>

            {/* Pebbles */}
            <svg style={{ position: "absolute", bottom: 20, left: 0, right: 0, zIndex: 7, pointerEvents: "none" }} width="100%" height="10" viewBox="0 0 300 10" preserveAspectRatio="none">
              <ellipse cx="30" cy="6" rx="4" ry="2.5" fill="#8a8078" opacity="0.5"/>
              <ellipse cx="80" cy="7" rx="3" ry="2" fill="#9a9088" opacity="0.4"/>
              <ellipse cx="140" cy="5" rx="5" ry="2.5" fill="#7a7068" opacity="0.5"/>
              <ellipse cx="200" cy="7" rx="3.5" ry="2" fill="#8a8078" opacity="0.45"/>
              <ellipse cx="260" cy="6" rx="4" ry="2.5" fill="#706858" opacity="0.5"/>
            </svg>

            {/* Starfish */}
            <div style={{ position: "absolute", bottom: 26, left: 95, zIndex: 7, pointerEvents: "none" }}>
              <svg width="10" height="10" viewBox="0 0 20 20">
                <polygon points="10,0 12.4,7 20,7.6 14,12.4 15.6,20 10,15.8 4.4,20 6,12.4 0,7.6 7.6,7" fill="#e0855a" stroke="#c87048" strokeWidth="0.5"/>
              </svg>
            </div>

            {/* SVG Sand floor */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 28, borderRadius: "0 0 11px 11px", overflow: "hidden", zIndex: 6 }}>
              <svg width="100%" height="100%" viewBox="0 0 300 28" preserveAspectRatio="none">
                <path d="M0,6 Q15,3 35,5 T75,4 T110,7 T150,5 T190,6 T230,4 T270,6 T300,7 L300,28 L0,28 Z" fill="#c2a468"/>
                <path d="M0,10 Q20,7 45,9 T90,8 T140,10 T190,7 T240,9 T300,10 L300,28 L0,28 Z" fill="#b89858"/>
                <path d="M0,14 Q18,11 40,13 T85,12 T130,14 T180,11 T230,13 T300,14 L300,28 L0,28 Z" fill="#a88a4a"/>
              </svg>
            </div>

            {/* SVG Fish swimming */}
            <div style={{ position: "absolute", top: 10, left: 6, right: 6, bottom: 30, overflow: "hidden", zIndex: 5 }}>
              {scannedEmails.length === 0 ? (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center", color: "rgba(255,255,255,0.6)", zIndex: 10 }}>
                  <div style={{ fontSize: 28, marginBottom: 4, opacity: 0.5 }}>🐠</div>
                  <div style={{ fontSize: 10, fontWeight: 500 }}>Your tank is empty!</div>
                  <div style={{ fontSize: 8, opacity: 0.7, marginTop: 3 }}>Scan emails to catch phish</div>
                </div>
              ) : (
                scannedEmails.map((e, i) => {
                  const goingLeft = i % 2 === 0;
                  const xStart = goingLeft ? -20 : 260;
                  const xEnd = goingLeft ? 260 : -20;
                  const yBase = 15 + (i * 28) % 100;
                  return (
                    <motion.div
                      key={e.id}
                      animate={{
                        x: [xStart, xEnd * 0.4, xEnd, xStart * 0.4, xStart],
                        y: [yBase, yBase - 8 + i * 3, yBase + 5, yBase - 3, yBase],
                      }}
                      transition={{ duration: 10 + i * 3, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        position: "absolute", zIndex: 5, pointerEvents: "none",
                        transform: goingLeft ? "scaleX(1)" : "scaleX(-1)",
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))",
                      }}
                    >
                      <motion.div
                        animate={{ scaleX: [goingLeft ? 1 : -1, goingLeft ? 1 : -1, goingLeft ? -1 : 1, goingLeft ? -1 : 1, goingLeft ? 1 : -1] }}
                        transition={{ duration: 10 + i * 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.24, 0.25, 0.74, 0.75] }}
                      >
                        <MiniFish type={e.fishType} size={e.fishType === "shark" ? 42 : 28} />
                      </motion.div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Fish Collection ── */}
          <div style={{ margin: "0 8px 6px", background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(64,224,208,0.2)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(0,0,0,0.2)", borderBottom: "1px solid rgba(64,224,208,0.15)" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#40e0d0" }}>🏆 Fish Collection</span>
              <span style={{ fontSize: 9, color: "#b8d4e3", background: "rgba(64,224,208,0.2)", padding: "2px 6px", borderRadius: 8 }}>{typesCollected} / 4 types</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 6 }}>
              {fishTypeInfo.map((ft) => (
                <div key={ft.key} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "6px 3px", background: "rgba(255,255,255,0.05)", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  opacity: fishCounts[ft.key] > 0 ? 1 : 0.4,
                  filter: fishCounts[ft.key] > 0 ? "none" : "grayscale(1)",
                  transition: "all 0.2s",
                }}>
                  <div style={{ marginBottom: 2, height: 18, display: "flex", alignItems: "center" }}>
                    <MiniFish type={ft.key} size={24} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{fishCounts[ft.key]}</span>
                  <span style={{ fontSize: 7, color: "#b8d4e3", textAlign: "center" }}>{ft.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recent catches ── */}
          <div style={{ margin: "0 8px 6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#b8d4e3" }}>Recent Catches</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", maxHeight: 75, overflowY: "auto" }}>
              {scannedEmails.length === 0 ? (
                <div style={{ padding: 12, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>No catches yet — start scanning!</div>
              ) : (
                scannedEmails.map((e) => {
                  const rc = e.score >= 76 ? { bg: "rgba(255,107,107,0.3)", c: "#ff6b6b" } : e.score >= 50 ? { bg: "rgba(255,193,7,0.3)", c: "#ffc107" } : { bg: "rgba(64,224,208,0.3)", c: "#40e0d0" };
                  return (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ width: 22, height: 16, flexShrink: 0 }}><MiniFish type={e.fishType} size={22} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.email.split("@")[1]}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>Just now</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 6, background: rc.bg, color: rc.c }}>{e.score}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Settings panel (full shell replica of popup.html settings) */}
          <div style={{ margin: "0 8px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 10, border: "1px solid rgba(64,224,208,0.2)", overflow: "hidden" }}>
            <div style={{ padding: "6px 10px", background: "rgba(0,0,0,0.2)", borderBottom: "1px solid rgba(64,224,208,0.15)" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#b8d4e3" }}>Settings</span>
            </div>
            <div style={{ padding: "8px 10px" }}>
              {/* Enhanced Scanning */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>Enhanced Scanning</div>
                  <div style={{ fontSize: 7, color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>DNS checks via Cloudflare (only domain names sent)</div>
                </div>
                <div style={{ width: 28, height: 16, borderRadius: 16, background: "#40e0d0", position: "relative", flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ position: "absolute", top: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "#fff" }} />
                </div>
              </div>

              {/* Enhance with AI */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>Enhance with AI</div>
                  <div style={{ fontSize: 7, color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>Bring your own API key to enhance with AI (features only, no email text)</div>
                </div>
                <div style={{ width: 28, height: 16, borderRadius: 16, background: "rgba(255,255,255,0.15)", position: "relative", flexShrink: 0, marginLeft: 8 }}>
                  <div style={{ position: "absolute", top: 2, left: 2, width: 12, height: 12, borderRadius: "50%", background: "#fff" }} />
                </div>
              </div>

              {/* Trusted Domains */}
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#b8d4e3" }}>Trusted Domains</span>
                  <span style={{ fontSize: 7, color: "rgba(255,255,255,0.4)" }}>500+ built-in</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <div style={{
                    flex: 1, padding: "4px 7px", borderRadius: 6, fontSize: 8,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.25)",
                  }}>example.com</div>
                  <button style={{
                    padding: "4px 7px", borderRadius: 6, fontSize: 7, fontWeight: 700,
                    background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)",
                    color: "#2ecc71", cursor: "default", whiteSpace: "nowrap",
                  }}>+ Trust</button>
                  <button style={{
                    padding: "4px 7px", borderRadius: 6, fontSize: 7, fontWeight: 700,
                    background: "rgba(231,76,60,0.15)", border: "1px solid rgba(231,76,60,0.3)",
                    color: "#e74c3c", cursor: "default", whiteSpace: "nowrap",
                  }}>- Block</button>
                </div>
                <div style={{ fontSize: 7, color: "rgba(255,255,255,0.3)", fontStyle: "italic", marginTop: 4 }}>
                  No custom domains added yet
                </div>
              </div>
            </div>
          </div>

          {/* Demo note */}
          <div style={{
            margin: "0 8px 6px", padding: "5px 8px", borderRadius: 6,
            background: "rgba(64,224,208,0.06)", border: "1px solid rgba(64,224,208,0.1)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
              This is a preview. Install the extension for live fish tank, real-time scanning, AI analysis, and trusted domains management.
            </div>
          </div>

          <div onClick={onClose} style={{ textAlign: "center", padding: "4px", fontSize: 9, color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>
            Click to close
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Email Body View — Individual Email Detail Screen
   ─────────────────────────────────────────────────────────────────────
   Displayed when the user clicks an email row in the inbox view.
   Renders the full email content (subject, sender info, body text)
   along with a header bar containing a back button, live scanning
   indicator (spinner + "Scanning..." label), and the risk badge
   (post-scan). After scanning completes, a call-to-action card
   invites the user to click through to the full analysis panel.
   Transitions in/out via Framer Motion slide animations.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * EmailBodyView — Full email detail view with scan animation and analysis CTA.
 *
 * Renders the email's subject, sender avatar, sender name/address, timestamp,
 * and pre-formatted body text. During an active scan, shows a spinning indicator
 * in the header bar. Once scanning completes, displays the risk badge and a
 * clickable analysis-complete card that opens the side panel.
 *
 * @param {Object}   props
 * @param {Object}   props.email       - The full email data object to display.
 * @param {string}   props.scanState   - Current scan state: "idle", "scanning", or "complete".
 * @param {Function} props.onBack      - Callback to return to the inbox view.
 * @param {Function} props.onOpenPanel - Callback to open the analysis side panel.
 * @returns {JSX.Element} The email detail view with header bar and body content.
 */
function EmailBodyView({ email, scanState, onBack, onOpenPanel }) {
  const isScanned = scanState === "complete";
  const scoreColor = email.score >= 90 ? "#f87171" : email.score >= 76 ? "#fb923c" : email.score >= 50 ? "#fbbf24" : "#4ade80";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      {/* Email header bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(51,65,85,0.25)",
        background: "rgba(17,24,39,0.4)",
      }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: "0.375rem",
          padding: "0.375rem 0.625rem", borderRadius: "0.375rem",
          background: "none", border: "1px solid rgba(51,65,85,0.5)",
          color: "#94a3b8", fontSize: "0.75rem", cursor: "pointer",
        }}>
          <ArrowLeft size={14} />
          Back
        </button>

        <div style={{ flex: 1 }} />

        {/* Risk badge (if scanned) */}
        {isScanned && (
          <RiskBadge email={email} onClick={onOpenPanel} style={{ cursor: "pointer" }} />
        )}

        {/* Scanning indicator */}
        {scanState === "scanning" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.375rem 0.75rem", borderRadius: "9999px",
              background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              style={{
                width: 14, height: 14,
                border: "2px solid rgba(20,184,166,0.3)",
                borderTop: "2px solid #2dd4bf", borderRadius: "50%",
              }}
            />
            <span style={{ fontSize: "0.6875rem", color: "#2dd4bf", fontWeight: 600 }}>Scanning...</span>
          </motion.div>
        )}
      </div>

      {/* Email content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
        {/* Subject + sender */}
        <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.75rem" }}>
          {email.subject}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: email.initialBg, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 700, color: email.initialColor, flexShrink: 0,
          }}>
            {email.initial}
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#e2e8f0" }}>
              {email.sender}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              &lt;{email.email}&gt;
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: "0.6875rem", color: "#475569" }}>
            {email.time}
          </div>
        </div>

        {/* Body text */}
        <div style={{
          fontSize: "0.8125rem", color: "#94a3b8", lineHeight: 1.8,
          whiteSpace: "pre-wrap", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          {email.body}
        </div>

        {/* "Click badge to view analysis" hint */}
        {isScanned && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: "1.5rem", padding: "0.875rem 1.25rem", borderRadius: "0.75rem",
              background: "rgba(20,184,166,0.06)", border: "1px solid rgba(20,184,166,0.15)",
              display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer",
            }}
            onClick={onOpenPanel}
          >
            <ShieldCheck size={20} style={{ color: "#2dd4bf", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#2dd4bf" }}>
                Analysis Complete — Click to view details
              </div>
              <div style={{ fontSize: "0.6875rem", color: "#64748b", marginTop: 2 }}>
                Risk Score: {email.score}/100 • {email.reasons.length} findings • {email.links.length} link(s) analyzed
              </div>
            </div>
            <ExternalLink size={14} style={{ color: "#2dd4bf", marginLeft: "auto", flexShrink: 0 }} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Demo Section — Primary Export
   ─────────────────────────────────────────────────────────────────────
   Top-level section component that orchestrates the entire interactive
   demo experience. Manages state for: per-email scan progress
   (scanStates map), currently-scanning email ID (scanningId), analysis
   animation step and progress bar (analysisStep, analysisProgress),
   selected email for detail view (selectedEmail), side panel target
   (sidePanelEmail), and fish tank visibility (showFishTank).
   Renders a section header with badge/title/description, a browser
   mockup containing the Gmail inbox replica, and footer hints +
   disclaimer. Composes all sub-components defined above.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * DemoSection — Interactive phishing detection demo section.
 *
 * Renders a full browser mockup with a simulated Gmail inbox containing
 * five emails. Users click emails to open them, which auto-triggers a
 * scan animation cycling through analysis steps. After scanning, risk
 * badges appear; clicking them opens the analysis side panel. The
 * GoPhishFree icon in the browser chrome toggles the fish tank popup.
 * A reset button returns the demo to its pristine state.
 *
 * @returns {JSX.Element} The complete demo section element with id="demo".
 */
export default function DemoSection() {
  /* ─── Component State ──────────────────────────────────────
     scanStates      — Map of email.id → "scanning" | "complete"
     scanningId      — ID of the email currently being scanned (null if idle)
     analysisStep    — Index into analysisSteps for the current label
     analysisProgress — 0–100 percentage for the progress bar
     selectedEmail   — Email object currently open in detail view (null = inbox)
     sidePanelEmail  — Email object shown in the analysis side panel (null = hidden)
     showFishTank    — Whether the fish tank popup is open
     sectionRef      — Ref to the <section> DOM element
     ─────────────────────────────────────────────────────────── */
  const [scanStates, setScanStates] = useState({});
  const [scanningId, setScanningId] = useState(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [sidePanelEmail, setSidePanelEmail] = useState(null);
  const [showFishTank, setShowFishTank] = useState(false);
  const sectionRef = useRef(null);

  /** @type {Array<Object>} Derived list of emails whose scan state is "complete". */
  const scannedEmails = fakeEmails.filter(e => scanStates[e.id] === "complete");

  /* ─── Scan Initiation Handler ──────────────────────────────
     Starts a scan for the given email ID. Guards against
     concurrent scans. Sets the email's state to "scanning"
     and resets the analysis step/progress counters.
     ─────────────────────────────────────────────────────────── */

  /**
   * Initiates a simulated scan for the specified email.
   *
   * @param {number} id - The unique ID of the email to scan.
   * @returns {void}
   */
  const handleScan = (id) => {
    if (scanningId) return;
    setScanningId(id);
    setScanStates(prev => ({ ...prev, [id]: "scanning" }));
    setAnalysisStep(0);
    setAnalysisProgress(0);
  };

  /* ─── Scan Simulation Effect ────────────────────────────────
     Drives the analysis animation when scanningId is set.
     Advances through analysisSteps at equal intervals over
     ~1800ms, updating the progress bar. On completion, marks
     the email as "complete" after a 350ms finalization delay
     and resets scanning state. Cleans up interval on unmount
     or when scanningId changes.
     ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!scanningId) return;
    let step = 0;
    const totalSteps = analysisSteps.length;
    const stepDuration = 1800 / totalSteps;
    const interval = setInterval(() => {
      step++;
      if (step < totalSteps) {
        setAnalysisStep(step);
        setAnalysisProgress(((step + 1) / totalSteps) * 100);
      } else {
        clearInterval(interval);
        setAnalysisProgress(100);
        setTimeout(() => {
          setScanStates(prev => ({ ...prev, [scanningId]: "complete" }));
          setScanningId(null);
          setAnalysisStep(0);
          setAnalysisProgress(0);
        }, 350);
      }
    }, stepDuration);
    setAnalysisProgress((1 / totalSteps) * 100);
    return () => clearInterval(interval);
  }, [scanningId]);

  /* ─── Email Click Handler ────────────────────────────────────
     Opens the selected email in the detail view, closes the
     fish tank popup, and auto-triggers a scan after 600ms if
     the email has not yet been scanned.
     ─────────────────────────────────────────────────────────── */

  /**
   * Handles clicking an email row in the inbox.
   *
   * @param {Object} email - The email data object that was clicked.
   * @returns {void}
   */
  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    setShowFishTank(false);
    if (!scanStates[email.id]) {
      setTimeout(() => handleScan(email.id), 600);
    }
  };

  /**
   * Resets the entire demo to its initial unscanned state.
   * Clears all scan states, selected email, side panel, and fish tank.
   *
   * @returns {void}
   */
  const handleReset = () => {
    setScanStates({});
    setScanningId(null);
    setSelectedEmail(null);
    setSidePanelEmail(null);
    setShowFishTank(false);
  };

  /* ═══════════════════════════════════════════════════════════
     Component Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <section id="demo" ref={sectionRef} style={{ position: "relative", paddingTop: "5rem", paddingBottom: "5rem", backgroundColor: "#0a0a0f", zIndex: 2 }}>
      {/* ── Background Gradient Overlay ── */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent, rgba(20,184,166,0.02), transparent)", pointerEvents: "none" }} />

      <div className="container-main" style={{ position: "relative" }}>
        {/* ── Section Header: Badge, Title, Description ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "3rem" }}
        >
          <span style={{
            display: "inline-block", padding: "0.375rem 1rem", borderRadius: "9999px",
            background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)",
            color: "#2dd4bf", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1rem",
          }}>
            Interactive Demo
          </span>
          <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 700, marginBottom: "1rem" }}>
            See It{" "}
            <span style={{ backgroundImage: "linear-gradient(to right, #2dd4bf, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              In Action
            </span>
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.125rem", maxWidth: "40rem", marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>
            Click any email to open it and watch GoPhishFree analyze it in real time.
            Click the risk badge to see the full analysis panel, or the extension icon to view the Fish Tank.
          </p>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════
           Demo Browser Mockup
           ─────────────────────────────────────────────────────
           Full browser window replica with chrome bar (traffic
           light dots, address bar, GoPhishFree extension icon),
           inbox/email body views, analysis overlay, side panel,
           and fish tank popup.
           ═══════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ maxWidth: "56rem", marginLeft: "auto", marginRight: "auto" }}
        >
          <div style={{ position: "relative" }}>
            {/* Glow */}
            <div style={{ position: "absolute", inset: "-1rem", background: "linear-gradient(135deg, rgba(20,184,166,0.12), rgba(16,185,129,0.08))", borderRadius: "1.5rem", filter: "blur(2rem)", pointerEvents: "none" }} />

            {/* Browser window */}
            <div style={{
              position: "relative", borderRadius: "1rem", border: "1px solid rgba(51,65,85,0.5)",
              background: "#1a1a2e", overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 30px rgba(20,184,166,0.05)",
            }}>
              {/* ── Browser chrome ── */}
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem 1rem", background: "#111827",
                borderBottom: "1px solid rgba(51,65,85,0.5)", position: "relative",
              }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(239,68,68,0.7)" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(234,179,8,0.7)" }} />
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(34,197,94,0.7)" }} />
                </div>
                <div style={{ flex: 1, margin: "0 0.75rem" }}>
                  <div style={{
                    background: "#1e293b", borderRadius: "0.375rem", padding: "0.375rem 1rem",
                    fontSize: "0.8125rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.5rem",
                  }}>
                    <Lock size={11} style={{ color: "#34d399" }} />
                    <span>mail.google.com/mail/u/0/#inbox</span>
                  </div>
                </div>
                {/* GoPhishFree extension icon — CLICKABLE for fish tank */}
                <div
                  onClick={() => setShowFishTank(!showFishTank)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.3rem 0.75rem", borderRadius: "0.375rem",
                    background: showFishTank ? "rgba(20,184,166,0.2)" : "rgba(20,184,166,0.1)",
                    border: `1px solid ${showFishTank ? "rgba(20,184,166,0.5)" : "rgba(20,184,166,0.25)"}`,
                    cursor: "pointer", transition: "all 0.2s", position: "relative",
                  }}
                >
                  <img src="/logomini.png" alt="" style={{ width: 16, height: 16, borderRadius: 3 }} />
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#2dd4bf" }}>
                    GoPhishFree
                  </span>
                  {scannedEmails.length > 0 && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      width: 16, height: 16, borderRadius: "50%",
                      background: "#14b8a6", color: "white",
                      fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {scannedEmails.length}
                    </span>
                  )}
                </div>

                {/* Fish Tank popup */}
                <FishTankPopup isOpen={showFishTank} onClose={() => setShowFishTank(false)} scannedEmails={scannedEmails} />
              </div>

              {/* ── Main content area ── */}
              <div style={{ position: "relative", minHeight: 420 }}>
                <AnimatePresence mode="wait">
                  {!selectedEmail ? (
                    /* ── Inbox view ── */
                    <motion.div key="inbox" initial={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}>
                      {/* Gmail header */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(51,65,85,0.25)",
                        background: "rgba(17,24,39,0.4)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <Inbox size={18} style={{ color: "#f87171" }} />
                          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "white" }}>Inbox</span>
                          <span style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 500 }}>
                            {fakeEmails.length} messages
                          </span>
                        </div>
                        {Object.keys(scanStates).length > 0 && (
                          <button onClick={handleReset} style={{
                            display: "inline-flex", alignItems: "center", gap: "0.375rem",
                            padding: "0.375rem 0.75rem", borderRadius: "0.375rem",
                            background: "none", border: "1px solid rgba(51,65,85,0.5)",
                            color: "#94a3b8", fontSize: "0.6875rem", fontWeight: 500, cursor: "pointer",
                          }}>
                            <RotateCcw size={11} /> Reset
                          </button>
                        )}
                      </div>

                      {/* Email rows */}
                      {fakeEmails.map((email) => {
                        const scanState = scanStates[email.id] || "idle";
                        const isComplete = scanState === "complete";
                        const dangerousRow = isComplete && (email.risk === "Dangerous" || email.risk === "High");
                        const cautionRow = isComplete && email.risk === "Medium";
                        return (
                          <div
                            key={email.id}
                            onClick={() => handleEmailClick(email)}
                            style={{
                              display: "flex", alignItems: "center", gap: "0.875rem",
                              padding: "0.875rem 1.25rem",
                              borderBottom: "1px solid rgba(51,65,85,0.15)",
                              borderLeft: isComplete ? `3px solid ${email.color}` : "3px solid transparent",
                              background: dangerousRow ? "rgba(239,68,68,0.06)" : cautionRow ? "rgba(245,158,11,0.04)" : "transparent",
                              cursor: "pointer", transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => { if (!dangerousRow && !cautionRow) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                            onMouseLeave={(e) => { if (!dangerousRow && !cautionRow) e.currentTarget.style.background = "transparent"; }}
                          >
                            {/* Avatar */}
                            <div style={{
                              width: 40, height: 40, borderRadius: "50%", background: email.initialBg,
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                              fontSize: "0.8125rem", fontWeight: 700, color: email.initialColor,
                            }}>
                              {email.initial}
                            </div>
                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#e2e8f0" }}>{email.sender}</span>
                                <span style={{ fontSize: "0.6875rem", color: "#475569", marginLeft: "auto", flexShrink: 0 }}>{email.time}</span>
                              </div>
                              <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#cbd5e1", marginTop: "0.125rem" }}>{email.subject}</div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "0.125rem" }}>
                                {email.preview}
                              </div>
                            </div>
                            {/* Badge */}
                            <div style={{ flexShrink: 0 }}>
                              {isComplete && (
                                <div style={{
                                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                                  padding: "0.375rem 0.75rem", borderRadius: "9999px",
                                  background: email.bgColor, border: `1px solid ${email.borderColor}`, color: email.color,
                                }}>
                                  <span style={{ fontSize: "0.875rem" }}>{email.fishEmoji}</span>
                                  <span style={{ fontSize: "0.6875rem", fontWeight: 700 }}>{email.score}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  ) : (
                    /* ── Email body view ── */
                    <motion.div key="email" style={{ height: "100%" }}>
                      <EmailBodyView
                        email={selectedEmail}
                        scanState={scanStates[selectedEmail.id] || "idle"}
                        onBack={() => { setSelectedEmail(null); setSidePanelEmail(null); }}
                        onOpenPanel={() => setSidePanelEmail(selectedEmail)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Analysis overlay during scan (inbox view) */}
                <AnimatePresence>
                  {scanningId && !selectedEmail && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      style={{
                        position: "absolute", bottom: 0, left: 0, right: 0,
                        padding: "1rem 1.5rem",
                        background: "linear-gradient(to top, rgba(10,10,15,0.97), rgba(10,10,15,0.9))",
                        borderTop: "1px solid rgba(20,184,166,0.2)",
                        backdropFilter: "blur(12px)", zIndex: 20,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                            style={{ width: 18, height: 18, border: "2.5px solid rgba(20,184,166,0.2)", borderTop: "2.5px solid #2dd4bf", borderRadius: "50%" }}
                          />
                          <motion.span key={analysisStep} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                            style={{ fontSize: "0.8125rem", color: "#2dd4bf", fontWeight: 600 }}>
                            {analysisSteps[analysisStep] || "Finalizing..."}
                          </motion.span>
                        </div>
                        <span style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 500 }}>{Math.round(analysisProgress)}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: "rgba(51,65,85,0.4)", overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${analysisProgress}%` }}
                          style={{ height: "100%", borderRadius: 4, background: "linear-gradient(to right, #14b8a6, #10b981)", boxShadow: "0 0 8px rgba(20,184,166,0.4)" }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Side Panel */}
                <SidePanel
                  email={sidePanelEmail}
                  isOpen={!!sidePanelEmail}
                  onClose={() => setSidePanelEmail(null)}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          style={{ textAlign: "center", fontSize: "0.8125rem", color: "#475569", marginTop: "1.5rem" }}
        >
          Click emails to open them • Click the GoPhishFree icon in the browser bar to see the Fish Tank • All data is simulated
        </motion.p>

        {/* Demo disclaimer note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7 }}
          style={{
            textAlign: "center", marginTop: "1rem", padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem", maxWidth: "40rem", marginLeft: "auto", marginRight: "auto",
            background: "rgba(20,184,166,0.04)", border: "1px solid rgba(20,184,166,0.1)",
          }}
        >
          <p style={{ fontSize: "0.8125rem", color: "#64748b", lineHeight: 1.6 }}>
            Not all features can be demonstrated here. AI-enhanced scanning, Deep Scan link analysis, 
            trusted domain management, and real-time phishing detection require the installed Chrome extension 
            with live email data.{" "}
            <a
              href="https://chromewebstore.google.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#2dd4bf", textDecoration: "none", fontWeight: 600 }}
            >
              Install GoPhishFree
            </a>{" "}
            to experience the full feature set.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
