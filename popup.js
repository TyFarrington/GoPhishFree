// ═══════════════════════════════════════════════════════════════════
// GoPhishFree – Fish Tank Dashboard (popup.js)
//
// Controls the animated fish tank popup and dashboard:
//   • SVG fish generators (Friendly, Suspicious, Phishy Puffer, Shark)
//   • FishEntity class with JS-driven swimming + CSS micro-animations
//   • requestAnimationFrame loop for smooth movement
//   • Fish collection panel with counts and locked/unlocked states
//   • Recent catches list with clickable items
//   • Bubble, particle, and caustic light effects
//   • Enhanced Scanning toggle (Tier 2 DNS checks)
//
// Fish face RIGHT by default; scaleX(-1) flips them when swimming left.
// Tail flutter, fin wave, and eye blink are CSS-driven for efficiency.
// ═══════════════════════════════════════════════════════════════════

/* ═══════════════════════════════════════════════
   Fish Type Configuration
   ═══════════════════════════════════════════════ */

const FISH_TYPES = {
  friendly: {
    emoji: '🐟',
    name: 'Friendly Fish',
    description: 'A safe email companion',
    minRisk: 0,
    maxRisk: 49,
    rarity: 'common',
    speed: { min: 28, max: 48 },
    size: { w: 48, h: 30 }
  },
  suspicious: {
    emoji: '🐠',
    name: 'Suspicious Fish',
    description: 'Something seems fishy...',
    minRisk: 50,
    maxRisk: 75,
    rarity: 'uncommon',
    speed: { min: 22, max: 40 },
    size: { w: 46, h: 40 }
  },
  phishy: {
    emoji: '🐡',
    name: 'Phishy Puffer',
    description: 'Definitely a phishing attempt!',
    minRisk: 76,
    maxRisk: 89,
    rarity: 'rare',
    speed: { min: 16, max: 30 },
    size: { w: 48, h: 44 }
  },
  shark: {
    emoji: '🦈',
    name: 'Mega Phish Shark',
    description: 'Extremely dangerous phishing!',
    minRisk: 90,
    maxRisk: 100,
    rarity: 'legendary',
    speed: { min: 38, max: 58 },
    size: { w: 90, h: 48 }
  }
};

/* ═══════════════════════════════════════════════
   State
   ═══════════════════════════════════════════════ */

let fishEntities = [];
let animFrameId = null;
let lastFrameTime = 0;
let fishIdCounter = 0;
let spawnTimeouts = [];

/* ═══════════════════════════════════════════════
   SVG Fish Generators
   Each fish faces RIGHT. scaleX(-1) flips for left.
   CSS handles micro-animations (tail, fin, blink).
   ═══════════════════════════════════════════════ */

function createFriendlyFishSVG() {
  // Cute blue tropical fish
  return `<svg class="fish-svg" viewBox="0 0 48 30" xmlns="http://www.w3.org/2000/svg">
    <g class="fish-tail">
      <polygon points="3,15 0,6 10,12" fill="#0277bd"/>
      <polygon points="3,15 0,24 10,18" fill="#0277bd"/>
    </g>
    <ellipse cx="24" cy="15" rx="16" ry="10" fill="#29b6f6"/>
    <ellipse cx="25" cy="18" rx="12" ry="6" fill="#e1f5fe" opacity="0.3"/>
    <path d="M17,6 Q23,0 29,6" fill="#0288d1"/>
    <g class="fish-pectoral">
      <path d="M20,20 L14,27 L26,23" fill="#0288d1" opacity="0.7"/>
    </g>
    <circle cx="33" cy="12" r="3.5" fill="white"/>
    <circle cx="34.2" cy="12" r="1.8" fill="#1a1a2e"/>
    <circle cx="34.8" cy="11.2" r="0.7" fill="white"/>
    <rect class="fish-eyelid" x="29" y="8.5" width="8" height="7" rx="4" fill="#29b6f6"/>
    <path d="M39,16 Q41,18 39,19.5" fill="none" stroke="#01579b" stroke-width="0.7" stroke-linecap="round"/>
  </svg>`;
}

function createSuspiciousFishSVG() {
  // Tall orange angelfish with dorsal + anal fins and stripes
  return `<svg class="fish-svg" viewBox="0 0 46 40" xmlns="http://www.w3.org/2000/svg">
    <g class="fish-tail">
      <polygon points="5,20 0,13 9,17" fill="#e65100"/>
      <polygon points="5,20 0,27 9,23" fill="#e65100"/>
    </g>
    <ellipse cx="23" cy="20" rx="14" ry="11" fill="#ffb74d"/>
    <ellipse cx="24" cy="24" rx="10" ry="6" fill="#fff3e0" opacity="0.3"/>
    <path d="M15,10 Q20,0 29,10" fill="#f57c00"/>
    <path d="M15,30 Q20,40 29,30" fill="#f57c00"/>
    <line x1="20" y1="10" x2="20" y2="30" stroke="#e65100" stroke-width="1" opacity="0.25"/>
    <line x1="26" y1="10" x2="26" y2="30" stroke="#e65100" stroke-width="1" opacity="0.25"/>
    <g class="fish-pectoral">
      <path d="M19,25 L13,33 L25,28" fill="#f57c00" opacity="0.7"/>
    </g>
    <circle cx="31" cy="17" r="3.5" fill="white"/>
    <circle cx="32.2" cy="17" r="1.8" fill="#1a1a2e"/>
    <circle cx="32.8" cy="16.2" r="0.7" fill="white"/>
    <rect class="fish-eyelid" x="27" y="13.5" width="8" height="7" rx="4" fill="#ffb74d"/>
    <path d="M36,21 Q38,23 36,24.5" fill="none" stroke="#bf360c" stroke-width="0.7" stroke-linecap="round"/>
  </svg>`;
}

function createPhishyPufferSVG() {
  // Detailed pufferfish — yellow-brown with spots, lips, brownish spines
  return `<svg class="fish-svg" viewBox="0 0 48 44" xmlns="http://www.w3.org/2000/svg">
    <!-- Tail -->
    <g class="fish-tail">
      <path d="M7,22 L2,16 Q4,22 2,28 Z" fill="#a08040"/>
      <path d="M5,22 L3,18 Q4,22 3,26 Z" fill="#b89848" opacity="0.6"/>
    </g>
    <g class="puffer-body-group">
      <!-- Body — golden-yellow top, cream belly -->
      <ellipse cx="26" cy="22" rx="15" ry="14" fill="#e8c840"/>
      <ellipse cx="26" cy="22" rx="15" ry="14" fill="url(#pufferGrad)" opacity="1"/>
      <!-- Belly -->
      <ellipse cx="27" cy="27" rx="11" ry="8" fill="#fef9e0" opacity="0.55"/>
      <!-- Back shading -->
      <ellipse cx="25" cy="14" rx="12" ry="5" fill="#b08830" opacity="0.25"/>
      <!-- Brown spots -->
      <circle cx="19" cy="15" r="2" fill="#8B6914" opacity="0.45"/>
      <circle cx="28" cy="14" r="1.8" fill="#8B6914" opacity="0.4"/>
      <circle cx="16" cy="22" r="1.5" fill="#8B6914" opacity="0.35"/>
      <circle cx="22" cy="27" r="1.7" fill="#8B6914" opacity="0.3"/>
      <circle cx="30" cy="24" r="1.4" fill="#8B6914" opacity="0.35"/>
      <circle cx="33" cy="17" r="1.3" fill="#8B6914" opacity="0.3"/>
      <circle cx="21" cy="18" r="1.1" fill="#8B6914" opacity="0.25"/>
      <circle cx="28" cy="30" r="1.2" fill="#8B6914" opacity="0.25"/>
      <!-- Brownish spines (hidden until puffed) -->
      <g class="puffer-spines">
        <line x1="26" y1="8" x2="26" y2="2" stroke="#7a5a20" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="19" y1="10" x2="15" y2="4" stroke="#7a5a20" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="33" y1="10" x2="37" y2="4" stroke="#7a5a20" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="14" y1="14" x2="9" y2="10" stroke="#7a5a20" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="38" y1="14" x2="43" y2="10" stroke="#7a5a20" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="40" y1="20" x2="45" y2="19" stroke="#7a5a20" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="40" y1="26" x2="45" y2="28" stroke="#7a5a20" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="38" y1="31" x2="43" y2="34" stroke="#7a5a20" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="26" y1="36" x2="26" y2="42" stroke="#7a5a20" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="19" y1="34" x2="15" y2="40" stroke="#7a5a20" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="33" y1="34" x2="37" y2="40" stroke="#7a5a20" stroke-width="1.6" stroke-linecap="round"/>
        <line x1="12" y1="20" x2="7" y2="19" stroke="#7a5a20" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="12" y1="26" x2="7" y2="28" stroke="#7a5a20" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="14" y1="31" x2="9" y2="34" stroke="#7a5a20" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <!-- Gradient definition -->
      <defs>
        <radialGradient id="pufferGrad" cx="55%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#f0d850"/>
          <stop offset="60%" stop-color="#d4a830"/>
          <stop offset="100%" stop-color="#a08028"/>
        </radialGradient>
      </defs>
    </g>
    <!-- Dorsal fin (small) -->
    <path d="M22,9 Q25,5 28,9" fill="#c09830" opacity="0.7"/>
    <!-- Pectoral fin -->
    <g class="fish-pectoral">
      <path d="M21,28 L14,36 L27,32" fill="#c8a030" opacity="0.6"/>
    </g>
    <!-- Eye — big and expressive -->
    <circle cx="34" cy="18" r="5" fill="white"/>
    <circle cx="34" cy="18" r="4.8" fill="white" stroke="#b0942a" stroke-width="0.5"/>
    <circle cx="35.5" cy="18" r="2.8" fill="#2a1a0a"/>
    <circle cx="36.5" cy="17" r="1.1" fill="white"/>
    <circle cx="34" cy="19.5" r="0.5" fill="white" opacity="0.5"/>
    <rect class="fish-eyelid" x="28.5" y="13" width="11" height="10" rx="5.5" fill="#d4a830"/>
    <!-- Brow ridge -->
    <path d="M29,14 Q34,11 39,14" fill="none" stroke="#8a6a18" stroke-width="0.8" opacity="0.5"/>
    <!-- Lips — pouty puffer lips -->
    <ellipse cx="41" cy="23" rx="2.8" ry="2" fill="#e07858"/>
    <ellipse cx="41" cy="23" rx="2.2" ry="1.4" fill="#f0a088" opacity="0.6"/>
    <path d="M38.5,23 Q41,21.5 43.5,23" fill="none" stroke="#c06040" stroke-width="0.6"/>
    <path d="M38.5,23 Q41,24.8 43.5,23" fill="none" stroke="#c06040" stroke-width="0.5"/>
  </svg>`;
}

function createSharkSVG() {
  // Shark — fat head, razor taper to pencil-thin peduncle, BIG bold tail
  return `<svg class="fish-svg" viewBox="0 0 90 48" xmlns="http://www.w3.org/2000/svg">

    <!-- ══ TAIL — thick, bold, impossible to miss ══ -->
    <g class="fish-tail">
      <!-- Upper lobe — big, sweeping, thickened -->
      <path d="M8,22 L6,18 L0,2 L5,12 L8,18 L10,20 Z" fill="#6e96ae" stroke="#5a8498" stroke-width="0.6"/>
      <path d="M3,6 Q6,14 9,19" fill="none" stroke="#8aaec4" stroke-width="1.2" opacity="0.35"/>
      <!-- Lower lobe — thickened -->
      <path d="M8,24 L6,28 L2,40 L6,34 L8,28 L10,26 Z" fill="#7a9ab0" stroke="#5a8498" stroke-width="0.6"/>
      <path d="M4,36 Q6,30 9,26" fill="none" stroke="#8aaec4" stroke-width="1" opacity="0.35"/>
      <!-- Center fill connecting the lobes at peduncle -->
      <path d="M8,20 Q5,23 8,26" fill="#8aaec4"/>
    </g>

    <!-- ══ BODY — fat head → extreme razor taper → pencil-thin peduncle ══ -->
    <path d="M8,23
             Q8,21.5 10,20.5
             L14,19
             Q18,17 24,14
             Q32,9 44,6
             Q56,3 66,5
             Q76,8 82,14
             Q87,19 87,23
             Q87,27 82,32
             Q76,38 66,41
             Q56,43 44,40
             Q32,37 24,32
             Q18,29 14,27
             L10,25.5
             Q8,24.5 8,23 Z" fill="#8aaec4"/>

    <!-- Darker back -->
    <path d="M8,23
             Q8,21.5 10,20.5
             L14,19
             Q18,17 24,14
             Q32,9 44,6
             Q56,3 66,5
             Q76,8 82,14
             Q87,19 87,23
             Q80,19 70,14
             Q56,9 42,11
             Q28,14 18,18
             Q12,20 8,23 Z" fill="#5a8498" opacity="0.6"/>

    <!-- White belly -->
    <path d="M16,26
             Q20,34 30,37
             Q40,40 54,41
             Q66,40 74,36
             Q82,32 85,26
             Q80,30 70,34
             Q56,38 40,37
             Q26,35 18,30 Z" fill="#e4eef4" opacity="0.85"/>

    <!-- Belly line -->
    <path d="M14,24 Q30,30 50,30 Q68,28 84,23" fill="none" stroke="#b0c4d0" stroke-width="0.6" opacity="0.45"/>

    <!-- ══ DORSAL FIN — tall, iconic, thicker ══ -->
    <path d="M50,5 L44,-7 Q52,-3 62,5" fill="#5a8498"/>
    <path d="M51,5 L46,-5 Q53,-2 61,5" fill="#7a9ab0" opacity="0.5"/>
    <path d="M46,-5 Q52,0 59,5" fill="none" stroke="#4a7488" stroke-width="0.5" opacity="0.3"/>

    <!-- Small second dorsal — beefed up -->
    <path d="M21,17 L17,10 L27,17" fill="#5a8498" opacity="0.65"/>
    <path d="M22,17 L19,12 L26,17" fill="#7a9ab0" opacity="0.35"/>

    <!-- ══ PECTORAL FIN — bigger, wider ══ -->
    <g class="fish-pectoral">
      <path d="M58,34 Q46,44 38,48 Q50,44 62,38 Z" fill="#5a8498" opacity="0.85"/>
      <path d="M57,35 Q48,42 42,46" fill="none" stroke="#4a7488" stroke-width="0.5" opacity="0.3"/>
    </g>
    <!-- Far-side pectoral hint — thicker -->
    <path d="M60,9 Q50,0 48,-2 Q54,2 62,8 Z" fill="#4a7488" opacity="0.25"/>

    <!-- Pelvic fin — larger -->
    <path d="M35,37 L30,44 L40,38" fill="#6e96ae" opacity="0.55"/>
    <path d="M36,37 L32,42 L39,38" fill="#7a9ab0" opacity="0.3"/>

    <!-- Anal fin — larger -->
    <path d="M23,30 L19,37 L28,31" fill="#6e96ae" opacity="0.55"/>
    <path d="M24,30 L21,35 L27,31" fill="#7a9ab0" opacity="0.3"/>

    <!-- ══ GILL SLITS ══ -->
    <path d="M68,14 Q69,19 68,24" fill="none" stroke="#4a7488" stroke-width="0.8" opacity="0.5"/>
    <path d="M65,15 Q66,19.5 65,24.5" fill="none" stroke="#4a7488" stroke-width="0.8" opacity="0.45"/>
    <path d="M62,15.5 Q63,20 62,25" fill="none" stroke="#4a7488" stroke-width="0.7" opacity="0.4"/>
    <path d="M59,16 Q60,20.5 59,25" fill="none" stroke="#4a7488" stroke-width="0.6" opacity="0.35"/>
    <path d="M56.5,16.5 Q57.5,21 56.5,25" fill="none" stroke="#4a7488" stroke-width="0.5" opacity="0.3"/>

    <!-- ══ EYE ══ -->
    <circle cx="76" cy="18" r="3" fill="white"/>
    <circle cx="76" cy="18" r="2.8" stroke="#4a7488" stroke-width="0.4" fill="white"/>
    <circle cx="77" cy="18" r="1.7" fill="#101820"/>
    <circle cx="77.5" cy="17.2" r="0.6" fill="white"/>
    <rect class="fish-eyelid" x="72.5" y="15" width="7" height="6" rx="3" fill="#8aaec4"/>

    <!-- ══ SNOUT ══ -->
    <path d="M85,20 Q88,22 88,23 Q88,24 85,26" fill="#92b4c8" opacity="0.2"/>

    <!-- ══ MOUTH — toothy grin ══ -->
    <path d="M72,27 Q78,32 86,27" fill="none" stroke="#3a5a6e" stroke-width="1.3" stroke-linecap="round"/>
    <!-- Lower teeth -->
    <path d="M74,27.2 L75,29.8 L76,27.2" fill="white" stroke="#c8d4d8" stroke-width="0.3"/>
    <path d="M77,27.8 L78,30.2 L79,27.8" fill="white" stroke="#c8d4d8" stroke-width="0.3"/>
    <path d="M80,27.6 L81,29.8 L82,27.6" fill="white" stroke="#c8d4d8" stroke-width="0.3"/>
    <path d="M83,27 L84,29 L85,27" fill="white" stroke="#c8d4d8" stroke-width="0.3"/>
    <!-- Upper teeth -->
    <path d="M75,27 L76,25 L77,27" fill="white" stroke="#c8d4d8" stroke-width="0.25" opacity="0.7"/>
    <path d="M78,27.5 L79,25.5 L80,27.5" fill="white" stroke="#c8d4d8" stroke-width="0.25" opacity="0.7"/>
    <path d="M81,27.4 L82,25.4 L83,27.4" fill="white" stroke="#c8d4d8" stroke-width="0.25" opacity="0.7"/>

    <!-- Nostril -->
    <circle cx="84" cy="22" r="0.6" fill="#4a7488" opacity="0.45"/>
  </svg>`;
}

function getFishSVG(type) {
  const generators = {
    friendly:   createFriendlyFishSVG,
    suspicious: createSuspiciousFishSVG,
    phishy:     createPhishyPufferSVG,
    shark:      createSharkSVG
  };
  return (generators[type] || generators.friendly)();
}

/* ═══════════════════════════════════════════════
   Fish Entity — JS-driven swimming + CSS micro-animations
   ═══════════════════════════════════════════════ */

class FishEntity {
  constructor(type, container) {
    this.type = type;
    const cfg = FISH_TYPES[type];
    this.w = cfg.size.w;
    this.h = cfg.size.h;
    this.id = fishIdCounter++;

    // Container bounds (fallback for safety)
    const rect = container.getBoundingClientRect();
    this.containerW = rect.width  || 360;
    this.containerH = rect.height || 220;

    // Random size variation (0.8× – 1.15×)
    this.scale = 0.8 + Math.random() * 0.35;

    // Starting position (random, within bounds)
    const maxX = Math.max(0, this.containerW - this.w * this.scale);
    const maxY = Math.max(0, this.containerH - this.h * this.scale);
    this.x = Math.random() * maxX;
    this.y = Math.random() * maxY;

    // Velocity (px / sec)
    const spd   = cfg.speed.min + Math.random() * (cfg.speed.max - cfg.speed.min);
    const angle = (Math.random() - 0.5) * 0.6;          // slight vertical bias
    this.vx = Math.cos(angle) * spd * (Math.random() > 0.5 ? 1 : -1);
    this.vy = Math.sin(angle) * spd;

    // Smooth horizontal flip (1 = facing right, -1 = facing left)
    this.currentScaleX = this.vx >= 0 ? 1 : -1;
    this.targetScaleX  = this.currentScaleX;

    // Timer for random course adjustments
    this.courseTimer = 2 + Math.random() * 5;

    // ── Create DOM element ──
    this.el = document.createElement('div');
    this.el.className = 'fish-entity';
    this.el.dataset.type = type;
    this.el.style.width  = this.w + 'px';
    this.el.style.height = this.h + 'px';
    this.el.innerHTML = getFishSVG(type);
    container.appendChild(this.el);

    // Stagger CSS animation offsets for natural look
    this._randomizeAnimations();

    // Pufferfish puff/depuff cycle
    this._puffTimeout = null;
    if (type === 'phishy') this._schedulePuff();

    // Tooltip
    this.el.addEventListener('mouseenter', (e) => showFishTooltip(e, type));
    this.el.addEventListener('mouseleave', hideFishTooltip);
  }

  /* offset CSS animations so fish don't all flutter in sync */
  _randomizeAnimations() {
    const tail = this.el.querySelector('.fish-tail');
    const pect = this.el.querySelector('.fish-pectoral');
    const lid  = this.el.querySelector('.fish-eyelid');
    if (tail) tail.style.animationDelay = `${-Math.random() * 0.5}s`;
    if (pect) pect.style.animationDelay = `${-Math.random() * 1.5}s`;
    if (lid)  lid.style.animationDelay  = `${-Math.random() * 5}s`;
  }

  /* Pufferfish: periodically puff up then deflate */
  _schedulePuff() {
    const delay = 7000 + Math.random() * 10000;
    this._puffTimeout = setTimeout(() => {
      this.el.classList.add('puffed');
      // Slow down while puffed
      const savedVx = this.vx, savedVy = this.vy;
      this.vx *= 0.25;
      this.vy *= 0.25;

      setTimeout(() => {
        this.el.classList.remove('puffed');
        // Restore speed
        this.vx = savedVx;
        this.vy = savedVy;
        this._schedulePuff();
      }, 2500);
    }, delay);
  }

  /* Called every frame by the animation loop */
  update(dt) {
    dt = Math.min(dt, 0.1);   // cap to prevent jump on tab-switch

    // ── Random course changes ──
    this.courseTimer -= dt;
    if (this.courseTimer <= 0) {
      this.courseTimer = 3 + Math.random() * 6;
      this.vy += (Math.random() - 0.5) * 20;
      // Occasional full reversal
      if (Math.random() < 0.12) this.vx *= -1;
    }

    // ── Clamp vy so fish don't swim too steeply ──
    const maxVy = Math.abs(this.vx) * 0.6;
    this.vy = Math.max(-maxVy, Math.min(maxVy, this.vy));

    // ── Move ──
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // ── Bounce off container walls ──
    const maxX = Math.max(0, this.containerW - this.w * this.scale);
    const maxY = Math.max(0, this.containerH - this.h * this.scale);

    if (this.x <= 0)    { this.x = 0;    this.vx = Math.abs(this.vx); }
    else if (this.x >= maxX) { this.x = maxX; this.vx = -Math.abs(this.vx); }

    if (this.y <= 0)    { this.y = 0;    this.vy =  Math.abs(this.vy) * 0.5; }
    else if (this.y >= maxY) { this.y = maxY; this.vy = -Math.abs(this.vy) * 0.5; }

    // ── Smooth facing flip (passes through 0 for a natural turn) ──
    this.targetScaleX = this.vx >= 0 ? 1 : -1;
    const turnRate = 6;
    this.currentScaleX += (this.targetScaleX - this.currentScaleX)
                          * Math.min(1, turnRate * dt);
    if (Math.abs(this.currentScaleX - this.targetScaleX) < 0.05) {
      this.currentScaleX = this.targetScaleX;
    }

    // ── Subtle swimming tilt based on vertical velocity ──
    const swimAngle = Math.atan2(this.vy, Math.abs(this.vx))
                      * (180 / Math.PI) * 0.4;

    // ── Apply position + transform ──
    this.el.style.left = this.x + 'px';
    this.el.style.top  = this.y + 'px';
    this.el.style.transform =
      `scaleX(${this.currentScaleX}) rotate(${swimAngle.toFixed(1)}deg) scale(${this.scale})`;
  }

  destroy() {
    if (this._puffTimeout) clearTimeout(this._puffTimeout);
    this.el.remove();
  }
}

/* ═══════════════════════════════════════════════
   Animation Loop (requestAnimationFrame)
   ═══════════════════════════════════════════════ */

function startAnimation() {
  if (animFrameId) return;
  lastFrameTime = performance.now();

  function tick(now) {
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    for (const fish of fishEntities) fish.update(dt);
    animFrameId = requestAnimationFrame(tick);
  }
  animFrameId = requestAnimationFrame(tick);
}

function stopAnimation() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

/* ═══════════════════════════════════════════════
   Initialisation
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initCollectionIcons();
  loadFishTank();
  initBubbles();
  initParticles();
  initSettings();

  document.getElementById('clear-btn').addEventListener('click', clearHistory);

  // Refresh periodically
  setInterval(loadFishTank, 30000);
});

/* ═══════════════════════════════════════════════
   Collection Panel Icons (SVG instead of emoji)
   ═══════════════════════════════════════════════ */

function initCollectionIcons() {
  document.querySelectorAll('.fish-type-icon[data-fish-type]').forEach(el => {
    const type = el.dataset.fishType;
    if (type && getFishSVG) {
      el.innerHTML = getFishSVG(type);
    }
  });
}

/* ═══════════════════════════════════════════════
   Settings (Enhanced Scanning toggle)
   ═══════════════════════════════════════════════ */

function initSettings() {
  const toggle = document.getElementById('enhanced-scanning-toggle');
  if (!toggle) return;

  chrome.storage.local.get(['enhancedScanning'], (data) => {
    toggle.checked = data.enhancedScanning !== false;
  });

  toggle.addEventListener('change', () => {
    chrome.storage.local.set({ enhancedScanning: toggle.checked });
  });
}

/* ═══════════════════════════════════════════════
   Bubble Effect
   ═══════════════════════════════════════════════ */

function initBubbles() {
  const container = document.getElementById('bubbles');

  function createBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = Math.random() * 8 + 3;
    bubble.style.width  = `${size}px`;
    bubble.style.height = `${size}px`;
    // Spawn from varied positions across the tank floor
    bubble.style.left = `${Math.random() * 320 + 10}px`;
    bubble.style.animationDuration = `${Math.random() * 3 + 4}s`;
    container.appendChild(bubble);
    setTimeout(() => bubble.remove(), 7000);
  }

  setInterval(createBubble, 1000);
  for (let i = 0; i < 4; i++) setTimeout(createBubble, i * 250);
}

/* ═══════════════════════════════════════════════
   Floating Particles (tiny plankton / dust motes)
   ═══════════════════════════════════════════════ */

function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  function spawnParticle() {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 1.5 + Math.random() * 2;
    p.style.width  = size + 'px';
    p.style.height = size + 'px';
    p.style.left   = Math.random() * 380 + 10 + 'px';
    p.style.top    = 60 + Math.random() * 180 + 'px';
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay    = (Math.random() * 4) + 's';
    p.style.background = Math.random() > 0.5
      ? 'rgba(200, 230, 255, 0.45)'
      : 'rgba(64, 224, 208, 0.3)';
    container.appendChild(p);
    setTimeout(() => p.remove(), 22000);
  }

  setInterval(spawnParticle, 2500);
  for (let i = 0; i < 6; i++) setTimeout(spawnParticle, i * 400);
}

/* ═══════════════════════════════════════════════
   Fish Tank Data Loading
   ═══════════════════════════════════════════════ */

function loadFishTank() {
  chrome.runtime.sendMessage({ action: 'getFishCollection' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading fish tank:', chrome.runtime.lastError);
      return;
    }

    const { fishCollection, totalScanned, recentCatches } = response || {};

    document.getElementById('total-scanned').textContent = totalScanned || 0;

    const totalFish = Object.values(fishCollection || {})
                            .reduce((sum, count) => sum + count, 0);
    document.getElementById('fish-caught').textContent = totalFish;

    updateFishTypeCounts(fishCollection || {});
    populateFishTank(fishCollection || {});
    displayRecentCatches(recentCatches || []);
  });
}

/* ═══════════════════════════════════════════════
   Collection Panel
   ═══════════════════════════════════════════════ */

function updateFishTypeCounts(collection) {
  let typesCollected = 0;

  Object.keys(FISH_TYPES).forEach(type => {
    const count = collection[type] || 0;
    document.getElementById(`count-${type}`).textContent = count;

    const typeEl = document.querySelector(`.fish-type[data-type="${type}"]`);
    if (count > 0) {
      typeEl.classList.remove('locked');
      typesCollected++;
    } else {
      typeEl.classList.add('locked');
    }
  });

  document.getElementById('collection-count').textContent =
    `${typesCollected} / ${Object.keys(FISH_TYPES).length} types`;
}

/* ═══════════════════════════════════════════════
   Populate Fish Tank (SVG fish with JS movement)
   ═══════════════════════════════════════════════ */

function populateFishTank(collection) {
  const container = document.getElementById('fish-container');
  const emptyTank = document.getElementById('empty-tank');

  // Stop existing animation + clear pending spawns
  stopAnimation();
  spawnTimeouts.forEach(clearTimeout);
  spawnTimeouts = [];
  fishEntities.forEach(f => f.destroy());
  fishEntities = [];

  const maxVisible = 12;

  // Build fish list purely from real collection counts
  let fishToShow = [];
  const totalFish = Object.values(collection).reduce((s, c) => s + c, 0);
  if (totalFish > 0) {
    Object.entries(collection).forEach(([type, count]) => {
      if (count > 0) {
        const show = Math.min(count, 3); // up to 3 per type
        for (let i = 0; i < show; i++) fishToShow.push(type);
      }
    });
  }

  // Show or hide the empty-tank message
  if (fishToShow.length === 0) {
    emptyTank.style.display = '';
    return; // nothing to animate
  }
  emptyTank.style.display = 'none';

  fishToShow = shuffleArray(fishToShow).slice(0, maxVisible);

  // Staggered spawn for a natural entrance
  fishToShow.forEach((type, i) => {
    const tid = setTimeout(() => {
      fishEntities.push(new FishEntity(type, container));
    }, i * 180);
    spawnTimeouts.push(tid);
  });

  startAnimation();
}

/* ═══════════════════════════════════════════════
   Fish Tooltip
   ═══════════════════════════════════════════════ */

function showFishTooltip(e, type) {
  const fishData = FISH_TYPES[type];
  const tooltip  = document.getElementById('fish-tooltip');

  tooltip.querySelector('.tooltip-title').textContent  = fishData.name;
  tooltip.querySelector('.tooltip-detail').textContent = fishData.description;

  // Make tooltip visible (but transparent) to measure its size
  tooltip.style.left = '0px';
  tooltip.style.top  = '0px';
  tooltip.style.visibility = 'hidden';
  tooltip.classList.add('show');

  const fishRect    = e.currentTarget.getBoundingClientRect();
  const tipRect     = tooltip.getBoundingClientRect();
  const popupWidth  = document.body.clientWidth;  // 420px
  const margin      = 6; // min gap from popup edges

  // Centre horizontally on the fish, then clamp within the popup
  let left = fishRect.left + fishRect.width / 2 - tipRect.width / 2;
  left = Math.max(margin, Math.min(left, popupWidth - tipRect.width - margin));

  // Place above the fish; if that goes off-screen, flip below
  let top = fishRect.top - tipRect.height - 8;
  if (top < margin) {
    top = fishRect.bottom + 8;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top  = `${top}px`;
  tooltip.style.visibility = '';
}

function hideFishTooltip() {
  document.getElementById('fish-tooltip').classList.remove('show');
}

/* ═══════════════════════════════════════════════
   Recent Catches
   ═══════════════════════════════════════════════ */

function displayRecentCatches(catches) {
  const recentList = document.getElementById('recent-list');

  const recent = catches
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  if (recent.length === 0) {
    recentList.innerHTML =
      '<div class="empty-recent">No catches yet - start scanning!</div>';
    return;
  }

  recentList.innerHTML = recent.map(item => {
    const fishType = getFishTypeFromRisk(item.riskScore);
    const fishData = FISH_TYPES[fishType];
    const riskLevel = item.riskScore >= 76 ? 'high'
                    : item.riskScore >= 50 ? 'medium' : 'low';
    const timeStr = formatTime(new Date(item.timestamp));

    return `
      <div class="recent-item" data-message-id="${item.messageId || ''}">
        <span class="recent-fish">${fishData.emoji}</span>
        <div class="recent-info">
          <div class="recent-domain">${escapeHtml(item.senderDomain || 'Unknown')}</div>
          <div class="recent-time">${timeStr}</div>
        </div>
        <span class="recent-score ${riskLevel}">${item.riskScore}</span>
      </div>
    `;
  }).join('');

  recentList.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => {
      const messageId = item.getAttribute('data-message-id');
      if (messageId) {
        chrome.tabs.create({
          url: `https://mail.google.com/mail/u/0/#inbox/${messageId}`
        });
        window.close();
      }
    });
  });
}

/* ═══════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════ */

function getFishTypeFromRisk(riskScore) {
  if (riskScore >= 90) return 'shark';
  if (riskScore >= 76) return 'phishy';
  if (riskScore >= 50) return 'suspicious';
  return 'friendly';
}

function clearHistory() {
  if (confirm('Are you sure you want to release all your fish and clear history?')) {
    chrome.runtime.sendMessage({ action: 'clearHistory' }, (response) => {
      if (response && response.success) loadFishTank();
    });
  }
}

function formatTime(date) {
  const now  = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);

  if (minutes < 1)  return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  if (days < 7)     return `${days}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function shuffleArray(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
