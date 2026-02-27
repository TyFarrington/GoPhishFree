/**
 * @file App.jsx
 * @description Main React application component that serves as the top-level composition root.
 *              Imports and renders all page sections (Navbar, Hero, Demo, Features, HowItWorks,
 *              Stats, Privacy, FAQ, CTA, Footer) along with the animated PageFishBackground.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions All child section components must be available in ./components/.
 *                The React runtime must be loaded and the DOM root element must exist.
 * @postconditions A fully composed single-page application is rendered with all sections
 *                 displayed in the correct visual order.
 * @errorConditions If any imported component module is missing, the build or runtime will
 *                  throw a module-not-found error.
 * @sideEffects Renders the complete GoPhishFree landing page into the React virtual DOM.
 * @invariants The page layout order (Navbar -> Hero -> Demo -> Features -> HowItWorks ->
 *             Stats -> Privacy -> FAQ -> CTA -> Footer) remains constant.
 * @knownFaults None.
 */

/* ============================================================
 * Section Component Imports
 * ============================================================ */
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import StatsSection from "./components/StatsSection";
import PrivacySection from "./components/PrivacySection";
import DemoSection from "./components/DemoSection";
import CTASection from "./components/CTASection";
import FAQSection from "./components/FAQSection";
import Footer from "./components/Footer";
import { PageFishBackground } from "./components/SwimmingFish";

/* ============================================================
 * App Component — Root Layout & Section Composition
 * ============================================================ */
function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#0a0a0f",
        color: "#f1f5f9",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Animated fish background layer (renders behind all content) */}
      <PageFishBackground />

      {/* ---- Navigation ---- */}
      <Navbar />

      {/* ---- Page Sections (rendered in scroll order) ---- */}
      <HeroSection />
      <DemoSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <PrivacySection />
      <FAQSection />
      <CTASection />

      {/* ---- Footer ---- */}
      <Footer />
    </div>
  );
}

export default App;
