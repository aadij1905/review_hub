import { installUrl } from "../lib/api";

// Shown to a PO before any suggestions exist for the connected store.
// Walks them through installing the extractor app and syncing to the dashboard.
export default function Onboarding({
  storeId,
  setStoreId,
  websiteUrl,
  setWebsiteUrl,
  onSync,
  syncing,
}) {
  return (
    <div className="empty">
      <h2>Connect your Shopify store</h2>
      <p>
        Install the Experience Intelligence extractor app on your store, then sync
        to pull your analytics. We normalize the data, capture page screenshots,
        and generate AI suggestions you can review below.
      </p>

      <div className="steps">
        <div className="step">
          <div className="step-num">1</div>
          <div className="step-body">
            <div className="step-title">Enter your store domain</div>
            <div className="step-desc">Your <code>*.myshopify.com</code> domain.</div>
            <div className="store-input">
              <input
                type="text"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value.trim())}
                placeholder="my-store.myshopify.com"
              />
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-num">2</div>
          <div className="step-body">
            <div className="step-title">Install the extractor app <span style={{ fontWeight: 400, color: "#9aa3b8" }}>· first-time only</span></div>
            <div className="step-desc">
              Authorize the app on your store so we can read your analytics.
              <strong> Already installed? Skip straight to step 3.</strong> (Install
              needs the public tunnel running; syncing does not.)
            </div>
            <div className="store-input">
              <a
                className="btn-secondary"
                href={installUrl(storeId)}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                Install Extractor App ↗
              </a>
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-num">3</div>
          <div className="step-body">
            <div className="step-title">
              Storefront URL{" "}
              <span style={{ fontWeight: 400, color: "#9aa3b8" }}>· optional</span>
            </div>
            <div className="step-desc">
              If provided, the crawler visits your top pages for CTA placement,
              social proof, and screenshots. Leave blank to skip crawling and use
              analytics only.
            </div>
            <div className="store-input">
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value.trim())}
                placeholder="https://my-store.com"
              />
            </div>
          </div>
        </div>

        <div className="step">
          <div className="step-num">4</div>
          <div className="step-body">
            <div className="step-title">Sync to dashboard</div>
            <div className="step-desc">
              Extract → normalize → {websiteUrl ? "crawl + screenshots → " : ""}AI.
              Generates your first set of suggestions.
            </div>
            <div className="store-input">
              <button
                className="btn-generate"
                onClick={onSync}
                disabled={syncing || !storeId}
              >
                {syncing ? (
                  <>
                    <span className="spinner" /> Syncing…
                  </>
                ) : (
                  <>🔄 Sync to Dashboard</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
