import Navbar from "./Navbar";
import Footer from "./Footer";

export default function PageLayout({ children, title, description }) {
  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "#0a0a0f", color: "#f1f5f9", overflowX: "hidden" }}>
      <Navbar />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "7rem 1.5rem 4rem" }}>
        {title && (
          <div style={{ marginBottom: "2.5rem", borderBottom: "1px solid rgba(51,65,85,0.4)", paddingBottom: "1.5rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{title}</h1>
            {description && <p style={{ color: "#94a3b8", marginTop: "0.5rem", fontSize: "0.95rem" }}>{description}</p>}
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}
