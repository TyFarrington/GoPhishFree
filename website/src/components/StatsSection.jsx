/**
 * @file StatsSection.jsx
 * @description Animated statistics section for the GoPhishFree landing page. Displays
 *              four key metrics (detection rate, training samples, features analyzed,
 *              privacy score) that count up from zero when scrolled into view. Each stat
 *              card includes a Lucide icon with a one-shot expanding pulse ring animation.
 *              Below the stats grid, a row of trust badges reinforces key product qualities.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions  - React 18+ runtime environment with Framer Motion and Lucide React installed.
 *                 - Parent component mounts this section within a page with global CSS providing
 *                   the `container-main` class and responsive grid utility overrides.
 * @postconditions - Renders a <section> containing four stat cards in a 2-col (mobile) or
 *                   4-col (desktop) grid, each with an animated count-up number.
 *                 - A row of trust badge pills renders below the stats grid.
 * @errorConditions - If Framer Motion or Lucide React are not installed, the component will
 *                    fail to import and will not render.
 * @sideEffects    - Framer Motion `animate()` spawns a tween animation per stat when scrolled
 *                   into view; cleanup stops the animation on unmount.
 *                 - IntersectionObserver (via useInView) fires once per AnimatedCounter.
 *                 - Pulse ring animation plays once per stat icon on scroll entry.
 *                 - Inline style border-color mutation on mouseEnter/Leave for hover highlight.
 * @invariants     - Stats and badges arrays are immutable; data does not change at runtime.
 *                 - Each AnimatedCounter animates exactly once (useInView once: true).
 * @knownFaults    - None at this time.
 */

import { motion, useInView, animate } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ShieldCheck, Lock, Eye, Award } from "lucide-react";

/* ============================================================================
   AnimatedCounter Sub-Component
   A number that tweens from 0 to a target value when it enters the viewport.
   Uses Framer Motion's imperative `animate()` API with easeOut easing. Supports
   configurable decimal places, suffix strings, and animation duration.
   ============================================================================ */

/**
 * AnimatedCounter - Displays a numeric value that animates from 0 to the target
 * when the element scrolls into view.
 * @param {Object}  props
 * @param {number}  props.target   - The final numeric value to animate towards.
 * @param {string}  [props.suffix] - Optional string appended after the number (e.g., "%", "+").
 * @param {number}  [props.decimals] - Number of decimal places to display (default 0).
 * @param {number}  [props.duration] - Animation duration in seconds (default 2).
 * @returns {JSX.Element} A <span> containing the animated number with suffix.
 */
function AnimatedCounter({ target, suffix = "", decimals = 0, duration = 2 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate(value) {
        setDisplay(decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString());
      },
    });
    return () => controls.stop();
  }, [isInView, target, duration, decimals]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ============================================================================
   Stats & Badges Data
   Static arrays defining the four key metrics and five trust badge labels.
   Each stat maps a numeric value, formatting options, display labels, and an icon.
   ============================================================================ */

const stats = [
  { value: 96.6, suffix: "%", decimals: 1, label: "Detection Rate", sublabel: "Accuracy on test data", icon: ShieldCheck },
  { value: 36000, suffix: "+", decimals: 0, label: "Training Samples", sublabel: "Emails analyzed to learn", icon: Eye },
  { value: 64, suffix: "", decimals: 0, label: "Features Analyzed", sublabel: "Per email inspection", icon: Lock },
  { value: 100, suffix: "%", decimals: 0, label: "Privacy Score", sublabel: "Zero data ever sent", icon: Award },
];

const badges = ["Local ML Only", "No Data Collection", "Open Source", "Manifest V3", "BYOK Encryption"];

/* ============================================================================
   StatsSection Main Component
   Composes the stats grid and trust badges row. The stats grid uses a 2-col
   base layout expanding to 4-col on lg+ screens. Each stat card features:
     - A Lucide icon with a one-shot expanding pulse ring animation
     - An AnimatedCounter with gradient text for the numeric value
     - Label and sublabel text
   ============================================================================ */

/**
 * StatsSection - Renders the statistics/metrics section of the landing page.
 * Displays four animated stat cards with count-up numbers and a row of
 * trust badge pills below.
 * @returns {JSX.Element} A <section> element containing the stats grid and badges.
 */
export default function StatsSection() {
  return (
    <section style={{ position: "relative", paddingTop: "5rem", paddingBottom: "5rem", backgroundColor: "#0a0a0f", zIndex: 2 }}>
      {/* Background gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #0a0a0f, #0d1117, #0a0a0f)" }} />

      <div className="container-main" style={{ position: "relative" }}>
        {/* ---- Stats Grid: 2-col mobile / 4-col desktop ---- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem", marginBottom: "3rem" }} className="lg:!grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              style={{ textAlign: "center" }}
            >
              <div style={{ padding: "1.5rem", borderRadius: "1rem", border: "1px solid rgba(51,65,85,0.3)", background: "rgba(26,26,46,0.4)", transition: "border-color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(51,65,85,0.3)"; }}
              >
                {/* Stat icon with expanding pulse ring animation */}
                <div style={{ position: "relative", width: 28, height: 28, margin: "0 auto 1rem" }}>
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0.6 }}
                    whileInView={{ scale: [0.6, 2.2], opacity: [0.6, 0] }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 1.2, delay: 0.3 + i * 0.15, ease: "easeOut" }}
                    style={{
                      position: "absolute", inset: -4, borderRadius: "50%",
                      border: "2px solid rgba(20,184,166,0.4)",
                      pointerEvents: "none",
                    }}
                  />
                  <stat.icon size={28} style={{ color: "#2dd4bf", position: "relative" }} />
                </div>
                {/* Animated count-up value with gradient text */}
                <div style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, backgroundImage: "linear-gradient(to right, #2dd4bf, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "0.5rem" }}>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
                </div>
                {/* Stat label and sublabel */}
                <div style={{ color: "white", fontWeight: 600, marginBottom: "0.25rem" }}>{stat.label}</div>
                <div style={{ fontSize: "0.875rem", color: "#64748b" }}>{stat.sublabel}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ---- Trust Badges: horizontally-wrapped pill row ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.75rem" }}
        >
          {badges.map((badge, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "9999px", background: "rgba(26,26,46,0.6)", border: "1px solid rgba(51,65,85,0.5)", fontSize: "0.875rem", color: "#94a3b8" }}>
              <ShieldCheck size={14} style={{ color: "#14b8a6" }} />
              {badge}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
