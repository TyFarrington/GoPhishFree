/**
 * @file Footer.jsx
 * @description Site-wide footer component for the GoPhishFree marketing website. Displays
 *              the brand logo and tagline, social media icon links (GitHub, X/Twitter),
 *              and three columns of navigation links organized by category: Product,
 *              Resources, and Legal. Includes a bottom bar with dynamic copyright year.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions  - React 18+ runtime available
 *                 - /logomini.png image asset served from the public directory
 * @postconditions - Renders a responsive footer with brand info, social icons, and link columns
 *                 - Copyright year is dynamically set to the current year
 * @errorConditions - If logomini.png is missing, the brand image will show a broken image icon
 * @sideEffects    - Inline hover handlers mutate link color and border-color styles on mouse events
 * @invariants     - footerLinks data structure is static and immutable at runtime
 *                 - External links always open in a new tab with noopener noreferrer
 * @knownFaults    - None
 */

/* ────────────────────────────────────────────────────────
   Footer Navigation Data — Static link definitions for the
   three footer columns. External links are flagged with
   `external: true` to receive target="_blank" attributes.
   ──────────────────────────────────────────────────────── */

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Privacy", href: "#privacy" },
    { label: "FAQ", href: "#faq" },
    { label: "Download", href: "#" },
  ],
  Resources: [
    { label: "GitHub", href: "https://github.com/Areyes42/EECS582-CapstoneProject", external: true },
    { label: "Meet the Team", href: "/team" },
    { label: "Report a Bug", href: "https://github.com/Areyes42/EECS582-CapstoneProject", external: true },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Open Source License", href: "https://github.com/Areyes42/EECS582-CapstoneProject", external: true },
  ],
};

/* ────────────────────────────────────────────────────────
   Footer — Main exported footer component
   ──────────────────────────────────────────────────────── */

/**
 * Renders the site footer with a responsive grid layout. The left column
 * contains the GoPhishFree brand (logo image + name), a brief description,
 * and social media icon buttons. The remaining columns iterate over the
 * footerLinks object to render Product, Resources, and Legal link lists.
 * A bottom bar displays the dynamic copyright year and a tagline.
 *
 * @returns {JSX.Element} The complete site footer
 */
import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ position: "relative", borderTop: "1px solid rgba(51,65,85,0.5)", background: "#0a0a0f", zIndex: 2 }}>
      <div className="container-main" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem" }} className="md:!grid-cols-2 lg:!grid-cols-5">
          {/* Brand column — logo, description, and social icons */}
          <div className="lg:!col-span-2">
            <a href="#hero" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", marginBottom: "1rem" }}>
              <img src="/logomini.png" alt="GoPhishFree" style={{ width: 24, height: 24, borderRadius: 4, filter: "drop-shadow(0 0 6px rgba(20,184,166,0.4))" }} />
              <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "white" }}>GoPhishFree</span>
            </a>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", lineHeight: 1.7, maxWidth: "20rem", marginBottom: "1.5rem" }}>
              Privacy-first phishing email detection for Gmail. Powered by local machine learning with 96.6% accuracy. Free and open source.
            </p>
            {/* Social media icon buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <a
                href="https://github.com/Areyes42/EECS582-CapstoneProject"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "0.5rem", background: "#1e293b", border: "1px solid rgba(51,65,85,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", textDecoration: "none", transition: "border-color 0.3s, color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.5)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)"; e.currentTarget.style.color = "#94a3b8"; }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ width: 36, height: 36, borderRadius: "0.5rem", background: "#1e293b", border: "1px solid rgba(51,65,85,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", textDecoration: "none", transition: "border-color 0.3s, color 0.3s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(20,184,166,0.5)"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(51,65,85,0.5)"; e.currentTarget.style.color = "#94a3b8"; }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns — dynamically rendered from footerLinks object */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 style={{ color: "white", fontWeight: 600, fontSize: "0.875rem", marginBottom: "1rem" }}>{title}</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#94a3b8", fontSize: "0.875rem", textDecoration: "none", transition: "color 0.3s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#2dd4bf"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        style={{ color: "#94a3b8", fontSize: "0.875rem", textDecoration: "none", transition: "color 0.3s" }}
                        onMouseEnter={e => { e.currentTarget.style.color = "#2dd4bf"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar — copyright and tagline */}
        <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid rgba(30,41,59,0.5)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
            &copy; {currentYear} GoPhishFree. Open source and free forever.
          </p>
          <p style={{ fontSize: "0.875rem", color: "#475569" }}>
            Made with care for a safer inbox.
          </p>
        </div>
        <p style={{ fontSize: "0.8rem", color: "#334155", marginTop: "0.75rem" }}>
          Built by{" "}
          <Link to="/team" style={{ color: "#475569", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes &amp; Kaleb Howard
          </Link>
          {" "}— University of Kansas Capstone Project
        </p>
      </div>
    </footer>
  );
}
