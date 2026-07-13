import { useEffect, useState } from "react";
import {
  fetchAnalyticsOverview,
  fetchAnalyticsTraffic,
  fetchAnalyticsDevices,
  fetchAnalyticsFunnel,
} from "../lib/api";
import { LineChart, BarChart, DonutChart, FunnelChart, PALETTE } from "./charts/svgCharts";

const money = (n) => (n == null ? "—" : `$${n >= 1000 ? (n / 1000).toFixed(1) + "K" : n.toFixed(0)}`);
const pct = (n) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);
const shortDay = (d) => {
  if (!d) return "";
  const parts = d.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
};

// Flags come from different endpoints with different shapes (value,
// changePercent, conversionRate/bounceRate, checkoutReachRate...) — this
// picks a readable one-liner for whichever shape shows up.
function describeFlag(f) {
  const label = f.type.replace(/_/g, " ");
  if (f.changePercent != null) return `${label} — ${f.changePercent}% week-on-week`;
  if (f.source && f.conversionRate != null) return `${label} — ${f.source} (${pct(f.conversionRate)} CR, ${pct(f.bounceRate)} bounce)`;
  if (f.checkoutReachRate != null) return `${label} — ${pct(f.checkoutReachRate)} reach checkout`;
  if (f.value != null) return `${label} — ${typeof f.value === "number" && f.value < 1 ? pct(f.value) : f.value}`;
  return label;
}

// Fetches overview/traffic/devices/funnel from the Analytics Service and
// renders the whole "state of the store" picture with graphs. Lives on the
// Admin Dashboard, above the AI-suggestion review list.
export default function AnalyticsOverview({ storeId }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setState({ loading: true, error: null, data: null });

    Promise.all([
      fetchAnalyticsOverview(storeId),
      fetchAnalyticsTraffic(storeId),
      fetchAnalyticsDevices(storeId),
      fetchAnalyticsFunnel(storeId),
    ])
      .then(([overview, traffic, devices, funnel]) => {
        if (cancelled) return;
        setState({ loading: false, error: null, data: { overview, traffic, devices, funnel } });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, error: err.message, data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (!storeId) return null;

  return (
    <div className="analytics-panel">
      <div className="analytics-panel-head" onClick={() => setCollapsed((c) => !c)}>
        <div>
          <h2 className="analytics-title">📊 Analytics Overview</h2>
          {state.data && (
            <p className="analytics-sub">
              {state.data.overview.period} · source: {state.data.overview.dataSource}
              {state.data.overview.ingestedAt && ` · synced ${new Date(state.data.overview.ingestedAt).toLocaleString()}`}
            </p>
          )}
        </div>
        <span className={`chev ${collapsed ? "" : "open"}`}>›</span>
      </div>

      {!collapsed && (
        <>
          {state.loading && (
            <div className="analytics-loading">
              <span className="spinner spinner-dark" /> Loading analytics…
            </div>
          )}

          {state.error && (
            <div className="analytics-error">
              Couldn't reach the Analytics Service ({state.error}). Is it running on the
              configured ANALYTICS_URL?
            </div>
          )}

          {state.data && <AnalyticsBody data={state.data} />}
        </>
      )}
    </div>
  );
}

function AnalyticsBody({ data }) {
  const { overview, traffic, devices, funnel } = data;
  const o = overview.overview;

  const kpis = [
    { label: "Sessions", value: o.totalSessions?.toLocaleString(), tone: "accent" },
    { label: "Revenue", value: money(o.totalRevenue), tone: "green" },
    { label: "Orders", value: o.totalOrders?.toLocaleString(), tone: "navy" },
    { label: "Avg Order Value", value: money(o.avgOrderValue), tone: "navy" },
    { label: "Conversion Rate", value: pct(o.conversionRate), tone: "green" },
    { label: "Bounce Rate", value: pct(o.bounceRate), tone: o.bounceRate > 0.5 ? "red" : "navy" },
  ];

  const allFlags = [
    ...(overview.flags || []),
    ...(traffic.flags || []),
    ...(funnel.flags || []),
  ];

  const sessionsSeries = (overview.dailyOverview || []).map((d) => ({
    label: shortDay(d.day),
    value: d.sessions,
  }));
  const salesSeries = (overview.dailySales || []).map((d) => ({
    label: shortDay(d.day),
    value: d.sales,
  }));

  const trafficBars = (traffic.traffic || [])
    .slice()
    .sort((a, b) => b.sessions - a.sessions)
    .map((t) => ({ label: t.source, value: t.sessions }));

  const deviceEntries = Object.entries(devices.devices || {});
  const deviceSlices = deviceEntries.map(([name, d], i) => ({
    label: name,
    value: d.sessions,
    color: PALETTE[i % PALETTE.length],
  }));

  const stages = [
    { stage: "Sessions", count: funnel.funnel.sessions, rate: "100%" },
    { stage: "Added to Cart", count: funnel.funnel.sessionsWithCartAdditions, rate: pct(funnel.funnel.cartAdditionRate) },
    { stage: "Reached Checkout", count: funnel.funnel.sessionsThatReachedCheckout, rate: pct(funnel.funnel.checkoutReachRate) },
    { stage: "Completed Purchase", count: funnel.funnel.sessionsThatCompletedCheckout, rate: pct(funnel.funnel.checkoutCompletionRate) },
  ];

  return (
    <>
      {allFlags.length > 0 && (
        <div className="analytics-flags">
          {allFlags.map((f, i) => (
            <div key={i} className="analytics-flag">
              ⚠️ {describeFlag(f)}
            </div>
          ))}
        </div>
      )}

      <div className="analytics-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="analytics-kpi">
            <div className="analytics-kpi-label">{k.label}</div>
            <div className={`analytics-kpi-value tone-${k.tone}`}>{k.value ?? "—"}</div>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-card-title">Sessions — last {sessionsSeries.length} days</div>
          {sessionsSeries.length > 0 ? (
            <LineChart points={sessionsSeries} color="var(--accent)" formatValue={(v) => Math.round(v).toLocaleString()} />
          ) : (
            <div className="analytics-empty">No daily session data</div>
          )}
        </div>

        <div className="analytics-card">
          <div className="analytics-card-title">Sales — last {salesSeries.length} days</div>
          {salesSeries.length > 0 ? (
            <LineChart points={salesSeries} color="var(--green)" formatValue={money} />
          ) : (
            <div className="analytics-empty">No daily sales data</div>
          )}
        </div>

        <div className="analytics-card">
          <div className="analytics-card-title">Traffic by source</div>
          {trafficBars.length > 0 ? (
            <BarChart bars={trafficBars} formatValue={(v) => Math.round(v).toLocaleString()} />
          ) : (
            <div className="analytics-empty">No traffic data</div>
          )}
          <div className="analytics-legend">
            {(traffic.traffic || []).slice().sort((a, b) => b.sessions - a.sessions).map((t, i) => (
              <span key={t.source} className="legend-item">
                <span className="legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                {t.source} · {pct(t.conversionRate)} CR
              </span>
            ))}
          </div>
        </div>

        <div className="analytics-card analytics-card-center">
          <div className="analytics-card-title">Sessions by device</div>
          {deviceSlices.length > 0 ? (
            <>
              <DonutChart slices={deviceSlices} />
              <div className="analytics-legend">
                {deviceEntries.map(([name, d], i) => (
                  <span key={name} className="legend-item">
                    <span className="legend-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                    {name} · {pct(d.percentage)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="analytics-empty">No device data</div>
          )}
        </div>

        <div className="analytics-card analytics-card-wide">
          <div className="analytics-card-title">Conversion funnel</div>
          <FunnelChart stages={stages} />
        </div>
      </div>
    </>
  );
}
