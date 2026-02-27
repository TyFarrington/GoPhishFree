/**
 * @file SwimmingFish.jsx
 * @description Complete animated fish background system for the GoPhishFree marketing
 *              website. Provides four distinct SVG fish species (FriendlyFish, SuspiciousFish,
 *              PufferFish, SharkFish) that swim along predefined waypoint paths across the
 *              full viewport using Framer Motion keyframe animations. CSS keyframe animations
 *              (tailFlutter, finWave, eyeBlink) are injected into the document head once on
 *              module load. The primary export, PageFishBackground, renders a fixed-position
 *              overlay containing 10 fish instances with varying species, sizes, opacities,
 *              durations, and paths. Legacy exports HeroFishBackground and CTAFishBackground
 *              return null for backward compatibility (fish rendering consolidated at page level).
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions  - React 18+ runtime available
 *                 - framer-motion package installed
 *                 - Browser environment with document.head available for CSS injection
 * @postconditions - Three CSS @keyframes (tailFlutter, finWave, eyeBlink) are injected into
 *                   the document head exactly once (idempotent via element ID check)
 *                 - PageFishBackground renders a position:fixed viewport overlay with animated fish
 * @errorConditions - SSR: CSS injection is guarded by `typeof document !== "undefined"` to
 *                   prevent server-side errors
 * @sideEffects    - Injects a <style> element into document.head on first module load
 *                 - Creates Framer Motion animation loops that run indefinitely
 *                 - Renders a position:fixed element covering the entire viewport
 * @invariants     - Fish always face the direction they are swimming (scaleX flip)
 *                 - Body rotation is clamped to +/-12 degrees to prevent steep dive angles
 *                 - All swim paths form closed loops (last waypoint connects back to first)
 *                 - Fish SVG components are stateless and purely presentational
 * @knownFaults    - PufferFish radial gradient ID uses Math.random(), which may cause
 *                   hydration mismatches in SSR environments (not applicable to current SPA)
 */

import { motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
   SECTION 1: CSS Keyframe Animation Injection
   Injects tail flutter, fin wave, and eye blink keyframes
   into document.head. Guarded for SSR and idempotent via
   a unique style element ID.
   ═══════════════════════════════════════════════════════════ */

const styleId = "swimming-fish-styles";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes tailFlutter {
      0%   { transform: rotate(-12deg) scaleX(0.92); }
      100% { transform: rotate(12deg) scaleX(1.08); }
    }
    @keyframes finWave {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(18deg); }
    }
    @keyframes eyeBlink {
      0%, 90%, 100% { transform: scaleY(0); }
      93%, 97%      { transform: scaleY(1); }
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════
   SECTION 2: SVG Fish Components
   Four distinct fish species rendered as inline SVGs.
   Originally ported from popup.js (Chrome extension).
   All fish face RIGHT by default; horizontal flipping is
   handled by the animation wrapper via scaleX.
   ═══════════════════════════════════════════════════════════ */

/**
 * Friendly blue fish with a rounded body, dorsal fin, ventral fin,
 * animated tail flutter, and blinking eye overlay.
 *
 * @param {Object} props
 * @param {number} props.size - Width in pixels; height is proportionally scaled (30/48 ratio)
 * @returns {JSX.Element} SVG element
 */
function FriendlyFish({ size }) {
  const w = size;
  const h = size * (30 / 48);
  return (
    <svg width={w} height={h} viewBox="0 0 48 30">
      <g style={{ transformBox: "fill-box", transformOrigin: "100% 50%", animation: "tailFlutter 0.35s ease-in-out infinite alternate" }}>
        <polygon points="3,15 0,6 10,12" fill="#0277bd" />
        <polygon points="3,15 0,24 10,18" fill="#0277bd" />
      </g>
      <ellipse cx="24" cy="15" rx="16" ry="10" fill="#29b6f6" />
      <ellipse cx="25" cy="18" rx="12" ry="6" fill="#e1f5fe" opacity="0.3" />
      <path d="M17,6 Q23,0 29,6" fill="#0288d1" />
      <g style={{ transformBox: "fill-box", transformOrigin: "80% 0%", animation: "finWave 0.6s ease-in-out infinite alternate" }}>
        <path d="M20,20 L14,27 L26,23" fill="#0288d1" opacity="0.7" />
      </g>
      <circle cx="33" cy="12" r="3.5" fill="white" />
      <circle cx="34.2" cy="12" r="1.8" fill="#1a1a2e" />
      <circle cx="34.8" cy="11.2" r="0.7" fill="white" />
      <rect style={{ transformBox: "fill-box", transformOrigin: "center center", animation: "eyeBlink 4s ease-in-out infinite" }} x="29" y="8.5" width="8" height="7" rx="4" fill="#29b6f6" />
      <path d="M39,16 Q41,18 39,19.5" fill="none" stroke="#01579b" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Orange-striped suspicious fish with vertical stripe markings, dorsal and
 * ventral fins, animated tail flutter, and blinking eye overlay.
 *
 * @param {Object} props
 * @param {number} props.size - Width in pixels; height is proportionally scaled (40/46 ratio)
 * @returns {JSX.Element} SVG element
 */
function SuspiciousFish({ size }) {
  const w = size;
  const h = size * (40 / 46);
  return (
    <svg width={w} height={h} viewBox="0 0 46 40">
      <g style={{ transformBox: "fill-box", transformOrigin: "100% 50%", animation: "tailFlutter 0.3s ease-in-out infinite alternate" }}>
        <polygon points="5,20 0,13 9,17" fill="#e65100" />
        <polygon points="5,20 0,27 9,23" fill="#e65100" />
      </g>
      <ellipse cx="23" cy="20" rx="14" ry="11" fill="#ffb74d" />
      <ellipse cx="24" cy="24" rx="10" ry="6" fill="#fff3e0" opacity="0.3" />
      <path d="M15,10 Q20,0 29,10" fill="#f57c00" />
      <path d="M15,30 Q20,40 29,30" fill="#f57c00" />
      <line x1="20" y1="10" x2="20" y2="30" stroke="#e65100" strokeWidth="1" opacity="0.25" />
      <line x1="26" y1="10" x2="26" y2="30" stroke="#e65100" strokeWidth="1" opacity="0.25" />
      <g style={{ transformBox: "fill-box", transformOrigin: "80% 0%", animation: "finWave 0.6s ease-in-out infinite alternate" }}>
        <path d="M19,25 L13,33 L25,28" fill="#f57c00" opacity="0.7" />
      </g>
      <circle cx="31" cy="17" r="3.5" fill="white" />
      <circle cx="32.2" cy="17" r="1.8" fill="#1a1a2e" />
      <circle cx="32.8" cy="16.2" r="0.7" fill="white" />
      <rect style={{ transformBox: "fill-box", transformOrigin: "center center", animation: "eyeBlink 4s ease-in-out infinite" }} x="27" y="13.5" width="8" height="7" rx="4" fill="#ffb74d" />
      <path d="M36,21 Q38,23 36,24.5" fill="none" stroke="#bf360c" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Gold/yellow puffer fish with a round body, spotted pattern, radial gradient
 * fill, cheek blush marks, animated tail flutter, and blinking eye overlay.
 * Uses a unique radial gradient ID per instance to avoid SVG ID collisions.
 *
 * @param {Object} props
 * @param {number} props.size - Width in pixels; height is proportionally scaled (44/48 ratio)
 * @returns {JSX.Element} SVG element
 */
function PufferFish({ size }) {
  const w = size;
  const h = size * (44 / 48);
  const gradId = `pufferGrad-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={w} height={h} viewBox="0 0 48 44">
      <defs>
        <radialGradient id={gradId} cx="55%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f0d850" />
          <stop offset="60%" stopColor="#d4a830" />
          <stop offset="100%" stopColor="#a08028" />
        </radialGradient>
      </defs>
      <g style={{ transformBox: "fill-box", transformOrigin: "100% 50%", animation: "tailFlutter 0.5s ease-in-out infinite alternate" }}>
        <path d="M7,22 L2,16 Q4,22 2,28 Z" fill="#a08040" />
        <path d="M5,22 L3,18 Q4,22 3,26 Z" fill="#b89848" opacity="0.6" />
      </g>
      <ellipse cx="26" cy="22" rx="15" ry="14" fill="#e8c840" />
      <ellipse cx="26" cy="22" rx="15" ry="14" fill={`url(#${gradId})`} />
      <ellipse cx="27" cy="27" rx="11" ry="8" fill="#fef9e0" opacity="0.55" />
      <ellipse cx="25" cy="14" rx="12" ry="5" fill="#b08830" opacity="0.25" />
      <circle cx="19" cy="15" r="2" fill="#8B6914" opacity="0.45" />
      <circle cx="28" cy="14" r="1.8" fill="#8B6914" opacity="0.4" />
      <circle cx="16" cy="22" r="1.5" fill="#8B6914" opacity="0.35" />
      <circle cx="22" cy="27" r="1.7" fill="#8B6914" opacity="0.3" />
      <circle cx="30" cy="24" r="1.4" fill="#8B6914" opacity="0.35" />
      <circle cx="33" cy="17" r="1.3" fill="#8B6914" opacity="0.3" />
      <path d="M22,9 Q25,5 28,9" fill="#c09830" opacity="0.7" />
      <g style={{ transformBox: "fill-box", transformOrigin: "80% 0%", animation: "finWave 0.6s ease-in-out infinite alternate" }}>
        <path d="M21,28 L14,36 L27,32" fill="#c8a030" opacity="0.6" />
      </g>
      <circle cx="34" cy="18" r="5" fill="white" />
      <circle cx="34" cy="18" r="4.8" fill="white" stroke="#b0942a" strokeWidth="0.5" />
      <circle cx="35.5" cy="18" r="2.8" fill="#2a1a0a" />
      <circle cx="36.5" cy="17" r="1.1" fill="white" />
      <circle cx="34" cy="19.5" r="0.5" fill="white" opacity="0.5" />
      <rect style={{ transformBox: "fill-box", transformOrigin: "center center", animation: "eyeBlink 4s ease-in-out infinite" }} x="28.5" y="13" width="11" height="10" rx="5.5" fill="#d4a830" />
      <ellipse cx="41" cy="23" rx="2.8" ry="2" fill="#e07858" />
      <ellipse cx="41" cy="23" rx="2.2" ry="1.4" fill="#f0a088" opacity="0.6" />
      <path d="M38.5,23 Q41,21.5 43.5,23" fill="none" stroke="#c06040" strokeWidth="0.6" />
      <path d="M38.5,23 Q41,24.8 43.5,23" fill="none" stroke="#c06040" strokeWidth="0.5" />
    </svg>
  );
}

/**
 * Steel-blue shark with an elongated body, gill slits, dorsal/pectoral/pelvic
 * fins, toothy grin, animated tail flutter, and blinking eye overlay. Largest
 * fish in the system with a wide 90x48 viewBox.
 *
 * @param {Object} props
 * @param {number} props.size - Width in pixels; height is proportionally scaled (48/90 ratio)
 * @returns {JSX.Element} SVG element
 */
function SharkFish({ size }) {
  const w = size;
  const h = size * (48 / 90);
  return (
    <svg width={w} height={h} viewBox="0 0 90 48">
      <g style={{ transformBox: "fill-box", transformOrigin: "100% 50%", animation: "tailFlutter 0.22s ease-in-out infinite alternate" }}>
        <path d="M8,22 L6,18 L0,2 L5,12 L8,18 L10,20 Z" fill="#6e96ae" stroke="#5a8498" strokeWidth="0.6" />
        <path d="M3,6 Q6,14 9,19" fill="none" stroke="#8aaec4" strokeWidth="1.2" opacity="0.35" />
        <path d="M8,24 L6,28 L2,40 L6,34 L8,28 L10,26 Z" fill="#7a9ab0" stroke="#5a8498" strokeWidth="0.6" />
        <path d="M4,36 Q6,30 9,26" fill="none" stroke="#8aaec4" strokeWidth="1" opacity="0.35" />
        <path d="M8,20 Q5,23 8,26" fill="#8aaec4" />
      </g>
      <path d="M8,23 Q8,21.5 10,20.5 L14,19 Q18,17 24,14 Q32,9 44,6 Q56,3 66,5 Q76,8 82,14 Q87,19 87,23 Q87,27 82,32 Q76,38 66,41 Q56,43 44,40 Q32,37 24,32 Q18,29 14,27 L10,25.5 Q8,24.5 8,23 Z" fill="#8aaec4" />
      <path d="M8,23 Q8,21.5 10,20.5 L14,19 Q18,17 24,14 Q32,9 44,6 Q56,3 66,5 Q76,8 82,14 Q87,19 87,23 Q80,19 70,14 Q56,9 42,11 Q28,14 18,18 Q12,20 8,23 Z" fill="#5a8498" opacity="0.6" />
      <path d="M16,26 Q20,34 30,37 Q40,40 54,41 Q66,40 74,36 Q82,32 85,26 Q80,30 70,34 Q56,38 40,37 Q26,35 18,30 Z" fill="#e4eef4" opacity="0.85" />
      <path d="M50,5 L44,-7 Q52,-3 62,5" fill="#5a8498" />
      <path d="M21,17 L17,10 L27,17" fill="#5a8498" opacity="0.65" />
      <g style={{ transformBox: "fill-box", transformOrigin: "80% 0%", animation: "finWave 0.6s ease-in-out infinite alternate" }}>
        <path d="M58,34 Q46,44 38,48 Q50,44 62,38 Z" fill="#5a8498" opacity="0.85" />
      </g>
      <path d="M35,37 L30,44 L40,38" fill="#6e96ae" opacity="0.55" />
      <path d="M23,30 L19,37 L28,31" fill="#6e96ae" opacity="0.55" />
      <path d="M68,14 Q69,19 68,24" fill="none" stroke="#4a7488" strokeWidth="0.8" opacity="0.5" />
      <path d="M65,15 Q66,19.5 65,24.5" fill="none" stroke="#4a7488" strokeWidth="0.8" opacity="0.45" />
      <path d="M62,15.5 Q63,20 62,25" fill="none" stroke="#4a7488" strokeWidth="0.7" opacity="0.4" />
      <circle cx="76" cy="18" r="3" fill="white" />
      <circle cx="77" cy="18" r="1.7" fill="#101820" />
      <circle cx="77.5" cy="17.2" r="0.6" fill="white" />
      <rect style={{ transformBox: "fill-box", transformOrigin: "center center", animation: "eyeBlink 4s ease-in-out infinite" }} x="72.5" y="15" width="7" height="6" rx="3" fill="#8aaec4" />
      <path d="M72,27 Q78,32 86,27" fill="none" stroke="#3a5a6e" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M74,27.2 L75,29.8 L76,27.2" fill="white" stroke="#c8d4d8" strokeWidth="0.3" />
      <path d="M77,27.8 L78,30.2 L79,27.8" fill="white" stroke="#c8d4d8" strokeWidth="0.3" />
      <path d="M80,27.6 L81,29.8 L82,27.6" fill="white" stroke="#c8d4d8" strokeWidth="0.3" />
      <path d="M83,27 L84,29 L85,27" fill="white" stroke="#c8d4d8" strokeWidth="0.3" />
    </svg>
  );
}

/** @type {Object.<string, Function>} Lookup table mapping fish type keys to SVG components */
const FishComponents = {
  friendly: FriendlyFish,
  suspicious: SuspiciousFish,
  phishy: PufferFish,
  shark: SharkFish,
};

/* ═══════════════════════════════════════════════════════════
   SECTION 3: Swim Path Definitions
   Eight predefined waypoint arrays (A–H) defining gentle,
   mostly-horizontal drift paths using vw/vh coordinates.
   Y deltas are kept small (±4–6vh) to avoid steep diagonal
   angles. Each path forms a closed loop for infinite repeat.
   ═══════════════════════════════════════════════════════════ */

const swimPaths = [
  // Path A: Gentle drift across upper area
  [
    { x: -8, y: 14 }, { x: 10, y: 12 }, { x: 25, y: 16 },
    { x: 40, y: 13 }, { x: 55, y: 17 }, { x: 70, y: 14 },
    { x: 85, y: 18 }, { x: 100, y: 15 },
    { x: 85, y: 12 }, { x: 70, y: 16 }, { x: 55, y: 13 },
    { x: 40, y: 17 }, { x: 25, y: 14 }, { x: 10, y: 18 },
  ],
  // Path B: Lazy mid-screen meander
  [
    { x: 108, y: 42 }, { x: 92, y: 44 }, { x: 78, y: 40 },
    { x: 62, y: 45 }, { x: 48, y: 41 }, { x: 34, y: 46 },
    { x: 18, y: 43 }, { x: -5, y: 47 },
    { x: 18, y: 50 }, { x: 34, y: 46 }, { x: 48, y: 50 },
    { x: 62, y: 46 }, { x: 78, y: 50 }, { x: 92, y: 46 },
  ],
  // Path C: Low gentle sweep
  [
    { x: -6, y: 76 }, { x: 12, y: 74 }, { x: 28, y: 78 },
    { x: 44, y: 75 }, { x: 60, y: 79 }, { x: 76, y: 76 },
    { x: 92, y: 80 }, { x: 105, y: 77 },
    { x: 92, y: 74 }, { x: 76, y: 78 }, { x: 60, y: 75 },
    { x: 44, y: 79 }, { x: 28, y: 76 }, { x: 12, y: 80 },
  ],
  // Path D: Upper right gentle glide
  [
    { x: 106, y: 22 }, { x: 90, y: 20 }, { x: 74, y: 24 },
    { x: 58, y: 21 }, { x: 42, y: 25 }, { x: 26, y: 22 },
    { x: 10, y: 26 }, { x: -5, y: 23 },
    { x: 10, y: 20 }, { x: 26, y: 24 }, { x: 42, y: 21 },
    { x: 58, y: 25 }, { x: 74, y: 22 }, { x: 90, y: 26 },
  ],
  // Path E: Center band drift
  [
    { x: -5, y: 54 }, { x: 12, y: 52 }, { x: 28, y: 56 },
    { x: 44, y: 53 }, { x: 60, y: 57 }, { x: 76, y: 54 },
    { x: 92, y: 58 }, { x: 105, y: 55 },
    { x: 92, y: 52 }, { x: 76, y: 56 }, { x: 60, y: 53 },
    { x: 44, y: 57 }, { x: 28, y: 54 }, { x: 12, y: 58 },
  ],
  // Path F: High gentle arc
  [
    { x: 105, y: 8 }, { x: 90, y: 6 }, { x: 74, y: 10 },
    { x: 58, y: 7 }, { x: 42, y: 11 }, { x: 26, y: 8 },
    { x: 10, y: 12 }, { x: -5, y: 9 },
    { x: 10, y: 6 }, { x: 26, y: 10 }, { x: 42, y: 7 },
    { x: 58, y: 11 }, { x: 74, y: 8 }, { x: 90, y: 12 },
  ],
  // Path G: Lower-mid gentle weave
  [
    { x: 110, y: 65 }, { x: 94, y: 63 }, { x: 78, y: 67 },
    { x: 62, y: 64 }, { x: 46, y: 68 }, { x: 30, y: 65 },
    { x: 14, y: 69 }, { x: -5, y: 66 },
    { x: 14, y: 63 }, { x: 30, y: 67 }, { x: 46, y: 64 },
    { x: 62, y: 68 }, { x: 78, y: 65 }, { x: 94, y: 69 },
  ],
  // Path H: Very low lazy drift
  [
    { x: -8, y: 88 }, { x: 10, y: 86 }, { x: 28, y: 90 },
    { x: 46, y: 87 }, { x: 64, y: 91 }, { x: 82, y: 88 },
    { x: 100, y: 92 }, { x: 108, y: 89 },
    { x: 100, y: 86 }, { x: 82, y: 90 }, { x: 64, y: 87 },
    { x: 46, y: 91 }, { x: 28, y: 88 }, { x: 10, y: 92 },
  ],
];

/* ═══════════════════════════════════════════════════════════
   SECTION 4: Keyframe Builder
   Converts waypoint arrays into Framer Motion keyframe
   arrays for x, y, scaleX, rotate, and timing. Handles
   direction flipping at turnaround points with near-instant
   pre/post-turn keyframes (±0.5% of total duration).
   ═══════════════════════════════════════════════════════════ */

/**
 * Processes a waypoint path into parallel keyframe arrays suitable for
 * Framer Motion's `animate` prop. Automatically closes the loop by
 * appending the first waypoint. At each turnaround (direction reversal),
 * injects a pair of keyframes separated by 1% of total time to create
 * an instant horizontal flip without visible interpolation.
 *
 * @param {Array<{x: number, y: number}>} path - Array of waypoints in vw/vh units
 * @returns {{xKeys: string[], yKeys: string[], scaleXKeys: number[], rotateKeys: number[], timeKeys: number[]}}
 *          Parallel arrays for Framer Motion keyframe animation
 */
function buildKeyframes(path) {
  const xKeys = [];
  const yKeys = [];
  const scaleXKeys = [];
  const rotateKeys = [];
  const timeKeys = [];
  const pts = [...path, path[0]];
  const segments = pts.length - 1;

  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const prev = i > 0 ? pts[i - 1] : pts[pts.length - 2];
    const next = i < pts.length - 1 ? pts[i + 1] : pts[1];
    const goingRight = next.x > cur.x;
    const wasGoingRight = cur.x > prev.x;
    const t = i / segments;

    // Compute angle toward next point (degrees), clamped for subtlety
    const dx = next.x - cur.x;
    // Scale dy since vh and vw have different real-pixel sizes (~same on typical screens)
    const dy = next.y - cur.y;
    let angle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI);
    // Clamp rotation to ±12° so fish never look like they're diving steeply
    angle = Math.max(-12, Math.min(12, angle));
    // When going left, flip the rotation sign (since scaleX flips the fish)
    if (!goingRight) angle = -angle;

    if (i > 0 && i < pts.length - 1 && goingRight !== wasGoingRight) {
      // Pre-turn keyframe
      xKeys.push(`${cur.x}vw`);
      yKeys.push(`${cur.y}vh`);
      scaleXKeys.push(wasGoingRight ? 1 : -1);
      rotateKeys.push(0); // level out at turn
      timeKeys.push(Math.max(0, t - 0.005));

      // Post-turn keyframe
      xKeys.push(`${cur.x}vw`);
      yKeys.push(`${cur.y}vh`);
      scaleXKeys.push(goingRight ? 1 : -1);
      rotateKeys.push(0);
      timeKeys.push(Math.min(1, t + 0.005));
    } else {
      xKeys.push(`${cur.x}vw`);
      yKeys.push(`${cur.y}vh`);
      scaleXKeys.push(goingRight ? 1 : -1);
      rotateKeys.push(angle);
      timeKeys.push(t);
    }
  }

  return { xKeys, yKeys, scaleXKeys, rotateKeys, timeKeys };
}

/* ═══════════════════════════════════════════════════════════
   SECTION 5: SwimmingFishInstance Component
   Renders a single animated fish using Framer Motion.
   Outer div handles x/y translation; inner div handles
   scaleX (direction flip) and rotate (body tilt).
   ═══════════════════════════════════════════════════════════ */

/**
 * Renders and animates a single fish along a predefined swim path. Uses two
 * nested Framer Motion divs: the outer handles positional (x, y) movement,
 * and the inner handles directional flip (scaleX) and body tilt (rotate).
 * Both share the same duration, delay, and timing array for synchronization.
 *
 * @param {Object}  props
 * @param {string}  props.fishType  - Key into FishComponents ('friendly'|'suspicious'|'phishy'|'shark')
 * @param {number}  props.pathIndex - Index into swimPaths array (wraps via modulo)
 * @param {number}  props.size      - Fish width in pixels passed to the SVG component
 * @param {number}  props.opacity   - CSS opacity for the fish (0–1)
 * @param {number}  props.duration  - Total loop duration in seconds
 * @param {number}  props.delay     - Initial delay before animation starts in seconds
 * @returns {JSX.Element} An absolutely-positioned animated fish element
 */
function SwimmingFishInstance({ fishType, pathIndex, size, opacity, duration, delay }) {
  const FishComp = FishComponents[fishType] || FishComponents.friendly;
  const path = swimPaths[pathIndex % swimPaths.length];
  const { xKeys, yKeys, scaleXKeys, rotateKeys, timeKeys } = buildKeyframes(path);

  return (
    <motion.div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        opacity,
        pointerEvents: "none",
        zIndex: 1,
        filter: "drop-shadow(0 0 4px rgba(0,0,0,0.15))",
      }}
      initial={{ x: xKeys[0], y: yKeys[0] }}
      animate={{ x: xKeys, y: yKeys }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
        times: timeKeys,
      }}
    >
      {/* Direction flip + body tilt wrapper */}
      <motion.div
        initial={{ scaleX: scaleXKeys[0], rotate: rotateKeys[0] }}
        animate={{ scaleX: scaleXKeys, rotate: rotateKeys }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: "linear",
          times: timeKeys,
        }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <FishComp size={size} />
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION 6: Page-Level Fish Configuration & Exported Components
   Configuration array for 10 fish instances spread across
   all 8 swim paths. PageFishBackground renders a fixed
   viewport overlay. Legacy exports return null.
   ═══════════════════════════════════════════════════════════ */

/**
 * @type {Array<{fishType: string, pathIndex: number, size: number, opacity: number, duration: number, delay: number}>}
 * Configuration for the 10 fish instances rendered by PageFishBackground.
 * Each entry specifies species, path assignment, visual size, opacity,
 * animation loop duration (55–80s for lazy drift), and stagger delay.
 */
const pageFish = [
  // Spread across all 8 paths — slow, lazy drift (55-80s per loop)
  { fishType: "friendly",   pathIndex: 0, size: 54, opacity: 0.14, duration: 65, delay: 0 },
  { fishType: "suspicious", pathIndex: 1, size: 46, opacity: 0.12, duration: 72, delay: 5 },
  { fishType: "phishy",     pathIndex: 2, size: 42, opacity: 0.11, duration: 58, delay: 12 },
  { fishType: "shark",      pathIndex: 3, size: 70, opacity: 0.10, duration: 80, delay: 8 },
  { fishType: "friendly",   pathIndex: 4, size: 38, opacity: 0.12, duration: 62, delay: 18 },
  { fishType: "suspicious", pathIndex: 5, size: 36, opacity: 0.10, duration: 70, delay: 3 },
  { fishType: "phishy",     pathIndex: 6, size: 40, opacity: 0.10, duration: 55, delay: 22 },
  { fishType: "friendly",   pathIndex: 7, size: 44, opacity: 0.11, duration: 68, delay: 14 },
  // A couple extras for gentle density
  { fishType: "shark",      pathIndex: 2, size: 60, opacity: 0.08, duration: 75, delay: 20 },
  { fishType: "suspicious", pathIndex: 7, size: 36, opacity: 0.09, duration: 60, delay: 28 },
];

/**
 * Renders a position:fixed, full-viewport overlay containing all page-level
 * swimming fish. The overlay has pointer-events:none so it never blocks user
 * interaction. Each fish instance animates independently on an infinite loop.
 *
 * @returns {JSX.Element} A fixed-position div covering the viewport with animated fish
 */
export function PageFishBackground() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {pageFish.map((fish, i) => (
        <SwimmingFishInstance key={`page-fish-${i}`} {...fish} />
      ))}
    </div>
  );
}

/**
 * Legacy no-op export retained for backward compatibility. Fish rendering was
 * consolidated into PageFishBackground; this component previously rendered
 * hero-section fish but now returns null.
 *
 * @returns {null}
 */
export function HeroFishBackground() { return null; }

/**
 * Legacy no-op export retained for backward compatibility. Fish rendering was
 * consolidated into PageFishBackground; this component previously rendered
 * CTA-section fish but now returns null.
 *
 * @returns {null}
 */
export function CTAFishBackground() { return null; }
