/**
 * @file CTASection.jsx
 * @description Bottom-of-page call-to-action banner for the GoPhishFree marketing website.
 *              Displays a gradient-bordered card with a headline, value proposition, and
 *              primary download button linking to the Chrome Web Store, plus a secondary
 *              GitHub link. Includes decorative gradient orbs and a scroll-triggered
 *              fade-in entrance animation.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions  - React 18+ runtime available
 *                 - framer-motion and lucide-react packages installed
 *                 - SwimmingFish module exports CTAFishBackground (currently a no-op)
 * @postconditions - Renders a visually prominent CTA section with two action links
 *                 - Scroll-triggered entrance animation fires once via whileInView
 * @errorConditions - None anticipated; all content is static
 * @sideEffects    - DOM changes via Framer Motion scroll-triggered opacity/translate animation
 *                 - Inline hover handlers mutate button transform and box-shadow styles
 * @invariants     - Component is stateless; no internal state management
 *                 - CTAFishBackground is imported but currently returns null (fish at page level)
 * @knownFaults    - None
 */

import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { CTAFishBackground } from "./SwimmingFish";

/* ────────────────────────────────────────────────────────
   CTASection — Main exported call-to-action component
   ──────────────────────────────────────────────────────── */

/**
 * Renders the final call-to-action section of the landing page. Contains a
 * gradient-bordered card with a ShieldCheck icon, persuasive headline, body
 * copy, a primary "Add to Chrome" button, and a secondary "View on GitHub"
 * link. Decorative blurred gradient orbs provide ambient depth behind the text.
 *
 * @returns {JSX.Element} The complete CTA section
 */
export default function CTASection() {
  return (
    <section style={{ position: "relative", paddingTop: "5rem", paddingBottom: "5rem", overflow: "hidden", backgroundColor: "#0a0a0f", zIndex: 2 }}>
      {/* Swimming fish background (currently returns null — fish rendered at page level) */}
      <CTAFishBackground />

      <div className="container-mid">
        {/* Outer glow — blurred gradient border effect behind the card */}
        <div style={{ position: "absolute", inset: "-4px", background: "linear-gradient(to right, rgba(20,184,166,0.2), rgba(16,185,129,0.2), rgba(20,184,166,0.2))", borderRadius: "1.5rem", filter: "blur(1rem)", pointerEvents: "none" }} />

        {/* Main card with scroll-triggered entrance animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ position: "relative", overflow: "hidden", borderRadius: "1.5rem", border: "1px solid rgba(20,184,166,0.2)", background: "linear-gradient(135deg, #0d1f1d, #0a1628, #0d1f1d)" }}
        >
          {/* Gradient orbs — decorative ambient light blobs */}
          <div style={{ position: "absolute", top: 0, left: "25%", width: "16rem", height: "16rem", background: "rgba(20,184,166,0.1)", borderRadius: "50%", filter: "blur(80px)" }} />
          <div style={{ position: "absolute", bottom: 0, right: "25%", width: "12rem", height: "12rem", background: "rgba(16,185,129,0.1)", borderRadius: "50%", filter: "blur(60px)" }} />

          {/* Content — headline, body copy, and action buttons */}
          <div style={{ position: "relative", zIndex: 10, padding: "4rem 2rem", textAlign: "center" }}>
            <ShieldCheck size={48} style={{ margin: "0 auto 1.5rem", color: "#2dd4bf", display: "block" }} />

            <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 700, marginBottom: "1.5rem" }}>
              Ready to{" "}
              <span style={{ backgroundImage: "linear-gradient(to right, #2dd4bf, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Protect Your Inbox
              </span>
              ?
            </h2>

            <p style={{ fontSize: "1.125rem", color: "#94a3b8", maxWidth: "36rem", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
              Join Gmail users who trust GoPhishFree to detect phishing emails
              with 96.6% accuracy. Privacy-first, local ML, completely free.
              Install in one click.
            </p>

            {/* Action buttons — primary Chrome Web Store link + secondary GitHub link */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
              <a
                href="#"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", padding: "1rem 2.5rem", borderRadius: "0.75rem", background: "linear-gradient(to right, #14b8a6, #10b981)", color: "white", fontWeight: 600, fontSize: "1.125rem", textDecoration: "none", boxShadow: "0 10px 25px rgba(20,184,166,0.25)", transition: "transform 0.3s, box-shadow 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 15px 35px rgba(20,184,166,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 10px 25px rgba(20,184,166,0.25)"; }}
              >
                Add to Chrome — It&apos;s Free
                <ArrowRight size={20} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 1.5rem", color: "#94a3b8", fontWeight: 500, textDecoration: "none", transition: "color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#2dd4bf"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}
              >
                View on GitHub
                <ArrowRight size={16} />
              </a>
            </div>

            <p style={{ fontSize: "0.875rem", color: "#475569", marginTop: "1.5rem" }}>
              No account required. No data collected. Uninstall anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
