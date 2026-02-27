/**
 * @file vite.config.js
 * @description Vite build-tool configuration for the GoPhishFree landing page.
 *              Registers the React fast-refresh plugin and the Tailwind CSS v4 Vite plugin
 *              so that JSX transforms and utility-class generation are handled automatically.
 *
 * @programmers Ty Farrington, Andrew Reyes, Brett Suhr, Nicholas Holmes, Kaleb Howard
 * @dateCreated 2026-02-14
 * @dateRevised 2026-02-14 - Sprint 2: Initial website creation with comprehensive documentation (All programmers)
 *
 * @preconditions Node.js and npm must be installed. The packages "vite", "@vitejs/plugin-react",
 *                and "@tailwindcss/vite" must be listed in package.json and installed.
 * @postconditions Vite is configured to compile JSX with React support and process Tailwind
 *                 CSS directives during both development and production builds.
 * @errorConditions If required plugins are not installed, Vite will throw a module resolution error.
 * @sideEffects None (configuration only).
 * @invariants Both the React and Tailwind CSS plugins are always active.
 * @knownFaults None.
 */

/* ============================================================
 * Plugin Imports
 * ============================================================ */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/* ============================================================
 * Vite Configuration Export
 * Docs: https://vite.dev/config/
 * ============================================================ */
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
