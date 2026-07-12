import { useEffect, useMemo, useState } from "react";
import SuggestionCard from "./SuggestionCard";
import Onboarding from "./Onboarding";
import { useToast } from "./Toast";
import { generateSuggestions, syncStore, recordResponse } from "../lib/api";
import {
  upsertSuggestions,
  setStatus,
  setActiveStore,
  clearStore,
  getStoreWebsite,
  setStoreWebsite,
  getStorePassword,
  setStorePassword,
} from "../lib/store";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminDashboard({ storeId, setStoreId, reviewState, reload }) {
  const push = useToast();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("comprehensive");
  const [websiteUrl, setWebsiteUrl] = useState(() => getStoreWebsite(storeId));
  const [storePassword, setStorePasswordState] = useState(() => getStorePassword(storeId));

  // Reload the saved storefront URL/password when the active store changes.
  useEffect(() => {
    setWebsiteUrl(getStoreWebsite(storeId));
    setStorePasswordState(getStorePassword(storeId));
  }, [storeId]);

  const items = reviewState?.items || [];
  const counts = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      accepted: items.filter((i) => i.status === "accepted").length,
      rejected: items.filter((i) => i.status === "rejected").length,
    };
  }, [items]);

  const visible = items.filter((i) => filter === "all" || i.status === filter);

  async function runGenerate({ withSync }) {
    if (!storeId) {
      push("Enter your store domain first", "error");
      return;
    }
    setBusy(true);
    setActiveStore(storeId);
    setStoreWebsite(storeId, websiteUrl);
    setStorePassword(storeId, storePassword);
    try {
      if (withSync) {
        try {
          await syncStore(storeId, websiteUrl, storePassword);
          push("Store synced — data extracted", "success");
        } catch {
          // shopify-pp may be offline / CORS-blocked; proceed with whatever
          // the analytics service already has (or demo data).
          push("Live sync unavailable — generating from available data", "info");
        }
      }

      const { suggestions, meta, source, warning } = await generateSuggestions(storeId, { mode });
      if (!suggestions.length) {
        push("No suggestions returned", "error");
        return;
      }
      upsertSuggestions(storeId, suggestions, meta, source);
      reload();
      if (source === "demo") {
        push(`Loaded ${suggestions.length} demo suggestions (services offline)`, "info");
      } else {
        push(`Generated ${suggestions.length} suggestions`, "success");
      }
      if (warning) console.warn("[generate]", warning);
    } catch (err) {
      push(`Generation failed: ${err.message}`, "error");
    } finally {
      setBusy(false);
    }
  }

  function resetReview() {
    if (!confirm("Clear all suggestions and their approve/reject status for this store?")) return;
    clearStore(storeId);
    reload();
    push("Review state cleared — generate a fresh set", "info");
  }

  function respond(item, status) {
    setStatus(storeId, item.id, status);
    if (status === "accepted" || status === "rejected") {
      recordResponse(storeId, item.id, status === "accepted" ? "accept" : "reject", item.title);
    }
    reload();
  }

  const hasSuggestions = items.length > 0;

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-sub">
            Review and manage AI-generated suggestions
            {reviewState?.source && (
              <span className="source-tag">
                · store: {storeId} · source: {reviewState.source}
              </span>
            )}
          </p>
        </div>
        <div className="head-actions">
          <div className="mode-toggle" title="Quick: 3 top fixes · Comprehensive: 20–25 detailed suggestions">
            <button
              className={`mode-btn ${mode === "quick" ? "mode-active" : ""}`}
              onClick={() => setMode("quick")}
              disabled={busy}
            >
              Quick
            </button>
            <button
              className={`mode-btn ${mode === "comprehensive" ? "mode-active" : ""}`}
              onClick={() => setMode("comprehensive")}
              disabled={busy}
            >
              Comprehensive
            </button>
          </div>
          {hasSuggestions && (
            <>
              <button className="btn-clear" onClick={resetReview} disabled={busy}>
                Clear review state
              </button>
              <button
                className="btn-generate"
                onClick={() => runGenerate({ withSync: true })}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <span className="spinner" /> Generating…
                  </>
                ) : (
                  <>🤖 Generate Suggestions</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {!hasSuggestions ? (
        <Onboarding
          storeId={storeId}
          setStoreId={setStoreId}
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          storePassword={storePassword}
          setStorePassword={setStorePasswordState}
          onSync={() => runGenerate({ withSync: true })}
          syncing={busy}
        />
      ) : (
        <>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-label">TOTAL</div>
              <div className="stat-value v-total">{counts.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">PENDING</div>
              <div className="stat-value v-pending">{counts.pending}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">APPROVED</div>
              <div className="stat-value v-approved">{counts.accepted}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">REJECTED</div>
              <div className="stat-value v-rejected">{counts.rejected}</div>
            </div>
          </div>

          <div className="tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`tab ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} ({f.key === "all" ? counts.total : counts[f.key]})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="no-results">No {filter !== "all" ? filter : ""} suggestions.</div>
          ) : (
            visible.map((item) => (
              <SuggestionCard
                key={item.id}
                item={item}
                onAccept={(i) => respond(i, "accepted")}
                onReject={(i) => respond(i, "rejected")}
                onReset={(i) => respond(i, "pending")}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
