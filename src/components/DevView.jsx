import { useMemo, useState } from "react";
import DevCard from "./DevCard";
import { setDevProgress, updateItem } from "../lib/store";
import { generateFullCode } from "../lib/api";
import { DEV_STATUSES } from "../lib/ui";

const DEV_FILTERS = [{ key: "all", label: "All" }, ...DEV_STATUSES];

// Developer dashboard: only the suggestions the PO has approved, each with its
// technical detail, code patch, and an implementation tracker. Status counts
// and a filter live at the top so a dev can see what's to do / in progress /
// done — and who owns it — before scrolling through every card.
export default function DevView({ storeId, reviewState, reload }) {
  const [filter, setFilter] = useState("all");
  const accepted = (reviewState?.items || []).filter((i) => i.status === "accepted");

  const counts = useMemo(() => ({
    todo: accepted.filter((i) => (i.devStatus || "todo") === "todo").length,
    in_progress: accepted.filter((i) => i.devStatus === "in_progress").length,
    done: accepted.filter((i) => i.devStatus === "done").length,
  }), [accepted]);

  const done = counts.done;
  const visible = accepted.filter((i) => filter === "all" || (i.devStatus || "todo") === filter);

  function handleProgress(item, patch) {
    setDevProgress(storeId, item.id, patch);
    reload && reload();
  }

  // Fetch a full code patch for one suggestion and persist it, along with
  // the crawler's live screenshot of the page and a note on what visibly
  // changes. Returns the patch (or throws) so the card can show loading/error
  // state.
  async function handleGenerateCode(item) {
    const { codePatch, screenshot, visualChangeNote } = await generateFullCode(item, storeId);
    updateItem(storeId, item.id, {
      codePatch,
      codeScreenshot: screenshot,
      codeVisualChangeNote: visualChangeNote,
      codeExpanded: true,
    });
    reload && reload();
    return codePatch;
  }

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <h1 className="page-title">Developer Dashboard</h1>
          <p className="page-sub">
            Approved suggestions ready to implement, with code patches
            {storeId && <span className="source-tag">· store: {storeId}</span>}
            {accepted.length > 0 && (
              <span className="source-tag">· {done}/{accepted.length} done</span>
            )}
          </p>
        </div>
      </div>

      {accepted.length === 0 ? (
        <div className="empty">
          <h2>No approved suggestions yet</h2>
          <p>
            Once a Product Owner approves suggestions in the Admin Dashboard, they
            appear here with the code needed to implement them.
          </p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat-card">
              <div className="stat-label">TOTAL</div>
              <div className="stat-value v-total">{accepted.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">TO DO</div>
              <div className="stat-value v-todo">{counts.todo}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">IN PROGRESS</div>
              <div className="stat-value v-in_progress">{counts.in_progress}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">DONE</div>
              <div className="stat-value v-done">{counts.done}</div>
            </div>
          </div>

          <div className="tabs">
            {DEV_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`tab ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} ({f.key === "all" ? accepted.length : counts[f.key]})
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="no-results">No suggestions in this status.</div>
          ) : (
            visible.map((item) => (
              <DevCard
                key={item.id}
                item={item}
                onProgress={handleProgress}
                onGenerateCode={handleGenerateCode}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}
