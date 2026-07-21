// ─────────────────────────────────────────────────────────────────────────────
// Service endpoints. The Review Hub is a React-only app that talks directly to
// the Analytics Service and AI Service. Adjust these if your services run on
// different hosts/ports (defaults match the repo's .env files).
// ─────────────────────────────────────────────────────────────────────────────
export const AI_URL =
  "https://henry-powell-midi-lil.trycloudflare.com"; // cloudflare tunnel -> local ai-service (rate-limited on Railway)
// "http://localhost:5001";
// "https://ai-service-production-b7c5.up.railway.app"; // ai service 2
export const ANALYTICS_URL =
  "https://shoulder-uncle-roles-text.trycloudflare.com"; // cloudflare tunnel -> local analytics-service
// "http://localhost:4000";
// "https://analytics-service-production-6d80.up.railway.app"; // analytic service
export const SHOPIFY_APP_URL =
  "https://shopify-extractor-production.up.railway.app"; // deployed extractor (install + sync)
// "http://localhost:3000";

// Default store used for the demo. A PO can change this on the onboarding card.
export const DEFAULT_STORE_ID = "my-store-mkct5tzv.myshopify.com";

// Hardcoded users (no real auth — matches the spec).
export const USERS = [
  { username: "admin", password: "admin123", role: "admin", name: "Rishabh" },
  { username: "dev1", password: "dev123", role: "developer", name: "Aadi" },
  { username: "dev2", password: "dev123", role: "developer", name: "Mansimar" },
];

// Map the AI service's string confidence to a percentage for the progress bar.
export const CONFIDENCE_PCT = { high: 92, medium: 68, low: 45 };
