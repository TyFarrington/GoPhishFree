/**
 * @file PrivacySection.jsx
 * @description Privacy and security comparison section for the GoPhishFree landing page.
 *              Presents a two-column layout: a comparison table (GoPhishFree vs Other Solutions)
 *              with checkmark/X icons and a sweep highlight animation on scroll, and a list of
 *              six privacy feature cards with icons. Emphasizes the product's local-only,
 *              zero-data-collection architecture versus cloud-dependent competitors.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions  - React 18+ runtime environment with Framer Motion and Lucide React installed.
 *                 - Parent component mounts this section within a page with global CSS providing
 *                   the `container-main` class and responsive grid utility overrides.
 * @postconditions - Renders an accessible <section> element with id="privacy" containing a
 *                   centered header, a comparison table, and a privacy features list in a
 *                   1-col (mobile) or 2-col (desktop) grid layout.
 *                 - Each table row plays a left-to-right sweep highlight animation on scroll entry.
 * @errorConditions - If Framer Motion or Lucide React are not installed, the component will
 *                    fail to import and will not render.
 * @sideEffects    - Framer Motion IntersectionObserver triggers once-per-element entrance
 *                   animations and sweep highlight variants on comparison table rows.
 *                 - Inline style border-color mutation on mouseEnter/Leave for privacy card
 *                   hover highlights.
 *                 - A subtle background gradient overlay is rendered absolutely behind the content.
 * @invariants     - The comparisons and privacyPoints arrays are immutable; data does not change
 *                   at runtime.
 *                 - All GoPhishFree column values are true; all Others column values are false.
 * @knownFaults    - The "Works Without Internet*" feature has an asterisk footnote — core ML
 *                   scanning works offline but DNS checks and AI enhancement require internet.
 */

import { motion } from "framer-motion";
import { Check, X, Shield, Lock, Eye, Server, KeyRound, Wifi } from "lucide-react";

/* ============================================================================
   Comparison Table Data
   Static array of feature comparisons between GoPhishFree and competing
   solutions. Each entry has a feature name and boolean flags for each column.
   ============================================================================ */

const comparisons = [
  { feature: "Local ML Processing", goPhish: true, others: false },
  { feature: "Zero Data Collection", goPhish: true, others: false },
  { feature: "Completely Free", goPhish: true, others: false },
  { feature: "Open Source", goPhish: true, others: false },
  { feature: "No Account Required", goPhish: true, others: false },
  { feature: "Works Without Internet*", goPhish: true, others: false },
];

/* ============================================================================
   Privacy Features Data
   Static array of six privacy-focused product attributes, each with a Lucide
   icon component, a short title, and a descriptive blurb.
   ============================================================================ */

const privacyPoints = [
  { icon: Lock, title: "End-to-End Local", desc: "All ML inference runs in your browser tab. Nothing is transmitted anywhere." },
  { icon: Eye, title: "No Tracking or Analytics", desc: "We don't track usage, collect data, or use any third-party analytics." },
  { icon: Server, title: "No Backend Server", desc: "There is no server. The extension is entirely self-contained in your browser." },
  { icon: KeyRound, title: "Your Keys, Your Control", desc: "Optional AI enhancement uses YOUR API keys stored only on YOUR device." },
  { icon: Wifi, title: "Offline Capable", desc: "Core phishing detection works without an internet connection.*" },
  { icon: Shield, title: "Manifest V3 Compliant", desc: "Built on Chrome's latest extension platform with enhanced security." },
];

/* ============================================================================
   PrivacySection Main Component
   Composes a two-column layout: the left column holds a comparison table with
   animated sweep highlights on each row; the right column holds a vertical
   stack of privacy feature cards with icon, title, and description.
   ============================================================================ */

/**
 * PrivacySection - Renders the "Privacy & Security" section of the landing page.
 * Displays a centered header, a GoPhishFree vs Others comparison table with
 * scroll-triggered sweep animations, and a list of six privacy feature cards.
 * @returns {JSX.Element} A <section> element with id="privacy".
 */
export default function PrivacySection() {
  return (
    <section id="privacy" style={{ position: "relative", paddingTop: "5rem", paddingBottom: "5rem", backgroundColor: "#0a0a0f", zIndex: 2 }}>
      {/* Subtle background gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent, rgba(20,184,166,0.02), transparent)" }} />

      <div className="container-main" style={{ position: "relative" }}>
        {/* ---- Section Header: badge pill, gradient heading, and subtitle ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "4rem" }}
        >
          <span style={{ display: "inline-block", padding: "0.375rem 1rem", borderRadius: "9999px", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", color: "#2dd4bf", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1rem" }}>
            Privacy & Security
          </span>
          <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 700, marginBottom: "1rem" }}>
            Your Data{" "}
            <span style={{ backgroundImage: "linear-gradient(to right, #2dd4bf, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Never Leaves
            </span>{" "}
            Your Device
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.125rem", maxWidth: "40rem", marginLeft: "auto", marginRight: "auto" }}>
            Unlike other solutions that send your emails to the cloud, GoPhishFree processes everything locally.
          </p>
        </motion.div>

        {/* ---- Two-Column Layout: comparison table (left) + privacy features (right) ---- */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem", alignItems: "start" }} className="lg:!grid-cols-2">

          {/* ---- Left Column: Comparison Table ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ borderRadius: "1rem", border: "1px solid rgba(51,65,85,0.5)", background: "rgba(26,26,46,0.6)", overflow: "hidden" }}>
              {/* Table header row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", padding: "1rem 1.5rem", background: "rgba(17,24,39,0.8)", borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#94a3b8" }}>Feature</div>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#2dd4bf", textAlign: "center" }}>GoPhishFree</div>
                <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#64748b", textAlign: "center" }}>Others</div>
              </div>
              {/* Table body rows with sweep highlight animation */}
              {comparisons.map((row, i) => (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-30px" }}
                  style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", padding: "1rem 1.5rem", borderBottom: i < comparisons.length - 1 ? "1px solid rgba(51,65,85,0.2)" : "none", overflow: "hidden" }}
                >
                  {/* Animated sweep highlight that travels left-to-right on scroll entry */}
                  <motion.div
                    variants={{
                      hidden: { x: "-100%", opacity: 0 },
                      visible: { x: "100%", opacity: [0, 0.6, 0] },
                    }}
                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeInOut" }}
                    style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(90deg, transparent, rgba(20,184,166,0.08), transparent)",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Feature name */}
                  <div style={{ fontSize: "0.875rem", color: "#cbd5e1" }}>{row.feature}</div>
                  {/* GoPhishFree column: green checkmark */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(20,184,166,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={16} style={{ color: "#2dd4bf" }} />
                    </div>
                  </div>
                  {/* Others column: red X mark */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={16} style={{ color: "#f87171" }} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Asterisk footnote for offline capability */}
            <p style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.75rem", paddingLeft: "0.5rem" }}>
              *Core ML scanning works offline. DNS checks and AI enhancement require internet.
            </p>
          </motion.div>

          {/* ---- Right Column: Privacy Feature Cards ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {privacyPoints.map((point, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(51,65,85,0.3)", background: "rgba(26,26,46,0.3)", transition: "border-color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(51,65,85,0.3)"; }}
              >
                {/* Privacy feature icon badge */}
                <div style={{ flexShrink: 0, width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem", background: "rgba(20,184,166,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <point.icon size={20} style={{ color: "#2dd4bf" }} />
                </div>
                {/* Privacy feature title and description */}
                <div>
                  <h4 style={{ color: "white", fontWeight: 500, marginBottom: "0.25rem" }}>{point.title}</h4>
                  <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>{point.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
