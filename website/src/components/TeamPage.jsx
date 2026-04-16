import { useEffect } from "react";
import PageLayout from "./PageLayout";

const TEAM = [
  {
    name: "Ty Farrington",
    role: "Lead Developer & ML Engineer",
    contributions: "Project architecture, Random Forest ML pipeline, feature extraction engine, Chrome extension core, dataset curation, model training infrastructure.",
    initials: "TF",
    color: "#0d9488",
    sameAs: ["https://www.linkedin.com/in/tyfarrington/", "https://github.com/TyFarrington"],
  },
  {
    name: "Andrew Reyes",
    role: "Extension & UI Developer",
    contributions: "Fish Tank popup UI, content script UI components, Gmail DOM integration, deep scan UI, animation system.",
    initials: "AR",
    color: "#0891b2",
    sameAs: ["https://www.linkedin.com/in/andrew-reyes1/", "https://github.com/Areyes42"],
  },
  {
    name: "Brett Suhr",
    role: "Security & Backend Developer",
    contributions: "Background service worker, AI provider integrations (BYOK), security hardening, DNS-over-HTTPS implementation, vulnerability auditing.",
    initials: "BS",
    color: "#7c3aed",
    sameAs: ["https://www.linkedin.com/in/brett-suhr-5a8bab24a/", "https://github.com/BrettSuhr"],
  },
  {
    name: "Nicholas Holmes",
    role: "Feature Engineering & QA",
    contributions: "BEC detection logic, header analysis, attachment risk scoring, email feature vector design, testing and validation.",
    initials: "NH",
    color: "#db2777",
    sameAs: ["https://www.linkedin.com/in/nicholas-m-holmes/", "https://github.com/nicholasmholmes"],
  },
  {
    name: "Kaleb Howard",
    role: "Website & Documentation",
    contributions: "Marketing website, documentation, sprint artifacts, Chrome Web Store submission materials, user-facing content.",
    initials: "KH",
    color: "#d97706",
    sameAs: ["https://www.linkedin.com/in/kalebhoward/", "https://github.com/KalebHoward26"],
  },
];

export default function TeamPage() {
  useEffect(() => {
    window.scrollTo(0, 0);

    // Schema.org JSON-LD: SoftwareApplication + Person entities for each developer
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          "@id": "https://gophishfree.com/#app",
          "name": "GoPhishFree",
          "description": "AI-powered phishing email detection Chrome extension for Gmail. Local machine learning, no data leaves your device.",
          "applicationCategory": "SecurityApplication",
          "operatingSystem": "Chrome",
          "url": "https://gophishfree.com",
          "author": TEAM.map(m => ({ "@type": "Person", "name": m.name, "url": `https://gophishfree.com/team#${m.name.replace(/\s+/g, "-").toLowerCase()}` })),
        },
        ...TEAM.map(m => ({
          "@type": "Person",
          "@id": `https://gophishfree.com/team#${m.name.replace(/\s+/g, "-").toLowerCase()}`,
          "name": m.name,
          "jobTitle": m.role,
          "affiliation": {
            "@type": "EducationalOrganization",
            "name": "University of Kansas",
          },
          "worksFor": {
            "@type": "Project",
            "name": "GoPhishFree",
            "url": "https://gophishfree.com",
          },
          ...(m.sameAs ? { "sameAs": m.sameAs } : {}),
          "contributor": { "@id": "https://gophishfree.com/#app" },
        })),
      ],
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "ld-team";
    script.textContent = JSON.stringify(schema);
    if (!document.getElementById("ld-team")) document.head.appendChild(script);

    // Set page title and meta description to include all developer names
    // so Google associates their names with this URL
    const names = TEAM.map(m => m.name).join(", ");
    document.title = `Meet the Team — ${names} | GoPhishFree`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) { metaDesc = document.createElement("meta"); metaDesc.name = "description"; document.head.appendChild(metaDesc); }
    metaDesc.content = `GoPhishFree was built by ${names} — a team of five developers at the University of Kansas. Learn about their roles in building this AI-powered phishing detection Chrome extension.`;

    return () => {
      document.getElementById("ld-team")?.remove();
      document.title = "GoPhishFree — AI-Powered Phishing Detection for Gmail | Free Chrome Extension";
    };
  }, []);

  return (
    <PageLayout
      title="Meet the Team"
      description="GoPhishFree was built by a team of five developers as a capstone project at the University of Kansas."
    >
      <div style={{ display: "grid", gap: "1.25rem" }}>
        {TEAM.map((member) => (
          <div
            key={member.name}
            id={member.name.replace(/\s+/g, "-").toLowerCase()}
            style={{
              display: "flex",
              gap: "1.25rem",
              alignItems: "flex-start",
              background: "#111827",
              border: "1px solid rgba(51,65,85,0.5)",
              borderRadius: 12,
              padding: "1.5rem",
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${member.color}33, ${member.color}66)`,
              border: `2px solid ${member.color}66`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem", fontWeight: 700, color: member.color,
            }}>
              {member.initials}
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 2px" }}>
                {member.name}
              </h2>
              <p style={{ fontSize: "0.8rem", color: member.color, fontWeight: 600, margin: "0 0 0.6rem" }}>
                {member.role}
              </p>
              <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.65, margin: 0 }}>
                {member.contributions}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: "2.5rem", padding: "1.25rem 1.5rem",
        background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.2)",
        borderRadius: 10, textAlign: "center",
      }}>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
          GoPhishFree is a capstone project developed at the{" "}
          <strong style={{ color: "#e2e8f0" }}>University of Kansas</strong>.
          It is free, open source, and built for the community.
        </p>
      </div>
    </PageLayout>
  );
}
