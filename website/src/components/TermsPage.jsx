import { useEffect } from "react";
import PageLayout from "./PageLayout";

const s      = { marginBottom: "2rem" };
const h2     = { fontSize: "1.15rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.5rem" };
const p      = { color: "#94a3b8", lineHeight: 1.75, margin: "0 0 0.75rem", fontSize: "0.95rem" };
const li     = { color: "#94a3b8", lineHeight: 1.75, fontSize: "0.95rem", marginBottom: "0.4rem" };
const strong = { color: "#e2e8f0" };
const warn   = { color: "#fbbf24" };
const link   = { color: "#2dd4bf" };

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "GoPhishFree Terms of Service",
  "url": "https://gophishfree.com/terms",
  "description": "Terms of Service for the GoPhishFree Chrome extension — experimental phishing detection software.",
};

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(SCHEMA);
    script.id = "ld-terms";
    if (!document.getElementById("ld-terms")) document.head.appendChild(script);
    return () => { document.getElementById("ld-terms")?.remove(); };
  }, []);

  return (
    <PageLayout title="Terms of Service" description="Last updated: April 12, 2026">

      {/* Experimental warning banner */}
      <div style={{ ...s, padding: "1rem 1.25rem", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8 }}>
        <p style={{ ...p, margin: 0, color: "#fbbf24", fontWeight: 600 }}>⚠ Experimental Research Software</p>
        <p style={{ ...p, margin: "0.4rem 0 0" }}>
          GoPhishFree is an experimental capstone research project developed at the University of Kansas.
          It is <strong style={strong}>not a commercial security product</strong> and carries no guarantees of accuracy,
          reliability, or fitness for any particular purpose. Read these terms carefully before use.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>1. Acceptance of Terms</h2>
        <p style={p}>
          By installing, enabling, or using the GoPhishFree Chrome extension ("Extension"), you agree to these Terms
          of Service in their entirety. If you do not agree to every section of these Terms, you must not install or
          use the Extension. Clicking "I Understand and Agree" in the Extension constitutes your binding acceptance.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>2. Nature of the Software — Experimental Status</h2>
        <p style={p}>
          GoPhishFree is an <strong style={strong}>experimental academic capstone project</strong>, not a finished
          commercial product. The Extension is provided to the public for educational and research purposes.
          You expressly acknowledge that:
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}>The Extension may contain bugs, errors, or inaccuracies.</li>
          <li style={li}>Features may change, break, or be removed without notice.</li>
          <li style={li}>The Extension has not been audited or certified by any security authority.</li>
          <li style={li}>It should not be your only line of defense against phishing or any other threat.</li>
        </ul>
      </div>

      <div style={s}>
        <h2 style={h2}>3. Description of Service</h2>
        <p style={p}>
          GoPhishFree analyzes Gmail emails using a locally-executed Random Forest machine learning model to assign
          a phishing risk score. All core inference runs on your device. No email content, subject lines, or sender
          addresses are transmitted to any server operated by GoPhishFree. Optional third-party AI enhancement,
          DNS-over-HTTPS lookups, and Deep Scan features involve limited, anonymized data as described in our{" "}
          <a href="/privacy" style={link}>Privacy Policy</a>.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>4. No Guarantee of Accuracy — Risk Acknowledgment</h2>
        <p style={p}>
          <strong style={warn}>THE EXTENSION WILL NOT CATCH EVERY PHISHING EMAIL. RISK SCORES CAN BE WRONG.</strong>
        </p>
        <p style={p}>
          Our model achieves approximately 97–98% accuracy on test datasets, which means roughly 1 in 30–50 emails
          may be incorrectly classified. A <strong style={strong}>"Safe"</strong> or low-risk score does{" "}
          <strong style={strong}>not</strong> mean an email is actually safe. A high-risk score does not mean an email
          is definitely malicious.
        </p>
        <p style={p}>
          By using the Extension you explicitly acknowledge and agree that:
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}>Risk scores are probabilistic estimates, not definitive verdicts.</li>
          <li style={li}>You will not rely solely on the Extension to make security decisions.</li>
          <li style={li}>You remain solely responsible for any action you take based on the Extension's output,
            including clicking links, opening attachments, or providing information in emails that the Extension
            labeled as low-risk or safe.</li>
          <li style={li}>You understand that phishing techniques evolve and the model may not recognize novel attacks.</li>
        </ul>
      </div>

      <div style={s}>
        <h2 style={h2}>5. Limitation of Liability</h2>
        <p style={p}>
          <strong style={warn}>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE DEVELOPERS OF GOPHISHFREE —
          TY FARRINGTON, ANDREW REYES, BRETT SUHR, NICHOLAS HOLMES, AND KALEB HOWARD — SHALL NOT BE LIABLE FOR ANY
          DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES.</strong>
        </p>
        <p style={p}>This includes but is not limited to:</p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}>Any phishing attack, credential theft, financial fraud, or data breach that the Extension failed to detect or prevent.</li>
          <li style={li}>Any harm arising from acting on a risk score that was incorrect.</li>
          <li style={li}>Any loss of data, money, privacy, or business resulting from use of the Extension.</li>
          <li style={li}>Any harm caused by the Extension malfunctioning, producing false positives, or failing to load.</li>
          <li style={li}>Any third-party AI provider errors when using the optional BYOK AI feature.</li>
          <li style={li}>Any harm arising from Deep Scan fetching content from linked pages.</li>
        </ul>
        <p style={p}>
          <strong style={strong}>You use this Extension entirely at your own risk.</strong> If you do not accept this
          limitation of liability, do not use the Extension.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>6. Disclaimer of Warranties</h2>
        <p style={p}>
          THE EXTENSION IS PROVIDED <strong style={strong}>"AS IS"</strong> AND{" "}
          <strong style={strong}>"AS AVAILABLE"</strong> WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          NON-INFRINGEMENT, ACCURACY, RELIABILITY, OR COMPLETENESS. WE DO NOT WARRANT THAT THE EXTENSION WILL
          OPERATE WITHOUT INTERRUPTION OR ERROR.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>7. Optional AI Enhancement (BYOK)</h2>
        <p style={p}>
          The Extension offers optional AI-powered analysis using third-party providers (OpenAI, Anthropic, Google
          Gemini, Azure OpenAI, or a custom endpoint). If you enable this feature and provide your own API key:
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}>Only numerical feature signals (not email text, subjects, or addresses) are sent to your chosen provider.</li>
          <li style={li}>Your API key is stored locally in your browser only and is never transmitted to GoPhishFree.</li>
          <li style={li}>Usage of the AI provider is governed by that provider's own terms of service and privacy policy.</li>
          <li style={li}>GoPhishFree is not responsible for the output, errors, costs, or data handling of any third-party AI provider.</li>
        </ul>
      </div>

      <div style={s}>
        <h2 style={h2}>8. Deep Scan Feature</h2>
        <p style={p}>
          The Deep Scan feature, when activated by you, fetches the HTML structure of pages linked within an email.
          By activating Deep Scan you acknowledge that:
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}>The domain names of linked pages will be visible in your browser's network traffic.</li>
          <li style={li}>Fetched HTML is analyzed locally and immediately discarded — it is not stored or transmitted.</li>
          <li style={li}>GoPhishFree is not responsible for the content or safety of any linked page.</li>
        </ul>
      </div>

      <div style={s}>
        <h2 style={h2}>9. Acceptable Use</h2>
        <p style={p}>
          You may use the Extension for lawful personal security purposes only. You may not use the Extension to:
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}>Conduct phishing campaigns or any malicious activity.</li>
          <li style={li}>Redistribute a modified version under the GoPhishFree name without permission.</li>
          <li style={li}>Use the Extension in any way that violates applicable laws or regulations.</li>
        </ul>
      </div>

      <div style={s}>
        <h2 style={h2}>10. Intellectual Property</h2>
        <p style={p}>
          GoPhishFree source code is open source. The name "GoPhishFree," logo, and branding are owned by the
          development team. You may fork and modify the code per the project license but may not republish under the
          GoPhishFree name or branding without explicit written permission.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>11. Changes to Terms</h2>
        <p style={p}>
          We may update these Terms at any time. When we do, the "Last updated" date above will change. Continued
          use of the Extension after changes constitutes acceptance of the updated Terms.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>12. Governing Law</h2>
        <p style={p}>
          These Terms are governed by the laws of the State of Michigan, United States, without regard to conflict
          of law principles. Any disputes shall be resolved in the courts of Ann Arbor, Michigan.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>13. Contact</h2>
        <p style={p}>
          Questions about these Terms can be directed to the team via our{" "}
          <a href="https://github.com/Areyes42/EECS582-CapstoneProject" target="_blank" rel="noopener noreferrer" style={link}>GitHub repository</a>.
        </p>
      </div>
    </PageLayout>
  );
}
