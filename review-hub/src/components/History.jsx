import { useState } from "react";
import { loadHistory, countStatuses } from "../lib/store";
import { devStatusLabel, formatDate } from "../lib/ui";
import { IconCheck, IconX, IconChevron, IconBolt } from "./Icons";

// Report run history for the active store. The current run is shown first,
// followed by archived past runs. Each run is expandable to a read-only list of
// its suggestions with the PO decision and developer progress at that time.
export default function History({ storeId, reviewState }) {
  const past = loadHistory(storeId);
  const [open, setOpen] = useState(null);

  const runs = [];
  if (reviewState?.items?.length) {
    runs.push({
      ...reviewState,
      counts: countStatuses(reviewState.items),
      current: true,
    });
  }
  for (const h of past) runs.push(h);

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-sub">
            Past generation runs and their outcomes
            {storeId && <span className="source-tag">· store: {storeId}</span>}
          </p>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="empty">
          <h2>No history yet</h2>
          <p>Once you generate suggestions, each run is recorded here with its outcome.</p>
        </div>
      ) : (
        runs.map((run, idx) => {
          const key = `${run.generatedAt}-${idx}`;
          const isOpen = open === key;
          const c = run.counts;
          return (
            <div className="card history-card" key={key}>
              <div className="history-head" onClick={() => setOpen(isOpen ? null : key)}>
                <div>
                  <div className="history-title">
                    {formatDate(run.generatedAt)}
                    {run.current && <span className="badge badge-cat" style={{ marginLeft: 8 }}>current</span>}
                    <span className="source-tag">· source: {run.source}</span>
                  </div>
                  <div className="history-counts">
                    <span>{c.total} suggestions</span>
                    <span className="count-approved"><IconCheck className="icon icon-sm" /> {c.accepted} approved</span>
                    <span className="count-rejected"><IconX className="icon icon-sm" /> {c.rejected} rejected</span>
                    {c.pending > 0 && <span className="count-pending">• {c.pending} pending</span>}
                    <span className="count-done"><IconBolt className="icon icon-sm" /> {c.done} implemented</span>
                  </div>
                </div>
                <span className={`chev ${isOpen ? "open" : ""}`}><IconChevron className="icon icon-sm" /></span>
              </div>

              {isOpen && (
                <div className="history-body">
                  {run.items.map((it) => (
                    <div className="history-item" key={it.id}>
                      <span className={`hi-status hi-${it.status}`}>
                        {it.status === "accepted" ? <IconCheck className="icon icon-sm" /> : it.status === "rejected" ? <IconX className="icon icon-sm" /> : "•"}
                      </span>
                      <div className="hi-main">
                        <div className="hi-title">{it.title}</div>
                        {it.status === "accepted" && (
                          <div className="hi-dev">
                            Dev: {devStatusLabel(it.devStatus)}
                            {it.devRemark && <span className="hi-remark"> — “{it.devRemark}”</span>}
                          </div>
                        )}
                      </div>
                      {it.category && <span className="badge badge-cat">{it.category}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
