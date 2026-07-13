import { AI_URL, ANALYTICS_URL, SHOPIFY_APP_URL } from "./config";
import { MOCK_GENERATE_RESPONSE } from "./mockData";

// Merge the AI service's owner-facing `report.problems` with the dev-facing
// `analysis` (which carries effort, issue, recommendation, codePatch) by id.
export function mergeSuggestions(report, analysis) {
  const byId = Object.fromEntries((analysis || []).map((a) => [a.id, a]));
  const problems = (report && report.problems) || [];
  return problems.map((p) => ({ ...p, ...(byId[p.id] || {}) }));
}

// Build the store-facing install URL for the extractor app.
export function installUrl(storeId) {
  return `${SHOPIFY_APP_URL}/auth?shop=${encodeURIComponent(storeId)}`;
}

// Best-effort: ask the shopify-pp service to extract + ingest fresh data.
// This may fail (service not running, or CORS — shopify-pp has no CORS
// middleware); callers should treat failure as non-fatal and proceed.
export async function syncStore(storeId, websiteUrl) {
  const qs = new URLSearchParams({ shop: storeId });
  if (websiteUrl && websiteUrl.trim()) qs.set("websiteUrl", websiteUrl.trim());
  const res = await fetch(`${SHOPIFY_APP_URL}/api/sync?${qs.toString()}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Sync failed (HTTP ${res.status})`);
  return res.json();
}

// Ask the Analytics Service whether real (synced) data exists for this store.
export async function fetchStatus(storeId) {
  const res = await fetch(
    `${ANALYTICS_URL}/api/analytics/status?storeId=${encodeURIComponent(storeId)}`
  );
  if (!res.ok) throw new Error(`Status failed (HTTP ${res.status})`);
  return res.json();
}

// ─── Analytics Service — dashboard overview ─────────────────────────────────
// Small helper so each analytics fetcher below stays a one-liner.
async function getAnalytics(path, storeId) {
  const res = await fetch(
    `${ANALYTICS_URL}${path}?storeId=${encodeURIComponent(storeId)}`
  );
  if (!res.ok) throw new Error(`Analytics service returned ${res.status}`);
  return res.json();
}

export const fetchAnalyticsOverview = (storeId) =>
  getAnalytics("/api/analytics/overview", storeId);
export const fetchAnalyticsTraffic = (storeId) =>
  getAnalytics("/api/analytics/traffic", storeId);
export const fetchAnalyticsDevices = (storeId) =>
  getAnalytics("/api/analytics/devices", storeId);
export const fetchAnalyticsPages = (storeId) =>
  getAnalytics("/api/analytics/pages", storeId);
export const fetchAnalyticsFunnel = (storeId) =>
  getAnalytics("/api/analytics/funnel", storeId);
export const fetchAnalyticsReport = (storeId) =>
  getAnalytics("/api/analytics/report", storeId);

// Pull the full dashboard picture in one go: overview, traffic, devices and
// funnel are fetched in parallel. Any single failure doesn't sink the rest —
// each section renders independently once its own promise resolves.
export async function fetchAnalyticsDashboard(storeId) {
  const [overview, traffic, devices, funnel] = await Promise.all([
    fetchAnalyticsOverview(storeId),
    fetchAnalyticsTraffic(storeId),
    fetchAnalyticsDevices(storeId),
    fetchAnalyticsFunnel(storeId),
  ]);
  return { overview, traffic, devices, funnel };
}

// The Generate Flow: ask the AI Service to pull analytics for this store and
// produce suggestions. Returns { suggestions, meta, source }.
// Falls back to the embedded demo dataset if the service is unreachable.
export async function generateSuggestions(storeId, { mock = false, mode = "comprehensive" } = {}) {
  try {
    const qs = new URLSearchParams({ storeId });
    if (mock) qs.set("mock", "true");
    const res = await fetch(`${AI_URL}/report/generate?${qs.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, mode }),
    });
    if (!res.ok) throw new Error(`AI service returned ${res.status}`);
    const data = await res.json();
    return {
      suggestions: mergeSuggestions(data.report, data.analysis),
      meta: data.meta,
      source: (data.report && data.report.dataSource) || "ai",
    };
  } catch (err) {
    // Graceful fallback so the dashboard always has something to show.
    const { report, analysis, meta } = MOCK_GENERATE_RESPONSE;
    return {
      suggestions: mergeSuggestions(report, analysis),
      meta,
      source: "demo",
      warning: err.message,
    };
  }
}

// Ask the AI service for a full, focused code patch for a single suggestion.
// Returns the new codePatch object. Throws if the service is unreachable.
export async function generateFullCode(item) {
  const res = await fetch(`${AI_URL}/code/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item }),
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      detail = (await res.json()).error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  const data = await res.json();
  return data.codePatch;
}

// Best-effort mirror of an accept/reject back to the AI service. The Review
// Hub's source of truth is localStorage, so failures here are ignored.
export async function recordResponse(storeId, suggestionId, action, title) {
  try {
    await fetch(`${AI_URL}/suggestions/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, suggestionId, action, title }),
    });
  } catch {
    /* non-fatal */
  }
}
