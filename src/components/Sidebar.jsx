export default function Sidebar({
  user,
  view,
  setView,
  onLogout,
  stores,
  activeStore,
  onSwitchStore,
  onAddStore,
}) {
  const isAdmin = user.role === "admin";

  // Always show the active store even if it isn't registered yet.
  const options = stores.some((s) => s.storeId === activeStore)
    ? stores
    : [{ storeId: activeStore }, ...stores];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-name">Experience Intelligence</div>
        <div className="brand-tag">AI-Powered Storefront Optimization</div>
      </div>

      <div className="store-switch">
        <label className="store-switch-label">Store</label>
        <select
          className="store-select"
          value={activeStore || ""}
          onChange={(e) => onSwitchStore(e.target.value)}
        >
          {options.map((s) => (
            <option key={s.storeId} value={s.storeId}>
              {s.storeId}
            </option>
          ))}
        </select>
        {isAdmin && (
          <button className="store-add" onClick={onAddStore}>+ Add store</button>
        )}
      </div>

      <nav className="nav">
        {isAdmin ? (
          <>
            <button
              className={`nav-link ${view === "analytics" ? "active" : ""}`}
              onClick={() => setView("analytics")}
            >
              <span className="nav-icon">📊</span> Analytics
            </button>

            <button
              className={`nav-link ${view === "suggestions" ? "active" : ""}`}
              onClick={() => setView("suggestions")}
            >
              <span className="nav-icon">💡</span> Suggestions
            </button>
          </>
        ) : (
          <button
            className={`nav-link ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            <span className="nav-icon">▦</span> Dashboard
          </button>
        )}

        <button
          className={`nav-link ${view === "history" ? "active" : ""}`}
          onClick={() => setView("history")}
        >
          <span className="nav-icon">🕘</span> History
        </button>

      </nav>

      <div className="sidebar-foot">
        <div className="user-name">{user.name}</div>
        <span className={`role-badge ${isAdmin ? "role-admin" : "role-dev"}`}>
          {isAdmin ? "Admin / PO" : "Developer"}
        </span>
        <button className="logout" onClick={onLogout}>Logout →</button>
      </div>
    </aside>
  );
}
