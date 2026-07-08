import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { DEV_STATUSES, devStatusLabel, formatDate } from "../lib/ui";

// Developer-facing card: technical issue, recommendation, and the code patch.
// Only rendered for suggestions the PO has accepted. Developers can mark
// implementation progress and leave a remark; in admin preview it's read-only.
export default function DevCard({ item, onProgress, onGenerateCode, readOnly }) {
  const patch = item.codePatch || {};
  const hasCode = patch.code && patch.type !== "manual";
  const push = useToast();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [remark, setRemark] = useState(item.devRemark || "");

  useEffect(() => setRemark(item.devRemark || ""), [item.id, item.devRemark]);

  const devStatus = item.devStatus || "todo";
  const remarkDirty = remark !== (item.devRemark || "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(patch.code);
      setCopied(true);
      push("Code copied to clipboard", "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      push("Couldn't copy — select the code manually", "error");
    }
  }

  function setStatus(key) {
    onProgress(item, { devStatus: key });
    push(`Marked "${item.title}" as ${devStatusLabel(key)}`, "success");
  }

  function saveRemark() {
    onProgress(item, { devRemark: remark.trim() });
    push("Remark saved", "success");
  }

  async function generateCode() {
    if (!onGenerateCode) return;
    setGenerating(true);
    try {
      await onGenerateCode(item);
      push("Full code generated", "success");
    } catch (err) {
      push(`Code generation failed: ${err.message}`, "error");
    } finally {
      setGenerating(false);
    }
  }

  const genButton = !readOnly && (
    <button className="gen-code-btn" onClick={generateCode} disabled={generating}>
      {generating ? (
        <>
          <span className="spinner spinner-dark" /> Generating…
        </>
      ) : (
        <>⚡ {hasCode ? "Generate full code" : "Generate code"}</>
      )}
    </button>
  );

  return (
    <div className="card">
      <div className="card-top">
        <h3 className="card-title">{item.title}</h3>
        <div className="badges">
          {item.category && <span className="badge badge-cat">{item.category}</span>}
          {item.effort && <span className="badge badge-effort">{item.effort} effort</span>}
        </div>
      </div>

      {item.affectedPage && (
        <div className="card-meta">
          <span className="card-file">📁 {item.affectedPage}</span>
        </div>
      )}

      <div className="disclosure-panel" style={{ marginTop: 12 }}>
        <div className="kv">
          <span className="k">Issue</span>
          {item.issue || item.problem}
        </div>
        <div className="kv">
          <span className="k">Recommendation</span>
          {item.recommendation || item.suggestion}
        </div>
        {item.impactEstimate && (
          <div className="kv">
            <span className="k">Impact</span>
            {item.impactEstimate}
          </div>
        )}
        {item.dataSource && (
          <div className="kv">
            <span className="k">Data source</span>
            <code style={{ fontSize: 12 }}>{item.dataSource}</code>
          </div>
        )}
      </div>

      {hasCode ? (
        <>
          <div className="code-head">
            <div>
              <span className="code-file">{patch.file || "patch"}</span>
              {patch.type && <span className="code-type">{patch.type}</span>}
              {item.codeExpanded && <span className="code-type code-expanded">full</span>}
            </div>
            <div className="code-head-actions">
              {genButton}
              <button className="copy-btn" onClick={copy}>
                {copied ? "✓ Copied" : "Copy code"}
              </button>
            </div>
          </div>
          <pre className="code">{patch.code}</pre>
          {patch.instructions && (
            <div className="manual-note" style={{ marginTop: 8 }}>
              <strong>How to apply:</strong> {patch.instructions}
            </div>
          )}
          {patch.notes && (
            <div className="code-notes">
              <strong>Notes:</strong> {patch.notes}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="manual-note">
            <strong>Manual change —</strong>{" "}
            {patch.instructions ||
              "No code patch applies; this requires a manual review/change."}
          </div>
          {genButton && <div className="manual-gen">{genButton}</div>}
        </>
      )}

      {/* Developer progress tracker */}
      <div className="dev-track">
        <div className="dev-track-row">
          <span className="dev-track-label">Implementation</span>
          {readOnly ? (
            <span className={`dev-pill dev-pill-${devStatus}`}>{devStatusLabel(devStatus)}</span>
          ) : (
            <div className="seg">
              {DEV_STATUSES.map((s) => (
                <button
                  key={s.key}
                  className={`seg-btn ${devStatus === s.key ? `seg-active seg-${s.key}` : ""}`}
                  onClick={() => setStatus(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {item.devUpdatedAt && (
            <span className="dev-updated">updated {formatDate(item.devUpdatedAt)}</span>
          )}
        </div>

        {readOnly ? (
          item.devRemark ? <div className="dev-remark">“{item.devRemark}”</div> : null
        ) : (
          <div className="remark-row">
            <textarea
              className="remark-input"
              placeholder="Add a remark for the PO (blockers, notes, links)…"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
            />
            <button className="btn-secondary" onClick={saveRemark} disabled={!remarkDirty}>
              Save remark
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
