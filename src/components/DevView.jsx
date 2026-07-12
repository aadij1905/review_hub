import DevCard from "./DevCard";
import { setDevProgress, updateItem } from "../lib/store";
import { generateFullCode } from "../lib/api";

// Developer dashboard: only the suggestions the PO has approved, each with its
// technical detail, code patch, and an implementation tracker.
export default function DevView({ storeId, reviewState, reload }) {
  const accepted = (reviewState?.items || []).filter((i) => i.status === "accepted");

  const done = accepted.filter((i) => i.devStatus === "done").length;

  function handleProgress(item, patch) {
    setDevProgress(storeId, item.id, patch);
    reload && reload();
  }

  // Fetch a full code patch for one suggestion and persist it. Returns the
  // patch (or throws) so the card can show loading/error state.
  async function handleGenerateCode(item) {
    const patch = await generateFullCode(item, storeId);
    updateItem(storeId, item.id, { codePatch: patch, codeExpanded: true });
    reload && reload();
    return patch;
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
        accepted.map((item) => (
          <DevCard
            key={item.id}
            item={item}
            onProgress={handleProgress}
            onGenerateCode={handleGenerateCode}
          />
        ))
      )}
    </div>
  );
}
