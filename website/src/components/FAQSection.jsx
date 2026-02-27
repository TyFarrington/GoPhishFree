/**
 * @file FAQSection.jsx
 * @description Accordion-style Frequently Asked Questions section for the GoPhishFree
 *              marketing website. Renders a list of expandable question/answer pairs with
 *              animated open/close transitions using Framer Motion's AnimatePresence.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions  - React 18+ runtime available
 *                 - framer-motion and lucide-react packages installed
 * @postconditions - Renders an FAQ section anchored at id="faq" with animated accordion items
 *                 - Only one FAQ item may be open at a time (single-select accordion)
 * @errorConditions - None anticipated; component renders gracefully with an empty faqData array
 * @sideEffects    - DOM changes via Framer Motion AnimatePresence (height/opacity animations)
 *                 - ChevronDown icon rotation animation on toggle
 * @invariants     - FAQ data array is static and immutable at runtime
 *                 - openIndex is always null (all closed) or a valid index into the faqs array
 * @knownFaults    - None
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

/* ────────────────────────────────────────────────────────
   FAQ Data — Static array of question/answer objects that
   populate the accordion. Content covers product features,
   privacy, accuracy, pricing, and compatibility.
   ──────────────────────────────────────────────────────── */

const faqs = [
  { question: "How does GoPhishFree detect phishing?", answer: "GoPhishFree uses a Random Forest machine learning model that analyzes 64 features of each email — including sender patterns, URL characteristics, DNS records, and text analysis. The model was trained on 36,000+ email samples and runs entirely in your browser." },
  { question: "Is my email data safe?", answer: "Absolutely. GoPhishFree processes everything locally in your browser. No email content, subject lines, or sender information ever leaves your device. There is no backend server, no analytics, and no data collection whatsoever." },
  { question: "How accurate is the detection?", answer: "Our unified model achieves 96.6% accuracy on test data, with isotonic calibration for reliable risk scoring. It produces a 0-100 risk score categorized into four tiers: Low, Medium, High, and Dangerous." },
  { question: "Is GoPhishFree really free?", answer: "Yes, GoPhishFree is completely free and always will be. There are no premium tiers, no subscription, and no hidden costs. It's an open-source project built to make email security accessible to everyone." },
  { question: "Does it work with email providers other than Gmail?", answer: "Currently, GoPhishFree is designed specifically for Gmail's web interface. Support for other email providers may be added in future updates." },
  { question: "What is the AI Enhancement feature?", answer: "AI Enhancement is an optional feature where you can bring your own API key (BYOK) for cloud AI providers like OpenAI, Anthropic, or Google Gemini to get a second opinion on suspicious emails. Only extracted features are sent — never your actual email content." },
  { question: "Can I use it offline?", answer: "The core ML phishing detection works without an internet connection since the model runs locally. However, features like DNS verification, Deep Scan (web page analysis), and AI Enhancement require internet access." },
  { question: "Is it open source?", answer: "Yes! GoPhishFree is fully open source and available on GitHub. You can review the code, contribute, or fork it for your own use. Transparency is core to our privacy-first approach." },
];

/* ────────────────────────────────────────────────────────
   FAQItem — Individual accordion row component
   ──────────────────────────────────────────────────────── */

/**
 * Renders a single expandable FAQ item with a clickable question header and
 * an animated answer body. Uses AnimatePresence for smooth height/opacity
 * transitions and a rotating ChevronDown indicator.
 *
 * @param {Object}   props
 * @param {Object}   props.faq       - Object with `question` and `answer` strings
 * @param {boolean}  props.isOpen    - Whether this item is currently expanded
 * @param {Function} props.onToggle  - Callback invoked when the user clicks the header
 * @returns {JSX.Element} A single accordion row
 */
function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(51,65,85,0.3)" }}>
      <button
        onClick={onToggle}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 0.25rem", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
      >
        <span style={{ fontSize: "1.125rem", fontWeight: 500, color: isOpen ? "#2dd4bf" : "#e2e8f0", transition: "color 0.3s" }}>
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ flexShrink: 0, marginLeft: "1rem" }}
        >
          <ChevronDown size={20} style={{ color: isOpen ? "#2dd4bf" : "#64748b" }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <p style={{ paddingBottom: "1.25rem", paddingLeft: "0.25rem", paddingRight: "0.25rem", color: "#94a3b8", lineHeight: 1.7 }}>
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   FAQSection — Main exported section component
   ──────────────────────────────────────────────────────── */

/**
 * Full-width FAQ section with a scroll-triggered fade-in header, a styled
 * container card, and an accordion of FAQItem components. Manages which
 * item is open via a single `openIndex` state variable (null = all closed).
 *
 * @returns {JSX.Element} The complete FAQ section
 */
export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" style={{ position: "relative", paddingTop: "5rem", paddingBottom: "5rem", backgroundColor: "#0a0a0f", zIndex: 2 }}>
      <div className="container-mid">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "4rem" }}
        >
          <span style={{ display: "inline-block", padding: "0.375rem 1rem", borderRadius: "9999px", background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.2)", color: "#2dd4bf", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1rem" }}>
            FAQ
          </span>
          <h2 style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)", fontWeight: 700, marginBottom: "1rem" }}>
            Frequently Asked{" "}
            <span style={{ backgroundImage: "linear-gradient(to right, #2dd4bf, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Questions
            </span>
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "1.125rem" }}>
            Everything you need to know about GoPhishFree.
          </p>
        </motion.div>

        {/* FAQ accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ borderRadius: "1rem", border: "1px solid rgba(51,65,85,0.5)", background: "rgba(26,26,46,0.4)", padding: "1.5rem 2rem" }}
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={i}
              faq={faq}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
