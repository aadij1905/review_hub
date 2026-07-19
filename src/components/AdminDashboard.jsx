import { useCallback, useEffect, useMemo, useState } from "react";
import SuggestionCard from "./SuggestionCard";
import Onboarding from "./Onboarding";
import Analytics from "./Analytics";
import { useToast } from "./Toast";
import { generateSuggestions, syncStore, waitForCrawl, recordResponse, fetchStatus, checkInstalled, generateFullCode } from "../lib/api";
import {
  upsertSuggestions,
  setStatus,
  setActiveStore,
  clearStore,
  getStoreWebsite,
  setStoreWebsite,
  getStorePassword,
  setStorePassword,
  updateItem,
} from "../lib/store";

import { IconGear, IconSparkle, IconListChecks, IconClock, IconCheckCircle, IconXCircle } from "./Icons";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminDashboard({ storeId, setStoreId, reviewState, reload, section }) {
  const push = useToast();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [mode, setMode] = useState("comprehensive");
  const [websiteUrl, setWebsiteUrl] = useState(() => getStoreWebsite(storeId));
  const [storePassword, setStorePasswordState] = useState(() => getStorePassword(storeId));
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  // null = still checking; true/false once we know whether this store has
  // ever been synced with real data. Gates Onboarding vs. the normal tabs.
  const [hasRealData, setHasRealData] = useState(null);

  // Reload the saved storefront URL/password when the active store changes.
  useEffect(() => {
    setWebsiteUrl(getStoreWebsite(storeId));
    setStorePasswordState(getStorePassword(storeId));
  }, [storeId]);

  // Gate on both "has this store ever synced real data" AND "is the
  // extractor app still installed" — a merchant can uninstall the app after
  // syncing, which leaves the Analytics Service's cache intact but should
  // still send the PO back through onboarding to reinstall.
  //
  // `silent` skips the "Checking store status…" flash for background
  // rechecks (e.g. tab regaining focus) — it only touches state if it
  // actually finds the store no longer qualifies, so a healthy store stays
  // put instead of blanking the dashboard on every alt-tab.
  const checkStoreStatus = useCallback((id, { cancelledRef, silent = false }) => {
    if (!silent) setHasRealData(null);
    Promise.all([
      fetchStatus(id).then((s) => s.dataSource === "shopify").catch(() => false),
      checkInstalled(id),
    ]).then(([synced, installed]) => {
      if (cancelledRef.current) return;
      const ok = synced && installed !== false;
      if (!silent || !ok) setHasRealData(ok);
    });
  }, []);

  useEffect(() => {
    if (!storeId) {
      setHasRealData(false);
      return;
    }
    const cancelledRef = { current: false };
    checkStoreStatus(storeId, { cancelledRef });
    return () => { cancelledRef.current = true; };
  }, [storeId, checkStoreStatus]);

  // Uninstalling the extractor app happens outside this tab (in the Shopify
  // admin), so re-check install status whenever the PO comes back to it —
  // otherwise a stale "installed" reading could linger for the whole session.
  useEffect(() => {
    if (!storeId) return;
    const cancelledRef = { current: false };
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      checkStoreStatus(storeId, { cancelledRef, silent: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelledRef.current = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [storeId, checkStoreStatus]);

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
          setHasRealData(true);
          push("Store synced — crawling storefront for screenshots…", "info");
          // syncStore() only confirms the crawl was triggered, not that it
          // finished — generate would otherwise run against the pre-crawl
          // snapshot and silently skip screenshots (see waitForCrawl in api.js).
          const crawlResult = await waitForCrawl(storeId);
          if (crawlResult === "failed") {
            push("Crawler failed — generating from ShopifyQL data only", "info");
          } else if (crawlResult === "timeout") {
            push("Crawler still running after 3 min — generating from data available so far", "info");
          }
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

  function saveStoreSettings() {
    setStoreWebsite(storeId, websiteUrl);
    setStorePassword(storeId, storePassword);
  }

  function resetReview() {
    if (!confirm("Clear all suggestions and their approve/reject status for this store?")) return;
    clearStore(storeId);
    reload();
    setHasRealData(false);
    push("Review state cleared — reconnect your store to generate a fresh set", "info");
  }

  function respond(item, status) {
    setStatus(storeId, item.id, status);
    if (status === "accepted" || status === "rejected") {
      recordResponse(storeId, item.id, status === "accepted" ? "accept" : "reject", item.title);
    }
    reload();

    // Kick off real code generation immediately on accept — real theme code,
    // live screenshot, and a visual-change note are already there by the
    // time a developer opens Dev View, instead of requiring a manual click.
    // Not awaited: the accept action itself shouldn't block on this. Skipped
    // if this item was already fully generated (e.g. re-accepting after a
    // reject) to avoid wasteful regeneration.
    if (status === "accepted" && !item.codeExpanded) {
      updateItem(storeId, item.id, { codeGenerating: true });
      reload();
      generateFullCode(item, storeId)
        .then(({ codePatch, screenshot, visualChangeNote }) => {
          updateItem(storeId, item.id, {
            codePatch,
            codeScreenshot: screenshot,
            codeVisualChangeNote: visualChangeNote,
            codeExpanded: true,
            codeGenerating: false,
          });
          reload();
        })
        .catch((err) => {
          console.warn(`[auto-codegen] failed for "${item.title}":`, err.message);
          updateItem(storeId, item.id, { codeGenerating: false });
          push(`Code generation failed for "${item.title}" — retry from Dev View`, "error");
          reload();
        });
    }
  }

  const hasSuggestions = items.length > 0;

  if (hasRealData === null) {
    return (
      <div className="main">
        <div className="empty">Checking store status…</div>
      </div>
    );
  }

  if (!hasRealData) {
    return (
      <div className="main">
        <div className="page-head">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-sub">Connect your store to get started</p>
          </div>
        </div>
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
      </div>
    );
  }

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-sub">
            {section === "analytics" ? "Store performance and detected issues" : "Review and manage AI-generated suggestions"}
            {reviewState?.source && (
              <span className="source-tag">
                · store: {storeId} · source: {reviewState.source}
              </span>
            )}
          </p>
        </div>
        <div className="head-actions">
          <button
            className="btn-secondary"
            onClick={() => setShowStoreSettings((v) => !v)}
          >
            <IconGear className="icon icon-sm" /> Store settings
          </button>
          {section === "suggestions" && (
            <>
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
                <button className="btn-clear" onClick={resetReview} disabled={busy}>
                  Clear review state
                </button>
              )}
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
                  <><IconSparkle className="icon icon-sm" /> Generate Suggestions</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {showStoreSettings && (
        <div className="chart-card" style={{ marginBottom: 16 }}>
          <div className="chart-title">Store settings</div>
          <p className="step-desc">
            Storefront URL and password used by the crawler — editable any time, not just during onboarding.
          </p>
          <div className="store-input">
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value.trim())}
              placeholder="Leave blank to use your Shopify storefront"
            />
          </div>
          <div className="store-input">
            <input
              type="password"
              value={storePassword}
              onChange={(e) => setStorePasswordState(e.target.value)}
              placeholder="Leave blank if your store is public"
              autoComplete="off"
            />
          </div>
          <div className="store-input">
            <button
              className="btn-secondary"
              onClick={() => {
                saveStoreSettings();
                push("Store settings saved", "success");
              }}
            >
              Save
            </button>
            <button
              className="btn-generate"
              disabled={busy}
              onClick={() => {
                saveStoreSettings();
                setShowStoreSettings(false);
                runGenerate({ withSync: true });
              }}
            >
              Save &amp; Sync Now
            </button>
          </div>
        </div>
      )}

      {section === "analytics" ? (
        <Analytics storeId={storeId} />
      ) : !hasSuggestions ? (
        <div className="empty">
          <h2>No suggestions yet</h2>
          <p>Generate AI-powered suggestions from this store's synced analytics data.</p>
          <button className="btn-generate" onClick={() => runGenerate({ withSync: true })} disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" /> Generating…
              </>
            ) : (
              <><IconSparkle className="icon icon-sm" /> Generate Suggestions</>
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-head">
                <span className="stat-chip chip-total"><IconListChecks className="icon" /></span>
                <div className="stat-label">TOTAL</div>
              </div>
              <div className="stat-value v-total">{counts.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-head">
                <span className="stat-chip chip-pending"><IconClock className="icon" /></span>
                <div className="stat-label">PENDING</div>
              </div>
              <div className="stat-value v-pending">{counts.pending}</div>
            </div>
            <div className="stat-card">
              <div className="stat-head">
                <span className="stat-chip chip-approved"><IconCheckCircle className="icon" /></span>
                <div className="stat-label">APPROVED</div>
              </div>
              <div className="stat-value v-approved">{counts.accepted}</div>
            </div>
            <div className="stat-card">
              <div className="stat-head">
                <span className="stat-chip chip-rejected"><IconXCircle className="icon" /></span>
                <div className="stat-label">REJECTED</div>
              </div>
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
