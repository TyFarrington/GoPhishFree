import { useEffect } from "react";
import PageLayout from "./PageLayout";

const s    = { marginBottom: "2rem" };
const h2   = { fontSize: "1.15rem", fontWeight: 700, color: "#e2e8f0", marginBottom: "0.5rem" };
const p    = { color: "#94a3b8", lineHeight: 1.75, margin: "0 0 0.75rem", fontSize: "0.95rem" };
const li   = { color: "#94a3b8", lineHeight: 1.75, fontSize: "0.95rem", marginBottom: "0.4rem" };
const tag  = { display: "inline-block", background: "rgba(13,148,136,0.15)", border: "1px solid rgba(13,148,136,0.3)", borderRadius: 4, padding: "1px 8px", fontSize: "0.78rem", color: "#2dd4bf", marginRight: 6, marginBottom: 4 };
const code = { color: "#e2e8f0", background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 3 };

export default function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "ld-privacy";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "GoPhishFree Privacy Policy",
      "url": "https://gophishfree.com/privacy",
      "description": "GoPhishFree privacy policy: all ML processing is local, no email content is ever transmitted.",
    });
    if (!document.getElementById("ld-privacy")) document.head.appendChild(script);
    return () => { document.getElementById("ld-privacy")?.remove(); };
  }, []);

  return (
    <PageLayout title="Privacy Policy" description="Last updated: April 12, 2026">

      {/* Privacy-first banner */}
      <div style={{ ...s, padding: "1rem 1.25rem", background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.25)", borderRadius: 8 }}>
        <p style={{ ...p, margin: 0, color: "#2dd4bf", fontWeight: 600 }}>Privacy-first by design</p>
        <p style={{ ...p, margin: "0.4rem 0 0" }}>
          GoPhishFree is built on one core principle: <strong style={{ color: "#e2e8f0" }}>your emails never leave your device</strong>.
          The core ML model performs all analysis locally in your browser. No email content, subject lines, or sender
          addresses are ever transmitted to GoPhishFree or any server we operate.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>1. Who We Are</h2>
        <p style={p}>
          GoPhishFree is a free, open-source Chrome extension developed as a capstone research project at the
          University of Kansas by Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, and Kaleb Howard
          ("we," "us," "developers"). We do not operate as a company and do not have corporate offices or registered
          data controllers. This policy describes how the Extension handles data on your device.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>2. Data We Do NOT Collect</h2>
        <p style={p}>We do not collect, transmit, store remotely, or have access to any of the following:</p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          {[
            "Email body content, subject lines, or any part of your email text",
            "Sender email addresses or recipient email addresses",
            "Email attachments or their contents",
            "Your Gmail credentials, OAuth tokens, or session cookies",
            "Your browsing history or activity outside of Gmail email scanning",
            "Personal identifiers such as your name, IP address, or location",
            "Usage analytics, telemetry, or crash reports",
          ].map(item => <li key={item} style={li}>{item}</li>)}
        </ul>
        <div><span style={tag}>No servers</span><span style={tag}>No accounts</span><span style={tag}>No tracking</span><span style={tag}>No ads</span></div>
      </div>

      <div style={s}>
        <h2 style={h2}>3. Local ML Processing</h2>
        <p style={p}>
          All phishing detection is performed entirely within your browser. A pre-trained Random Forest model is
          bundled inside the Extension package and loaded into memory when needed. Feature extraction (counting
          links, scoring urgency language, checking header fields, etc.), scoring, and risk classification all
          happen in-memory on your device and produce only a numerical risk score — no email text is ever involved
          in any network request made by GoPhishFree.
        </p>
        <div><span style={tag}>No server calls</span><span style={tag}>In-browser inference</span><span style={tag}>No telemetry</span><span style={tag}>Bundled model</span></div>
      </div>

      <div style={s}>
        <h2 style={h2}>4. What Is Stored Locally (Your Device Only)</h2>
        <p style={p}>
          The Extension stores the following in <code style={code}>chrome.storage.local</code> on your device only.
          This data is <strong style={{ color: "#e2e8f0" }}>never synced to the cloud</strong> (we do not use{" "}
          <code style={code}>chrome.storage.sync</code>) and is never transmitted anywhere:
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          {[
            "Scan history — risk scores, sender domains (not full addresses), and risk reasons — capped at 500 entries",
            "Fish collection game state (counts per fish type and recent catches)",
            "Your settings: Enhanced Scanning toggle, AI Enhancement toggle, Browserling toggle",
            "Custom trusted and blocked domain lists you define",
            "Terms of Service acceptance flag (a single boolean)",
            "If using BYOK AI: your AI provider name and API key — stored locally only, never transmitted to us",
            "If using BYOK AI: your optional custom endpoint URL and model name",
          ].map(item => <li key={item} style={li}>{item}</li>)}
        </ul>
        <p style={p}>
          You can delete all locally stored data at any time by clicking <strong style={{ color: "#e2e8f0" }}>Clear All</strong> in the Extension popup. This is irreversible.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>5. Enhanced Scanning — DNS-over-HTTPS</h2>
        <p style={p}>
          When Enhanced Scanning is enabled (on by default), the Extension performs DNS lookups for sender domains
          to verify whether they resolve and whether mail (MX) records exist. These lookups use encrypted
          DNS-over-HTTPS via:
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}><strong style={{ color: "#e2e8f0" }}>Cloudflare</strong> (<code style={code}>cloudflare-dns.com</code>) — subject to <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>Cloudflare's Privacy Policy</a></li>
          <li style={li}><strong style={{ color: "#e2e8f0" }}>Google</strong> (<code style={code}>dns.google</code>) — subject to <a href="https://developers.google.com/speed/public-dns/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>Google's DNS Privacy Policy</a></li>
        </ul>
        <p style={p}>
          These requests contain <strong style={{ color: "#e2e8f0" }}>only the sender's domain name</strong> — not
          your email address, the full sender address, or any email content. You can disable Enhanced Scanning in
          the Extension settings at any time.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>6. Optional AI Enhancement (BYOK — Bring Your Own Key)</h2>
        <p style={p}>
          If you choose to enable AI-powered analysis, you provide your own API key for a supported provider. When
          active, the Extension sends a <strong style={{ color: "#e2e8f0" }}>feature vector only</strong> to your
          chosen provider. This vector contains numerical scores such as link count, urgency score, header anomaly
          flags, etc. — <strong style={{ color: "#e2e8f0" }}>it never includes email text, subject lines, sender
          addresses, or any personally identifiable information.</strong>
        </p>
        <p style={p}>Supported providers and their privacy policies:</p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}>OpenAI — <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>openai.com/policies/privacy-policy</a></li>
          <li style={li}>Anthropic (Claude) — <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>anthropic.com/privacy</a></li>
          <li style={li}>Google Gemini — <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>policies.google.com/privacy</a></li>
          <li style={li}>Azure OpenAI — <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>privacy.microsoft.com</a></li>
          <li style={li}>Custom endpoint — governed by the privacy policy of the endpoint you configure</li>
        </ul>
        <p style={p}>
          Your API key is stored in <code style={code}>chrome.storage.local</code> on your device only and is never
          transmitted to GoPhishFree or any party other than the AI provider you select when a scan is run.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>7. Deep Scan Links (Optional — Requires Your Explicit Action)</h2>
        <p style={p}>
          The Deep Scan feature is only activated when you explicitly click the "Deep Scan" button for a specific
          email. When activated, the Extension requests the optional <code style={code}>*://*/*</code> host
          permission from Chrome, then fetches the HTML of pages linked within that email via the Extension's
          background service worker.
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0 0 0.75rem" }}>
          <li style={li}>Only the HTML text of linked pages is downloaded — no scripts are executed.</li>
          <li style={li}>No cookies, credentials, or session state are sent with these requests.</li>
          <li style={li}>Fetched HTML is parsed locally and immediately discarded after feature extraction — it is not stored or transmitted.</li>
          <li style={li}>The domain names of fetched pages will appear in your browser's standard network activity.</li>
        </ul>
        <p style={p}>
          The host permission is granted per-use. You can revoke it at any time in Chrome's Extension settings.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>8. Third-Party Services</h2>
        <p style={p}>
          Aside from the DNS-over-HTTPS lookups and optional BYOK AI calls described above, GoPhishFree does not
          use analytics platforms, advertising networks, crash reporting tools, or any third-party tracking
          services. The GoPhishFree website (gophishfree.com) uses no cookies beyond basic session functionality
          and no third-party analytics.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>9. Data Security</h2>
        <p style={p}>
          Because all data is processed and stored locally on your device, there is no GoPhishFree server that
          could be breached to expose your email data. Your scan history and settings are protected by Chrome's
          standard extension storage isolation. Your API key (if configured) is stored in local extension storage
          and is not accessible to other extensions or websites.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>10. Children's Privacy</h2>
        <p style={p}>
          GoPhishFree is not directed at children under 13. We do not knowingly collect any personal information
          from children.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>11. Changes to This Policy</h2>
        <p style={p}>
          We may update this Privacy Policy periodically. The "Last updated" date at the top of this page reflects
          the most recent revision. Continued use of the Extension after a policy change constitutes your acceptance
          of the updated policy.
        </p>
      </div>

      <div style={s}>
        <h2 style={h2}>12. Contact</h2>
        <p style={p}>
          Privacy questions or concerns can be directed to the team via our{" "}
          <a href="https://github.com/Areyes42/EECS582-CapstoneProject" target="_blank" rel="noopener noreferrer" style={{ color: "#2dd4bf" }}>GitHub repository</a>.
          We will make reasonable efforts to respond within 30 days.
        </p>
      </div>
    </PageLayout>
  );
}
