import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { fetchAnalytics } from "../lib/api";
import { flagLabel, flagDetail, flagSeverityClass, flagExplain } from "../lib/ui";
import { IconChevron } from "./Icons";

// Build the live storefront URL for a page path. The store id is the
// myshopify domain, which always resolves (and redirects to a custom domain
// if one is set), so it's a safe base for a click-through link.
function pageUrl(storeId, path) {
  if (!storeId || !path || !path.startsWith("/")) return null;
  return `https://${storeId.replace(/\/+$/, "")}${path}`;
}

// Fixed-order categorical palette — color follows the entity (traffic
// source / device), never its sessions ranking, so a filter or reload never
// repaints an unrelated series.
const CATEGORICAL = ["#3b5bdb", "#6d5ae0", "#1b9e8f", "#d1499f", "#5b6b8c"];
// Ordinal blue ramp for the funnel's four ordered stages (light → dark).
const FUNNEL_RAMP = ["#86b6ef", "#5598e7", "#2a78d6", "#184f95"];
const DEVICE_ORDER = ["desktop", "mobile", "tablet"];

function colorForKey(key, universe) {
  const idx = [...universe].sort().indexOf(key);
  return CATEGORICAL[idx % CATEGORICAL.length];
}

function pct(n) {
  return n == null ? "—" : `${(n * 100).toFixed(1)}%`;
}
function money(n) {
  if (n == null) return "—";
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
}
function num(n) {
  return n == null ? "—" : n.toLocaleString();
}
function cwvBadge(status) {
  if (!status) return null;
  const cls = status === "good" ? "cwv-good" : status === "needs_improvement" ? "cwv-warn" : "cwv-poor";
  const label = status === "good" ? "Good" : status === "needs_improvement" ? "Needs work" : "Poor";
  return <span className={`cwv-pill ${cls}`}>{label}</span>;
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--navy)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 12.5,
    padding: "8px 12px",
  },
  labelStyle: { color: "#cfd6ea", fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: "#fff" },
};

export default function Analytics({ storeId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openIssues, setOpenIssues] = useState(() => new Set());

  const toggleIssue = (i) =>
    setOpenIssues((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const load = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    setError(null);
    fetchAnalytics(storeId)
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const trafficUniverse = useMemo(() => (data ? data.traffic.map((t) => t.source) : []), [data]);
  const deviceUniverse = useMemo(() => (data ? Object.keys(data.devices) : []), [data]);

  const funnelStages = useMemo(() => {
    if (!data) return [];
    const f = data.funnel;
    return [
      { stage: "Sessions", count: f.sessions },
      { stage: "Added to cart", count: f.sessionsWithCartAdditions },
      { stage: "Reached checkout", count: f.sessionsThatReachedCheckout },
      { stage: "Completed purchase", count: f.sessionsThatCompletedCheckout },
    ];
  }, [data]);

  const deviceRows = useMemo(() => {
    if (!data) return [];
    const keys = Object.keys(data.devices);
    const ordered = [...DEVICE_ORDER.filter((k) => keys.includes(k)), ...keys.filter((k) => !DEVICE_ORDER.includes(k)).sort()];
    return ordered.map((k) => ({ key: k, ...data.devices[k] }));
  }, [data]);

  return (
    <div className="analytics-embed">
      <div className="analytics-toolbar">
        <p className="page-sub">
          Store performance pulled live from the Analytics Service
          {data && (
            <span className="source-tag">
              · source: {data.dataSource} · period: {data.period}
            </span>
          )}
        </p>
        <button className="btn-clear" onClick={load} disabled={loading}>
          {loading ? (
            <>
              <span className="spinner spinner-dark" /> Loading…
            </>
          ) : (
            "↻ Refresh"
          )}
        </button>
      </div>

      {error && (
        <div className="empty">
          <h2>Couldn't load analytics</h2>
          <p>{error}</p>
          <button className="btn-generate" onClick={load}>Retry</button>
        </div>
      )}

      {!error && loading && !data && <div className="empty">Loading analytics…</div>}

      {data && (
        <>
          <div className="kpi-grid">
            <div className="kpi-tile"><div className="kpi-label">Sessions</div><div className="kpi-value">{num(data.overview.totalSessions)}</div></div>
            <div className="kpi-tile"><div className="kpi-label">Revenue</div><div className="kpi-value">{money(data.overview.totalRevenue)}</div></div>
            <div className="kpi-tile"><div className="kpi-label">Orders</div><div className="kpi-value">{num(data.overview.totalOrders)}</div></div>
            <div className="kpi-tile"><div className="kpi-label">Avg order value</div><div className="kpi-value">{money(data.overview.avgOrderValue)}</div></div>
            <div className="kpi-tile"><div className="kpi-label">Conversion rate</div><div className="kpi-value">{pct(data.overview.conversionRate)}</div></div>
            <div className="kpi-tile"><div className="kpi-label">Bounce rate</div><div className="kpi-value">{pct(data.overview.bounceRate)}</div></div>
            <div className="kpi-tile"><div className="kpi-label">Cart abandonment</div><div className="kpi-value">{pct(data.overview.cartAbandonmentRate)}</div></div>
          </div>

          <div className="charts-row">
            <div className="chart-card">
              <div className="chart-title">Sessions</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.dailyOverview} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={{ stroke: "var(--border-strong)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [num(v), "Sessions"]} />
                  <Line type="monotone" dataKey="sessions" stroke="#3b5bdb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-title">Conversion &amp; bounce rate</div>
              <div className="legend-row">
                <span className="legend-item"><span className="legend-swatch" style={{ background: "#3b5bdb" }} />Conversion</span>
                <span className="legend-item"><span className="legend-swatch" style={{ background: "#e34948" }} />Bounce</span>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={data.dailyOverview} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={{ stroke: "var(--border-strong)" }} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip {...tooltipStyle} formatter={(v, key) => [pct(v), key === "conversionRate" ? "Conversion" : "Bounce"]} />
                  <Line type="monotone" dataKey="conversionRate" stroke="#3b5bdb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="bounceRate" stroke="#e34948" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Daily sales</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.dailySales} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={{ stroke: "var(--border-strong)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v, key, item) =>
                    key === "sales" ? [money(v), `Sales · ${item.payload.orders} orders`] : [v, key]
                  }
                />
                <Bar dataKey="sales" fill="#3b5bdb" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="charts-row">
            <div className="chart-card">
              <div className="chart-title">Funnel</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelStages} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 12, fill: "var(--text)" }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [num(v), "Sessions"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {funnelStages.map((_, i) => (
                      <Cell key={i} fill={FUNNEL_RAMP[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="chart-sub">
                Cart add {pct(data.funnel.cartAdditionRate)} · Checkout reach {pct(data.funnel.checkoutReachRate)} · Completion {pct(data.funnel.checkoutCompletionRate)}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">Traffic sources</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.traffic} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-2)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="source" width={80} tick={{ fontSize: 12, fill: "var(--text)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v, key, item) => [
                      `${num(v)} sessions · ${pct(item.payload.conversionRate)} CR · ${pct(item.payload.bounceRate)} bounce`,
                      item.payload.source,
                    ]}
                  />
                  <Bar dataKey="sessions" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {data.traffic.map((t) => (
                      <Cell key={t.source} fill={colorForKey(t.source, trafficUniverse)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Devices</div>
            <div className="device-bar">
              {deviceRows.map((d) => (
                <div
                  key={d.key}
                  className="device-seg"
                  style={{ width: `${(d.percentage * 100).toFixed(2)}%`, background: colorForKey(d.key, deviceUniverse) }}
                  title={`${d.key}: ${num(d.sessions)} sessions (${pct(d.percentage)})`}
                />
              ))}
            </div>
            <div className="legend-row">
              {deviceRows.map((d) => (
                <span className="legend-item" key={d.key}>
                  <span className="legend-swatch" style={{ background: colorForKey(d.key, deviceUniverse) }} />
                  {d.key} · {pct(d.percentage)} ({num(d.sessions)})
                </span>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Top pages</div>
            {!data.pages.some((p) => p.crawlerEnriched && p.screenshotUrl) && (
              <div className="chart-sub" style={{ marginBottom: 10, marginTop: 0 }}>
                No screenshots yet — the crawler runs automatically on sync when a storefront URL is set.
              </div>
            )}
            <div className="table-wrap">
              <table className="pages-table">
                <thead>
                  <tr>
                    <th>Screenshot</th>
                    <th>Page</th>
                    <th>Sessions</th>
                    <th>Conversion</th>
                    <th>Bounce</th>
                    <th>LCP</th>
                    <th>CLS</th>
                    <th>INP</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.pages]
                    .sort((a, b) => b.sessions - a.sessions)
                    .map((p) => (
                      <tr key={p.path}>
                        <td>
                          {p.crawlerEnriched && p.screenshotUrl ? (
                            <a href={p.screenshotUrl} target="_blank" rel="noreferrer">
                              <img className="page-thumb" src={p.screenshotUrl} alt={`${p.path} screenshot`} loading="lazy" />
                            </a>
                          ) : (
                            <span className="page-thumb-empty">—</span>
                          )}
                        </td>
                        <td className="pages-path">
                          {pageUrl(storeId, p.path) ? (
                            <a className="page-link" href={pageUrl(storeId, p.path)} target="_blank" rel="noreferrer" title={`Open ${p.path} in a new tab`}>
                              {p.path}
                            </a>
                          ) : (
                            p.path
                          )}
                        </td>
                        <td>{num(p.sessions)}</td>
                        <td>{pct(p.conversionRate)}</td>
                        <td>{pct(p.bounceRate)}</td>
                        <td>{cwvBadge(p.lcpStatus)}</td>
                        <td>{cwvBadge(p.clsStatus)}</td>
                        <td>{cwvBadge(p.inpStatus)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">Detected issues</div>
            {data.flags.length === 0 ? (
              <div className="no-results">No critical issues detected.</div>
            ) : (
              <div className="issue-list">
                {data.flags.map((f, i) => {
                  const open = openIssues.has(i);
                  const ex = flagExplain(f);
                  const critical = f.severity >= 3;
                  return (
                    <div className={`issue-row ${flagSeverityClass(f)} ${open ? "is-open" : ""}`} key={i}>
                      <button className="issue-head" onClick={() => toggleIssue(i)} aria-expanded={open}>
                        <span className={`issue-badge ${flagSeverityClass(f)}`}>{critical ? "Critical" : "Warning"}</span>
                        <div className="issue-body">
                          <div className="issue-title">{flagLabel(f)}</div>
                          <div className="issue-detail">{flagDetail(f)}</div>
                        </div>
                        <IconChevron className="issue-chevron" />
                      </button>
                      {open && (
                        <div className="issue-explain">
                          <div className="explain-block">
                            <span className="explain-label">What it is</span>
                            <p>{ex.what}</p>
                          </div>
                          <div className="explain-block">
                            <span className="explain-label">Why it matters</span>
                            <p>{ex.why}</p>
                          </div>
                          <div className="explain-block">
                            <span className="explain-label">Why {critical ? "critical" : "a warning"}</span>
                            <p>{ex.severity}</p>
                          </div>
                          {ex.notes.length > 0 && (
                            <ul className="explain-notes">
                              {ex.notes.map((n, k) => (
                                <li key={k}>{n}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
