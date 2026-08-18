import { AI_URL, ANALYTICS_URL, SHOPIFY_APP_URL } from "./config";
import { MOCK_GENERATE_RESPONSE } from "./mockData";

// Merge the AI service's owner-facing `report.problems` with the dev-facing
// `analysis` (which carries effort, issue, recommendation, codePatch) by id.
export function mergeSuggestions(report, analysis) {
  const byId = Object.fromEntries((analysis || []).map((a) => [a.id, a]));
  const problems = (report && report.problems) || [];
  return problems.map((p) => ({ ...p, ...(byId[p.id] || {}) }));
}

// Best-effort: ask the shopify-pp service to extract + ingest fresh data.
// This may fail (service not running, or CORS — shopify-pp has no CORS
// middleware); callers should treat failure as non-fatal and proceed.
// storePassword (if the store isn't public yet) travels in the body, not
// the query string, so it doesn't end up in access/proxy logs.
export async function syncStore(storeId, websiteUrl, storePassword) {
  const qs = new URLSearchParams({ shop: storeId });
  if (websiteUrl && websiteUrl.trim()) qs.set("websiteUrl", websiteUrl.trim());
  const res = await fetch(`${SHOPIFY_APP_URL}/api/sync?${qs.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storePassword: storePassword && storePassword.trim() ? storePassword.trim() : null }),
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

// Ask the extractor app whether it's still installed on this shop. The
// app/uninstalled webhook deletes the shop's row immediately, so /api/shop
// 404s the moment a merchant uninstalls — even though the Analytics
// Service's cached data (and thus fetchStatus's dataSource) survives. Returns
// null (not false) on a network/service failure so a down tunnel isn't
// mistaken for an uninstall.
export async function checkInstalled(storeId) {
  try {
    const res = await fetch(`${SHOPIFY_APP_URL}/api/shop?shop=${encodeURIComponent(storeId)}`);
    if (res.status === 404) return false;
    if (!res.ok) return null;
    return true;
  } catch {
    return null;
  }
}

// syncStore() only waits for the crawl to be *triggered*, not finished
// (the Analytics Service responds immediately and crawls asynchronously —
// see ingest.js). Calling /report/generate before the crawl completes reads
// the pre-crawl snapshot: no screenshotUrl/crawlerEnriched, so no images
// ever reach the AI service's vision path. Poll crawlerStatus until it's
// no longer "running" (or we give up) so generate always sees crawled data
// when a crawl was triggered.
export async function waitForCrawl(storeId, { timeoutMs = 180000, intervalMs = 2000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await fetchStatus(storeId).catch(() => null);
    const crawlerStatus = status?.crawlerStatus;
    if (crawlerStatus !== "running") return crawlerStatus || null;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return "timeout";
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
// Returns { codePatch, screenshot, visualChangeNote } — screenshot is the
// crawler's live "before" shot of the affected page (null if it wasn't
// crawled), and visualChangeNote describes what the patch will visibly
// change in that screenshot (null for manual changes or when unavailable).
// Throws if the service is unreachable.
export async function generateFullCode(item, storeId) {
  const res = await fetch(`${AI_URL}/code/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item, storeId }),
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
  return {
    codePatch: data.codePatch,
    screenshot: data.screenshot || null,
    visualChangeNote: data.visualChangeNote || null,
  };
}

// Pull the full analytics picture for a store: overview, traffic, devices,
// pages, and funnel, fetched in parallel. Skips the Analytics Service's
// /report endpoint since it just re-bundles the same normalized data these
// five section endpoints already expose.
export async function fetchAnalytics(storeId) {
  const qs = `storeId=${encodeURIComponent(storeId)}`;
  const get = async (path) => {
    const res = await fetch(`${ANALYTICS_URL}${path}?${qs}`);
    if (!res.ok) throw new Error(`${path} failed (HTTP ${res.status})`);
    return res.json();
  };
  const [overview, traffic, devices, pages, funnel] = await Promise.all([
    get("/api/analytics/overview"),
    get("/api/analytics/traffic"),
    get("/api/analytics/devices"),
    get("/api/analytics/pages"),
    get("/api/analytics/funnel"),
  ]);

  // Each section endpoint returns its own flags subset; some flag types
  // (e.g. high_cart_abandonment) are echoed by more than one section, so
  // de-dupe by type+path/source when merging into a single issues list.
  const seen = new Set();
  const flags = [];
  for (const f of [...overview.flags, ...traffic.flags, ...devices.flags, ...pages.flags, ...funnel.flags]) {
    const key = `${f.type}:${f.path || f.source || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    flags.push(f);
  }

  return {
    storeId,
    dataSource: overview.dataSource,
    ingestedAt: overview.ingestedAt,
    period: overview.period,
    overview: overview.overview,
    dailyOverview: overview.dailyOverview,
    dailySales: overview.dailySales,
    traffic: traffic.traffic,
    devices: devices.devices,
    pages: pages.pages,
    funnel: funnel.funnel,
    flags,
  };
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
