import { IconChart, IconBulb, IconGrid, IconClock, IconArrowRight } from "./Icons";

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
        <div className="brand-mark">◆</div>
        <div className="brand-text">
          <div className="brand-name">Experience Intelligence</div>
          <div className="brand-tag">Storefront Optimization</div>
        </div>
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
              <span className="nav-icon"><IconChart className="icon" /></span> Analytics
            </button>

            <button
              className={`nav-link ${view === "suggestions" ? "active" : ""}`}
              onClick={() => setView("suggestions")}
            >
              <span className="nav-icon"><IconBulb className="icon" /></span> Suggestions
            </button>
          </>
        ) : (
          <button
            className={`nav-link ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            <span className="nav-icon"><IconGrid className="icon" /></span> Dashboard
          </button>
        )}

        <button
          className={`nav-link ${view === "history" ? "active" : ""}`}
          onClick={() => setView("history")}
        >
          <span className="nav-icon"><IconClock className="icon" /></span> History
        </button>

      </nav>

      <div className="sidebar-foot">
        <div className="user-name">{user.name}</div>
        <span className={`role-badge ${isAdmin ? "role-admin" : "role-dev"}`}>
          {isAdmin ? "Admin / PO" : "Developer"}
        </span>
        <button className="logout" onClick={onLogout}>
          Logout <IconArrowRight className="icon icon-sm" />
        </button>
      </div>
    </aside>
  );
}
