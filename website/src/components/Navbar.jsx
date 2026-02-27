/**
 * @file Navbar.jsx
 * @description Sticky navigation bar component for the GoPhishFree marketing website.
 *              Provides fixed-position navigation with scroll-aware styling, smooth-scroll
 *              anchor links, a responsive mobile hamburger menu with animated open/close,
 *              and a call-to-action button linking to the Chrome Web Store.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions
 *   - React 18+ and Framer Motion must be installed.
 *   - The Lucide React icon library must be available (Menu, X, Download icons).
 *   - Section elements with matching IDs (#demo, #features, etc.) must exist in the DOM
 *     for smooth-scroll navigation to function correctly.
 *   - The logo image "/logomini.png" must be served from the public directory.
 *
 * @postconditions
 *   - A fixed-position <nav> element renders at the top of the viewport.
 *   - On scroll past 20px, the navbar transitions to a blurred, semi-opaque background.
 *   - Clicking a nav link smooth-scrolls to the corresponding page section.
 *   - On mobile viewports, a hamburger toggle reveals/hides the nav links with animation.
 *
 * @errorConditions
 *   - If a target section ID does not exist in the DOM, smooth scrolling silently no-ops.
 *   - If the logo image fails to load, the alt text "GoPhishFree" is displayed.
 *
 * @sideEffects
 *   - Attaches a "scroll" event listener to the window on mount; removes it on unmount.
 *   - Programmatically calls Element.scrollIntoView() on nav link clicks.
 *   - Prevents the default anchor <a> navigation behavior.
 *
 * @invariants
 *   - The navbar is always rendered at z-index 50 and position fixed at the top.
 *   - The navLinks array is a static constant and is never mutated.
 *
 * @knownFaults
 *   - The CTA "Add to Chrome" href is currently "#" (placeholder) and does not link
 *     to an actual Chrome Web Store listing.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Download } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Navigation Link Configuration
   ─────────────────────────────────────────────────────────────
   Static array defining each nav item's display label and the
   corresponding in-page anchor href. Used by both desktop and
   mobile navigation renderers.
   ═══════════════════════════════════════════════════════════════ */

const navLinks = [
  { label: "Demo", href: "#demo" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Privacy", href: "#privacy" },
  { label: "FAQ", href: "#faq" },
];

/**
 * Navbar — Primary site navigation component.
 *
 * Renders a fixed-position navigation bar that becomes translucent with a
 * backdrop blur effect once the user scrolls past the threshold. Includes
 * desktop link bar, mobile hamburger menu (animated via Framer Motion
 * AnimatePresence), and a Chrome Web Store CTA button.
 *
 * @returns {JSX.Element} The fully rendered navigation bar.
 */
export default function Navbar() {
  /** @type {[boolean, Function]} Whether the page has scrolled past the 20px threshold */
  const [isScrolled, setIsScrolled] = useState(false);

  /** @type {[boolean, Function]} Whether the mobile navigation drawer is open */
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  /* ─── Scroll Detection Effect ───────────────────────────────
     Listens for window scroll events and toggles `isScrolled`
     when the vertical scroll position crosses 20px. Cleans up
     the listener on component unmount.
     ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Handles navigation link clicks with smooth scrolling.
   *
   * Prevents default anchor navigation, closes the mobile menu if open,
   * and smoothly scrolls the target section into view.
   *
   * @param {React.MouseEvent} e - The click event from the anchor element.
   * @param {string} href - The CSS selector for the target section (e.g., "#demo").
   * @returns {void}
   */
  const handleNavClick = (e, href) => {
    e.preventDefault();
    setIsMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  /* ═══════════════════════════════════════════════════════════
     Component Render
     ═══════════════════════════════════════════════════════════ */
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      transition: "all 0.3s",
      background: isScrolled ? "rgba(10,10,15,0.8)" : "transparent",
      backdropFilter: isScrolled ? "blur(16px)" : "none",
      borderBottom: isScrolled ? "1px solid rgba(51,65,85,0.5)" : "1px solid transparent",
      boxShadow: isScrolled ? "0 10px 25px rgba(0,0,0,0.2)" : "none",
    }}>
      <div className="container-main">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "7rem" }}>

          {/* ── Logo / Home Link ── */}
          <a href="#hero" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
            <img
              src="/logomini.png"
              alt="GoPhishFree"
              style={{
                width: 88,
                height: 88,
                borderRadius: 14,
                filter: "drop-shadow(0 0 10px rgba(20,184,166,0.35))",
              }}
            />
            <span style={{ fontSize: "3rem", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
              Go<span style={{ color: "#2dd4bf" }}>Phish</span>Free
            </span>
          </a>

          {/* ── Desktop Navigation Links ── */}
          <div className="hidden md:!flex" style={{ alignItems: "center", gap: "2.25rem" }}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                style={{ color: "#94a3b8", fontSize: "1.125rem", fontWeight: 500, textDecoration: "none", transition: "color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* ── Desktop Call-to-Action Button ── */}
          <div className="hidden md:!block">
            <a
              href="#"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem", padding: "0.875rem 1.75rem", borderRadius: "0.625rem", background: "linear-gradient(to right, #14b8a6, #10b981)", color: "white", fontSize: "1.125rem", fontWeight: 600, textDecoration: "none", transition: "transform 0.3s, box-shadow 0.3s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 10px 20px rgba(20,184,166,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <Download size={20} />
              Add to Chrome
            </a>
          </div>

          {/* ── Mobile Menu Toggle Button ── */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:!hidden"
            style={{ color: "#cbd5e1", padding: "0.5rem", background: "none", border: "none", cursor: "pointer" }}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
         Mobile Navigation Drawer
         ─────────────────────────────────────────────────────
         Animated slide-down drawer rendered only on mobile
         viewports. Uses Framer Motion AnimatePresence for
         enter/exit height and opacity transitions.
         ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:!hidden"
            style={{ overflow: "hidden", background: "rgba(10,10,15,0.95)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(51,65,85,0.5)" }}
          >
            <div style={{ padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  style={{ color: "#cbd5e1", fontSize: "1.125rem", fontWeight: 500, textDecoration: "none", padding: "0.5rem 0" }}
                >
                  {link.label}
                </a>
              ))}
              <a href="#" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "0.5rem", padding: "0.75rem 1.25rem", borderRadius: "0.5rem", background: "linear-gradient(to right, #14b8a6, #10b981)", color: "white", fontWeight: 600, textDecoration: "none" }}>
                <Download size={16} />
                Add to Chrome
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
