/**
 * @file FeaturesSection.jsx
 * @description Bento grid feature showcase section for the GoPhishFree landing page.
 *              Renders six product feature cards in a responsive grid layout, each with
 *              a mouse-tracking 3D tilt effect powered by Framer Motion spring physics.
 *              Features are defined in a static data array with associated Lucide icons.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions  - React 18+ runtime environment with Framer Motion and Lucide React installed.
 *                 - Parent component mounts this section within a page with global CSS providing
 *                   the `container-main` class and responsive grid utility overrides.
 * @postconditions - Renders an accessible <section> element with id="features" containing
 *                   six animated feature cards in a 1/2/3-column responsive grid.
 *                 - Each card responds to mouse movement with a subtle 3D tilt effect.
 * @errorConditions - If Framer Motion or Lucide React are not installed, the component will
 *                    fail to import and will not render.
 * @sideEffects    - Attaches mousemove/mouseleave event listeners to each TiltCard DOM element.
 *                 - Framer Motion IntersectionObserver triggers once-per-card entrance animations.
 *                 - Inline style border-color mutation on mouseEnter for hover highlight.
 * @invariants     - The features array is immutable; feature data does not change at runtime.
 *                 - Tilt rotation is clamped to +/-3 degrees on both axes.
 * @knownFaults    - None at this time.
 */

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Brain, Target, ShieldCheck, Sparkles, ScanSearch, Fish } from "lucide-react";

/* ============================================================================
   Feature Data
   Static array defining the six product features. Each entry maps a Lucide icon
   component, display text, and theme colors for the icon badge.
   ============================================================================ */

const features = [
  { icon: Brain, title: "Local ML Processing", description: "A Random Forest model with 64 features runs entirely in your browser. No server needed — your inbox, your machine, your control.", iconColor: "#2dd4bf", iconBg: "rgba(20,184,166,0.15)" },
  { icon: Target, title: "96.6% Detection Accuracy", description: "Trained on 36,000+ email samples with isotonic calibration. Catches phishing that basic filters miss.", iconColor: "#34d399", iconBg: "rgba(16,185,129,0.15)" },
  { icon: ShieldCheck, title: "Privacy First", description: "Zero email content ever leaves your device. All analysis happens locally — we never see your messages.", iconColor: "#a78bfa", iconBg: "rgba(139,92,246,0.15)" },
  { icon: Sparkles, title: "AI Enhancement (BYOK)", description: "Optionally get a cloud AI second opinion using your own API keys. Supports OpenAI, Anthropic, Gemini — only features are sent, never email text.", iconColor: "#fbbf24", iconBg: "rgba(245,158,11,0.15)" },
  { icon: ScanSearch, title: "Deep Scan", description: "Analyzes linked web pages for additional phishing signals. HTML content inspection adds another layer of protection.", iconColor: "#fb7185", iconBg: "rgba(244,63,94,0.15)" },
  { icon: Fish, title: "Fish Tank Dashboard", description: "Collect phishing-themed fish as you scan emails. A gamified dashboard tracks your stats and makes security fun.", iconColor: "#22d3ee", iconBg: "rgba(6,182,212,0.15)" },
];

/* ============================================================================
   TiltCard Sub-Component
   Individual feature card with mouse-tracking 3D tilt. Uses Framer Motion
   useMotionValue/useSpring to create smooth rotation that follows the cursor
   position relative to the card center. Spring physics (stiffness 200, damping 20)
   provide a natural feel on both movement and reset.
   ============================================================================ */

/**
 * TiltCard - A feature card with interactive 3D tilt on mouse movement.
 * @param {Object} props
 * @param {Object} props.feature - Feature data object containing icon, title, description, iconColor, iconBg.
 * @param {number} props.index  - Array index used to stagger the entrance animation delay.
 * @returns {JSX.Element} An animated motion.div card with 3D tilt behavior.
 */
function TiltCard({ feature, index }) {
  const cardRef = useRef(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 200, damping: 20 });

  /**
   * handleMouseMove - Calculates cursor offset from card center and maps it
   * to rotation values (+/-3 degrees). Inverts Y-axis for natural tilt feel.
   * @param {MouseEvent} e - The mouse move event from the card element.
   */
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    rotateX.set(((y - centerY) / centerY) * -3);
    rotateY.set(((x - centerX) / centerX) * 3);
  };

  /**
   * handleMouseLeave - Resets rotation to zero so the card smoothly springs
   * back to its resting position when the cursor exits.
   */
  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        borderRadius: "1rem",
        background: "rgba(26,26,46,0.6)",
        border: "1px solid rgba(51,65,85,0.5)",
        padding: "2rem",
        perspective: 800,
        rotateX: springX,
        rotateY: springY,
        transformStyle: "preserve-3d",
        transition: "border-color 0.3s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.3)"; }}
    >
      {/* Feature icon badge */}
      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "3rem", height: "3rem", borderRadius: "0.75rem", background: feature.iconBg, marginBottom: "1.25rem" }}>
        <feature.icon size={24} style={{ color: feature.iconColor }} />
      </div>
      {/* Feature title */}
      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "white", marginBottom: "0.75rem" }}>
        {feature.title}
      </h3>
      {/* Feature description */}
      <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
        {feature.description}
      </p>
    </motion.div>
  );
}

/* ============================================================================
   FeaturesSection Main Component
   Top-level exported section that composes the section header (badge, heading,
   subtitle) and the responsive bento grid of TiltCard components. The grid uses
   inline 1-column base with Tailwind utility class overrides for 2-col (md) and
   3-col (lg) breakpoints.
   ============================================================================ */

/**
 * FeaturesSection - Renders the "Features" section of the landing page.
 * Displays a centered header with gradient text and a responsive grid of six
 * interactive TiltCard components showcasing GoPhishFree product features.
 * @returns {JSX.Element} A <section> element with id="features".
 */
export default function FeaturesSection() {
  return (
    <section id="features" style={{ position: "relative", paddingTop: "5rem", paddingBottom: "5rem", backgroundColor: "#0a0a0f", zIndex: 2 }}>
      <div className="container-main">
        {/* ---- Section Header: badge pill, gradient heading, and subtitle ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "4rem" }}
        >
          <span style={{ display: "inline-block", padding: "0.375rem 1rem", borderRadius: "9999px", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", color: "#2dd4bf", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1rem" }}>
            Features
          </span>
          <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 700, marginBottom: "1rem" }}>
            Everything You Need to{" "}
            <span style={{ backgroundImage: "linear-gradient(to right, #2dd4bf, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Stay Safe
            </span>
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.125rem", maxWidth: "40rem", marginLeft: "auto", marginRight: "auto" }}>
            GoPhishFree combines cutting-edge machine learning with privacy-first design to keep your inbox protected.
          </p>
        </motion.div>

        {/* ---- Feature Bento Grid: 1-col mobile / 2-col tablet / 3-col desktop ---- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "1.5rem" }} className="md:!grid-cols-2 lg:!grid-cols-3">
          {features.map((feature, i) => (
            <TiltCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
