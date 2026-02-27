/**
 * @file HeroSection.jsx
 * @description Landing hero section for the GoPhishFree marketing website. Features an
 *              animated gradient background with mouse-responsive parallax orbs, floating
 *              security-themed icons animated via Framer Motion, a swimming fish background
 *              layer, headline copy with key statistics, dual CTA buttons, and a browser
 *              mockup showcasing the extension's email classification capabilities.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions
 *   - React 18+ and Framer Motion must be installed.
 *   - Lucide React icons (Shield, ShieldCheck, Lock) must be available.
 *   - The HeroFishBackground component must be exported from "./SwimmingFish".
 *   - The logo image "/logomini.png" must be served from the public directory.
 *   - A CSS class "container-main" must be defined for centered page layout.
 *   - Responsive utility classes (e.g., "lg:!grid-cols-2") must be available.
 *
 * @postconditions
 *   - A full-viewport-height hero section renders with id="hero".
 *   - Gradient orbs translate in response to mouse position, creating a parallax effect.
 *   - Six floating shield icons animate in a continuous loop (bob, rotate, fade).
 *   - Text content, statistics, and CTA buttons animate into view on page load.
 *   - A browser mockup with four sample email rows (Safe, Phishing, Safe, Suspicious)
 *     is displayed on large viewports.
 *
 * @errorConditions
 *   - If the SwimmingFish module fails to load, the hero renders without the fish layer.
 *   - If the mouse never moves, orbs remain at their default centered positions.
 *
 * @sideEffects
 *   - Attaches a "mousemove" event listener to the window on mount; removes it on unmount.
 *   - Continuously runs Framer Motion animations on floating icons (infinite loop).
 *
 * @invariants
 *   - The floatingIcons array is a static constant and is never mutated at runtime.
 *   - The hero section always occupies at least 100vh in height.
 *   - Mouse position is normalized to the range [-1, 1] on both axes.
 *
 * @knownFaults
 *   - The "Add to Chrome" CTA href is currently "#" (placeholder).
 *   - The "Learn More" link targets #features; if that section is removed, the link breaks.
 *   - The browser mockup is hidden on viewports below the "lg" breakpoint.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, Lock } from "lucide-react";
import { HeroFishBackground } from "./SwimmingFish";

/* ═══════════════════════════════════════════════════════════════
   Floating Icon Configuration
   ─────────────────────────────────────────────────────────────
   Defines the security-themed icons that float across the hero
   background. Each entry specifies the Lucide icon component,
   absolute CSS position, animation delay, and rendered size.
   ═══════════════════════════════════════════════════════════════ */

const floatingIcons = [
  { Icon: Shield, x: "10%", y: "20%", delay: 0, size: 32 },
  { Icon: ShieldCheck, x: "85%", y: "15%", delay: 0.5, size: 28 },
  { Icon: Lock, x: "75%", y: "70%", delay: 1, size: 24 },
  { Icon: Shield, x: "15%", y: "75%", delay: 1.5, size: 20 },
  { Icon: ShieldCheck, x: "50%", y: "10%", delay: 0.8, size: 26 },
  { Icon: Lock, x: "90%", y: "45%", delay: 1.2, size: 22 },
];

/**
 * HeroSection — Full-viewport landing hero component.
 *
 * Composes multiple visual layers (gradient background, parallax orbs,
 * swimming fish, floating icons) behind the main content area, which
 * includes headline text, accuracy/privacy/price statistics, CTA buttons,
 * and a Gmail-style browser mockup demonstrating the extension.
 *
 * @returns {JSX.Element} The complete hero section element.
 */
export default function HeroSection() {
  /**
   * @type {[{x: number, y: number}, Function]}
   * Normalized mouse position in the range [-1, 1] for both axes,
   * used to drive the parallax translation of gradient orbs.
   */
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  /* ─── Mouse Tracking Effect ─────────────────────────────────
     Captures the mouse position relative to the viewport center
     and normalizes it to [-1, 1]. The resulting values are used
     to translate the background gradient orbs for a parallax
     depth effect. Cleans up on unmount.
     ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  /* ═══════════════════════════════════════════════════════════
     Component Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <section
      id="hero"
      style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
    >
      {/* ── Layer 1: Static Gradient Background ── */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0a0a0f, #0d1117, #0a1628)" }} />

      {/* ── Layer 2: Mouse-Responsive Parallax Gradient Orbs ── */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{
          position: "absolute", top: "25%", left: "25%", width: "24rem", height: "24rem",
          background: "rgba(20,184,166,0.1)", borderRadius: "50%", filter: "blur(128px)",
          transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`,
          transition: "transform 0.3s ease-out",
        }} />
        <div style={{
          position: "absolute", bottom: "25%", right: "25%", width: "20rem", height: "20rem",
          background: "rgba(16,185,129,0.08)", borderRadius: "50%", filter: "blur(100px)",
          transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)`,
          transition: "transform 0.3s ease-out",
        }} />
      </div>

      {/* ── Layer 3: Swimming Fish Background ── */}
      <HeroFishBackground />

      {/* ── Layer 4: Floating Security Icons ──
          Each icon bobs vertically, fades in/out, and rotates
          on an infinite 6-second loop with staggered delays. */}
      {floatingIcons.map((item, i) => (
        <motion.div
          key={i}
          style={{ position: "absolute", left: item.x, top: item.y, color: "rgba(20,184,166,0.15)", pointerEvents: "none" }}
          animate={{ y: [0, -20, 0], opacity: [0.15, 0.3, 0.15], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 6, delay: item.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <item.Icon size={item.size} />
        </motion.div>
      ))}

      {/* ═══════════════════════════════════════════════════════
         Main Content Area
         ═══════════════════════════════════════════════════════ */}
      <div className="container-main" style={{ position: "relative", zIndex: 10, paddingTop: "7rem", paddingBottom: "3rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem", alignItems: "center" }} className="lg:!grid-cols-2 lg:!gap-16">

          {/* ── Left Column: Text Content & CTAs ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{ textAlign: "center" }}
            className="lg:!text-left"
          >
            {/* Badge pill — "Privacy-First Phishing Protection" */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "9999px", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", color: "#2dd4bf", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1.5rem" }}
            >
              <ShieldCheck size={16} />
              Privacy-First Phishing Protection
            </motion.div>

            {/* ── Headline ── */}
            <h1 style={{ fontSize: "clamp(2.25rem, 5vw, 3.75rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: "1.5rem" }}>
              Protect Your Inbox with{" "}
              <span style={{ backgroundImage: "linear-gradient(to right, #2dd4bf, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                AI-Powered
              </span>{" "}
              Phishing Detection
            </h1>

            {/* ── Subheadline / Value Proposition ── */}
            <p style={{ fontSize: "1.125rem", color: "#94a3b8", marginBottom: "2rem", lineHeight: 1.7, maxWidth: "32rem" }} className="lg:!mx-0 mx-auto">
              GoPhishFree detects phishing emails directly in Gmail using local
              machine learning.{" "}
              <span style={{ color: "#2dd4bf", fontWeight: 600 }}>96.6% accuracy</span>
              . Zero data leaves your device. Completely free.
            </p>

            {/* ── Key Statistics Row ── */}
            <div style={{ display: "flex", gap: "2rem", marginBottom: "2.5rem", justifyContent: "center" }} className="lg:!justify-start">
              {[
                { value: "96.6%", label: "Accuracy" },
                { value: "100%", label: "Private" },
                { value: "Free", label: "Forever" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  style={{ textAlign: "center" }}
                >
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2dd4bf" }}>{stat.value}</div>
                  <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* ── Call-to-Action Buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "center" }}
              className="lg:!justify-start"
            >
              {/* Primary CTA — Chrome Web Store */}
              <a
                href="#"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "1rem 2rem", borderRadius: "0.75rem", background: "linear-gradient(to right, #14b8a6, #10b981)", color: "white", fontWeight: 600, fontSize: "1.125rem", textDecoration: "none", boxShadow: "0 10px 25px rgba(20,184,166,0.25)", transition: "transform 0.3s, box-shadow 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 15px 35px rgba(20,184,166,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 10px 25px rgba(20,184,166,0.25)"; }}
              >
                <svg viewBox="0 0 24 24" style={{ width: "1.5rem", height: "1.5rem" }} fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Add to Chrome — It&apos;s Free
              </a>
              {/* Secondary CTA — Learn More */}
              <a
                href="#features"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1rem 2rem", borderRadius: "0.75rem", border: "1px solid #334155", color: "#cbd5e1", fontWeight: 500, textDecoration: "none", transition: "border-color 0.3s, color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.5)"; e.currentTarget.style.color = "#2dd4bf"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#cbd5e1"; }}
              >
                Learn More
              </a>
            </motion.div>
          </motion.div>

          {/* ── Right Column: Browser Mockup (Desktop Only) ──
              Displays a stylized browser window with four sample
              email rows, each showing a risk classification badge
              (Safe, Phishing, Safe, Suspicious) to preview the
              extension's capabilities. */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:!block"
          >
            <div style={{ position: "relative" }}>
              {/* Background glow behind the browser frame */}
              <div style={{ position: "absolute", inset: "-1rem", background: "linear-gradient(to right, rgba(20,184,166,0.2), rgba(16,185,129,0.2))", borderRadius: "1rem", filter: "blur(2rem)" }} />

              {/* Browser window chrome */}
              <div style={{ position: "relative", background: "#1a1a2e", borderRadius: "1rem", border: "1px solid rgba(51,65,85,0.5)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)", overflow: "hidden" }}>
                {/* Title bar with traffic-light dots and address bar */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", background: "#111827", borderBottom: "1px solid rgba(51,65,85,0.5)" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(239,68,68,0.7)" }} />
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(234,179,8,0.7)" }} />
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(34,197,94,0.7)" }} />
                  </div>
                  <div style={{ flex: 1, margin: "0 1rem" }}>
                    <div style={{ background: "#1e293b", borderRadius: "0.375rem", padding: "0.375rem 1rem", fontSize: "0.875rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Lock size={12} />
                      mail.google.com
                    </div>
                  </div>
                </div>

                {/* ── Sample Email Rows ── */}
                <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {[
                    { initial: "G", name: "Google Security", preview: "Your account is secure", status: "Safe", color: "#34d399", bgColor: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.3)", iconColor: "#3b82f6", iconBg: "rgba(59,130,246,0.2)" },
                    { initial: "!", name: "Urgent: Verify your account", preview: "Click here to verify your bank details...", status: "Phishing", color: "#f87171", bgColor: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)", iconColor: "#f87171", iconBg: "rgba(239,68,68,0.2)", rowBg: "rgba(239,68,68,0.05)" },
                    { initial: "T", name: "Team Update", preview: "Weekly standup notes for this week...", status: "Safe", color: "#34d399", bgColor: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.3)", iconColor: "#a78bfa", iconBg: "rgba(139,92,246,0.2)" },
                    { initial: "$", name: "You've won a prize!", preview: "Claim your $10,000 reward now...", status: "Suspicious", color: "#fbbf24", bgColor: "rgba(245,158,11,0.15)", borderColor: "rgba(245,158,11,0.2)", iconColor: "#fbbf24", iconBg: "rgba(245,158,11,0.2)", rowBg: "rgba(245,158,11,0.05)" },
                  ].map((email, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem", borderRadius: "0.5rem", background: email.rowBg || "rgba(30,41,59,0.5)", border: email.rowBg ? `1px solid ${email.borderColor}` : "none" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: email.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: email.iconColor, fontSize: "0.75rem", fontWeight: 700 }}>{email.initial}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#cbd5e1" }}>{email.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.preview}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.25rem 0.625rem", borderRadius: "9999px", background: email.bgColor, border: `1px solid ${email.borderColor}`, flexShrink: 0 }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 500, color: email.color }}>{email.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
