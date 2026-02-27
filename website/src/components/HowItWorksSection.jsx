/**
 * @file HowItWorksSection.jsx
 * @description Three-step process explainer section for the GoPhishFree landing page.
 *              Displays numbered steps (Install, Open Gmail, Stay Protected) with icons,
 *              titles, and descriptions. Uses Framer Motion scroll-triggered animations
 *              with staggered reveal delays. A horizontal connecting line joins the steps
 *              on desktop viewports to visually convey sequential flow.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions  - React 18+ runtime environment with Framer Motion and Lucide React installed.
 *                 - Parent component mounts this section within a page with global CSS providing
 *                   the `container-main` class and responsive Tailwind utility overrides.
 * @postconditions - Renders an accessible <section> element with id="how-it-works" containing
 *                   three animated step cards in a 1-column (mobile) or 3-column (desktop) grid.
 *                 - A decorative gradient connecting line renders between steps on md+ screens.
 * @errorConditions - If Framer Motion or Lucide React are not installed, the component will
 *                    fail to import and will not render.
 * @sideEffects    - Framer Motion IntersectionObserver triggers once-per-element entrance
 *                   animations with staggered delays (0.2s per step).
 *                 - A subtle background gradient overlay is rendered absolutely behind the content.
 * @invariants     - The steps array is immutable; step data does not change at runtime.
 *                 - Step ordering (01, 02, 03) is fixed and always renders sequentially.
 * @knownFaults    - None at this time.
 */

import { motion } from "framer-motion";
import { Download, Mail, ShieldCheck } from "lucide-react";

/* ============================================================================
   Step Data
   Static array defining the three onboarding steps. Each entry contains a
   zero-padded step number, a Lucide icon component, a title, and a description.
   ============================================================================ */

const steps = [
  { number: "01", icon: Download, title: "Install the Extension", description: "Add GoPhishFree to Chrome in one click. It's completely free with no account required." },
  { number: "02", icon: Mail, title: "Open Gmail", description: "GoPhishFree activates automatically when you open Gmail. Zero setup, zero configuration needed." },
  { number: "03", icon: ShieldCheck, title: "Stay Protected", description: "Every email is analyzed locally by our ML model. Phishing emails are flagged instantly with risk scores." },
];

/* ============================================================================
   HowItWorksSection Main Component
   Composes the section header and a responsive grid of step cards, each with a
   circular icon container, glow backdrop, step label, and descriptive text.
   On desktop (md+), a horizontal gradient line connects the step circles.
   ============================================================================ */

/**
 * HowItWorksSection - Renders the "How It Works" section of the landing page.
 * Displays a centered header and three sequentially-animated step cards that
 * explain the GoPhishFree setup process in three simple steps.
 * @returns {JSX.Element} A <section> element with id="how-it-works".
 */
export default function HowItWorksSection() {
  return (
    <section id="how-it-works" style={{ position: "relative", paddingTop: "5rem", paddingBottom: "5rem", backgroundColor: "#0a0a0f", zIndex: 2 }}>
      {/* Subtle background gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent, rgba(20,184,166,0.02), transparent)" }} />

      <div className="container-main" style={{ position: "relative" }}>
        {/* ---- Section Header: badge pill, gradient heading, and subtitle ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "5rem" }}
        >
          <span style={{ display: "inline-block", padding: "0.375rem 1rem", borderRadius: "9999px", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", color: "#2dd4bf", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1rem" }}>
            How It Works
          </span>
          <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 700, marginBottom: "1rem" }}>
            Up and Running in{" "}
            <span style={{ backgroundImage: "linear-gradient(to right, #2dd4bf, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Seconds
            </span>
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.125rem", maxWidth: "40rem", marginLeft: "auto", marginRight: "auto" }}>
            No accounts, no configuration, no data collection. Just install and go.
          </p>
        </motion.div>

        {/* ---- Steps Grid: 1-col mobile / 3-col desktop with connecting line ---- */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr", gap: "3rem" }} className="md:!grid-cols-3 md:!gap-8">
          {/* Horizontal connecting line between step circles (visible on md+ screens) */}
          <div className="hidden md:!block" style={{ position: "absolute", top: "4rem", left: "20%", right: "20%", height: 2, background: "linear-gradient(to right, rgba(20,184,166,0.3), rgba(20,184,166,0.6), rgba(20,184,166,0.3))" }} />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
            >
              {/* Step icon circle with glow backdrop */}
              <div style={{ position: "relative", marginBottom: "2rem" }}>
                {/* Blurred glow behind the circle */}
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(20,184,166,0.2)", filter: "blur(1rem)", transform: "scale(1.5)" }} />
                {/* Circular icon container with step number */}
                <div style={{ position: "relative", width: "8rem", height: "8rem", borderRadius: "50%", background: "linear-gradient(135deg, #1a1a2e, #111827)", border: "2px solid rgba(20,184,166,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <step.icon size={32} style={{ color: "#2dd4bf", marginBottom: "0.25rem" }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(45,212,191,0.6)", letterSpacing: "0.05em" }}>
                    STEP {step.number}
                  </span>
                </div>
              </div>
              {/* Step title */}
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.75rem" }}>
                {step.title}
              </h3>
              {/* Step description */}
              <p style={{ color: "#94a3b8", lineHeight: 1.7, maxWidth: "18rem" }}>
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
