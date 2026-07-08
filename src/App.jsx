import { useCallback, useEffect, useState } from "react";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import AdminDashboard from "./components/AdminDashboard";
import DevView from "./components/DevView";
import History from "./components/History";
import { ToastProvider } from "./components/Toast";
import { DEFAULT_STORE_ID } from "./lib/config";
import {
  loadStore,
  getActiveStore,
  setActiveStore,
  listStores,
  addStore,
} from "./lib/store";

const SESSION_KEY = "reviewhub:user";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState("dashboard");
  const [stores, setStores] = useState(() => listStores());
  const [storeId, setStoreIdState] = useState(
    () => getActiveStore() || DEFAULT_STORE_ID
  );
  const [reviewState, setReviewState] = useState(() => loadStore(storeId));

  const reload = useCallback(() => {
    setReviewState(loadStore(storeId));
    setStores(listStores());
  }, [storeId]);

  useEffect(() => {
    setReviewState(loadStore(storeId));
  }, [storeId]);

  function setStoreId(id) {
    if (!id) return;
    setStoreIdState(id);
    setActiveStore(id);
  }

  function switchStore(id) {
    setStoreId(id);
    setView("dashboard");
  }

  function handleAddStore() {
    const input = window.prompt(
      "Enter the store's myshopify domain:",
      "my-store.myshopify.com"
    );
    if (!input) return;
    const id = input.trim();
    addStore(id);
    setStores(listStores());
    setStoreId(id);
    setView("dashboard");
  }

  function login(u) {
    setUser(u);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setView("dashboard");
  }

  function logout() {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  if (!user) {
    return (
      <ToastProvider>
        <Login onLogin={login} />
      </ToastProvider>
    );
  }

  const isAdmin = user.role === "admin";

  function renderMain() {
    if (view === "history") {
      return <History storeId={storeId} reviewState={reviewState} />;
    }
    if (isAdmin && view === "devpreview") {
      return <DevView storeId={storeId} reviewState={reviewState} reload={reload} preview />;
    }
    if (isAdmin) {
      return (
        <AdminDashboard
          storeId={storeId}
          setStoreId={setStoreId}
          reviewState={reviewState}
          reload={reload}
        />
      );
    }
    return <DevView storeId={storeId} reviewState={reviewState} reload={reload} />;
  }

  return (
    <ToastProvider>
      <div className="shell">
        <Sidebar
          user={user}
          view={view}
          setView={setView}
          onLogout={logout}
          stores={stores}
          activeStore={storeId}
          onSwitchStore={switchStore}
          onAddStore={handleAddStore}
        />
        {renderMain()}
      </div>
    </ToastProvider>
  );
}
