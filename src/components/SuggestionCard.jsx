import { useState } from "react";
import { devStatusLabel, formatDate } from "../lib/ui";
import { IconFolder, IconChevron, IconCheck, IconX } from "./Icons";

// PO / Admin-facing card: shows the problem, the plain-English suggestion,
// impact and effort. Never renders code (that's the developer's view).
export default function SuggestionCard({ item, onAccept, onReject, onReset, readOnly }) {
  const [open, setOpen] = useState(false);
  const forecast = item.impactForecast;

  return (
    <div className="card">
      <div className="card-top">
        <h3 className="card-title">{item.title}</h3>
        <div className="badges">
          {item.category && <span className="badge badge-cat">{item.category}</span>}
          {item.confidence && <span className={`badge badge-conf-${item.confidence}`}>{item.confidence} confidence</span>}
          {item.effort && <span className="badge badge-effort">{item.effort} effort</span>}
        </div>
      </div>

      <p className="card-problem">{item.problem}</p>

      {item.affectedPage && (
        <div className="card-meta">
          <span className="card-file"><IconFolder className="icon icon-sm" /> {item.affectedPage}</span>
        </div>
      )}

      <div className="disclosure">
        <button
          className={`disclosure-btn ${open ? "open" : ""}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="chev"><IconChevron className="icon icon-sm" /></span> Why this helps
        </button>
        {open && (
          <div className="disclosure-panel">
            <div className="kv">
              <span className="k">Recommended action</span>
              {item.suggestion}
            </div>
            {forecast ? (
              <div className="kv">
                <span className="k">Estimated impact</span>
                <div className="forecast-detail">
                  <div className="forecast-detail-head">
                    <span className="forecast-detail-value">{forecast.headline}</span>
                    <span className="forecast-detail-delta">{forecast.deltaLabel}</span>
                  </div>
                  <div className="forecast-detail-basis">Based on {forecast.basis}</div>
                  {forecast.assumptions?.length > 0 && (
                    <ul className="forecast-assumptions">
                      {forecast.assumptions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  )}
                  <div className="forecast-note">Conservative model — a directional estimate, not a guarantee.</div>
                </div>
              </div>
            ) : (
              item.impactEstimate && (
                <div className="kv">
                  <span className="k">Expected impact</span>
                  {item.impactEstimate}
                </div>
              )
            )}
            {item.effort && (
              <div className="kv">
                <span className="k">Effort</span>
                {item.effort}
              </div>
            )}
          </div>
        )}
      </div>

      {!readOnly && item.status === "pending" && (
        <div className="card-actions">
          <button className="btn-approve" onClick={() => onAccept(item)}><IconCheck className="icon icon-sm" /> Approve</button>
          <button className="btn-reject" onClick={() => onReject(item)}><IconX className="icon icon-sm" /> Reject</button>
        </div>
      )}

      {!readOnly && item.status !== "pending" && (
        <div className="status-row">
          <span className={`status-pill status-${item.status}`}>
            {item.status === "accepted" ? <><IconCheck className="icon icon-sm" /> Approved</> : <><IconX className="icon icon-sm" /> Rejected</>}
          </span>
          <span className="status-actions">
            <button className="link-btn" onClick={() => onReset(item)}>Move back to pending</button>
          </span>
        </div>
      )}

      {item.status === "accepted" && (
        <div className={`dev-progress dev-${item.devStatus || "todo"}`}>
          <span className="dev-progress-head">
            <span className={`dev-dot dev-dot-${item.devStatus || "todo"}`} />
            Developer: <strong>{devStatusLabel(item.devStatus)}</strong>
            {item.devUpdatedAt && (
              <span className="dev-updated">· updated {formatDate(item.devUpdatedAt)}</span>
            )}
          </span>
          {item.devRemark && <div className="dev-remark">“{item.devRemark}”</div>}
        </div>
      )}
    </div>
  );
}
