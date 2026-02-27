/**
 * @file main.jsx
 * @description React application entry point. Mounts the root App component into the DOM
 *              using React 18's createRoot API, wrapped in StrictMode for development
 *              diagnostics and best-practice enforcement.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions A DOM element with id="root" must exist in index.html.
 *                Global styles (index.css) and the App component must be importable.
 * @postconditions The React component tree is mounted to the #root element and the
 *                 application is interactive.
 * @errorConditions If the #root element is not found, createRoot will throw a runtime error.
 * @sideEffects Attaches the React component tree to the browser DOM.
 * @invariants StrictMode wrapping is always enabled to surface potential issues during development.
 * @knownFaults None.
 */

/* ============================================================
 * Imports
 * ============================================================ */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* ============================================================
 * Application Bootstrap — Mount React to DOM
 * ============================================================ */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
