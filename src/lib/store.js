// localStorage-backed persistence.
//
//   reviewhub:stores               → [ { storeId, addedAt } ]         (registry)
//   reviewhub:activeStore          → storeId                          (current selection)
//   reviewhub:store:<storeId>      → { storeId, generatedAt, meta, source, items: [...] }
//   reviewhub:history:<storeId>    → [ { generatedAt, source, meta, counts, items } ]  (past runs)
//
// Each item carries BOTH the PO review status and the developer implementation
// progress:
//   status    ∈ "pending" | "accepted" | "rejected"      (PO decision)
//   devStatus ∈ "todo" | "in_progress" | "done"          (developer progress)
//   devRemark  string                                    (developer note)

const KEY = (storeId) => `reviewhub:store:${storeId}`;
const HISTORY_KEY = (storeId) => `reviewhub:history:${storeId}`;
const ACTIVE_KEY = "reviewhub:activeStore";
const STORES_KEY = "reviewhub:stores";
const HISTORY_LIMIT = 12;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ── Store registry ───────────────────────────────────────────────────────────
export function listStores() {
  return read(STORES_KEY, []);
}

export function addStore(storeId) {
  if (!storeId) return listStores();
  const stores = listStores();
  if (!stores.some((s) => s.storeId === storeId)) {
    stores.push({ storeId, addedAt: new Date().toISOString() });
    localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  }
  return stores;
}

export function removeStore(storeId) {
  const stores = listStores().filter((s) => s.storeId !== storeId);
  localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  localStorage.removeItem(KEY(storeId));
  localStorage.removeItem(HISTORY_KEY(storeId));
  return stores;
}

// Optional storefront URL per store — used to drive the Analytics crawler.
export function getStoreWebsite(storeId) {
  return localStorage.getItem(`reviewhub:website:${storeId}`) || "";
}

export function setStoreWebsite(storeId, url) {
  if (url) localStorage.setItem(`reviewhub:website:${storeId}`, url);
  else localStorage.removeItem(`reviewhub:website:${storeId}`);
}

// Optional storefront password per store — only needed for stores not yet
// public (Settings > Online Store > Preferences). Passed through to the
// Analytics Service's crawler so it can get past the /password wall.
export function getStorePassword(storeId) {
  return localStorage.getItem(`reviewhub:password:${storeId}`) || "";
}

export function setStorePassword(storeId, password) {
  if (password) localStorage.setItem(`reviewhub:password:${storeId}`, password);
  else localStorage.removeItem(`reviewhub:password:${storeId}`);
}

export function getActiveStore() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActiveStore(storeId) {
  if (storeId) localStorage.setItem(ACTIVE_KEY, storeId);
}

// ── Current review state ─────────────────────────────────────────────────────
export function loadStore(storeId) {
  return read(KEY(storeId), null);
}

export function saveStore(state) {
  localStorage.setItem(KEY(state.storeId), JSON.stringify(state));
}

export function countStatuses(items) {
  return {
    total: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    accepted: items.filter((i) => i.status === "accepted").length,
    rejected: items.filter((i) => i.status === "rejected").length,
    done: items.filter((i) => i.status === "accepted" && i.devStatus === "done").length,
  };
}

// Merge a freshly generated batch, preserving prior PO decisions AND developer
// progress for suggestions that carry over. The previous run is archived to
// history first, so nothing is lost.
export function upsertSuggestions(storeId, suggestions, meta, source) {
  const prev = loadStore(storeId);
  const prevById = {};
  if (prev) for (const it of prev.items) prevById[it.id] = it;

  if (prev && prev.items.length) {
    pushHistory(storeId, {
      generatedAt: prev.generatedAt,
      source: prev.source,
      meta: prev.meta,
      counts: countStatuses(prev.items),
      items: prev.items,
    });
  }

  const items = suggestions.map((s) => {
    const old = prevById[s.id];
    return {
      ...s,
      status: old?.status || "pending",
      devStatus: old?.devStatus || "todo",
      devRemark: old?.devRemark || "",
      devUpdatedAt: old?.devUpdatedAt || null,
    };
  });

  const state = {
    storeId,
    generatedAt: new Date().toISOString(),
    meta: meta || null,
    source: source || "ai",
    items,
  };
  saveStore(state);
  addStore(storeId);
  return state;
}

export function setStatus(storeId, suggestionId, status) {
  const state = loadStore(storeId);
  if (!state) return null;
  const item = state.items.find((i) => i.id === suggestionId);
  if (item) item.status = status;
  saveStore(state);
  return state;
}

// Developer updates implementation progress / remark on an accepted suggestion.
export function setDevProgress(storeId, suggestionId, patch) {
  const state = loadStore(storeId);
  if (!state) return null;
  const item = state.items.find((i) => i.id === suggestionId);
  if (item) Object.assign(item, patch, { devUpdatedAt: new Date().toISOString() });
  saveStore(state);
  return state;
}

// Patch arbitrary fields on an item (e.g. an expanded codePatch) without
// touching dev-progress timestamps.
export function updateItem(storeId, suggestionId, patch) {
  const state = loadStore(storeId);
  if (!state) return null;
  const item = state.items.find((i) => i.id === suggestionId);
  if (item) Object.assign(item, patch);
  saveStore(state);
  return state;
}

export function clearStore(storeId) {
  localStorage.removeItem(KEY(storeId));
}

// ── History ──────────────────────────────────────────────────────────────────
export function loadHistory(storeId) {
  return read(HISTORY_KEY(storeId), []);
}

function pushHistory(storeId, snapshot) {
  const hist = loadHistory(storeId);
  hist.unshift(snapshot);
  localStorage.setItem(HISTORY_KEY(storeId), JSON.stringify(hist.slice(0, HISTORY_LIMIT)));
}
