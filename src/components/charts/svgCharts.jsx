// Small, dependency-free SVG chart primitives for the analytics overview.
// No charting library is installed in this project, so these components stay
// intentionally simple — they lean on the app's existing CSS variables for
// color so they always match the rest of Review Hub.

const PALETTE = ["#3b5bdb", "#22a06b", "#e8a13a", "#e03e52", "#6d5ae0", "#2bb3c0"];

function niceMax(max) {
  if (max <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const normalized = max / magnitude;
  let niceNormalized;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

// ── Line / area chart ───────────────────────────────────────────────────────
// points: [{ label, value }]
export function LineChart({ points, width = 560, height = 200, color = "var(--accent)", formatValue }) {
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const values = points.map((p) => p.value ?? 0);
  const maxVal = niceMax(Math.max(...values, 1));
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: padL + i * stepX,
    y: padT + innerH - ((p.value ?? 0) / maxVal) * innerH,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x.toFixed(1)} ${padT + innerH} L ${coords[0]?.x.toFixed(1)} ${padT + innerH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
      {gridLines.map((g) => {
        const y = padT + innerH - g * innerH;
        return (
          <g key={g}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 8} y={y + 4} fontSize="10" textAnchor="end" fill="var(--muted-2)">
              {formatValue ? formatValue(g * maxVal) : Math.round(g * maxVal)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill={color} opacity="0.12" stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5">
          <title>{`${points[i].label}: ${formatValue ? formatValue(points[i].value) : points[i].value}`}</title>
        </circle>
      ))}
      {points.map((p, i) => {
        if (points.length > 8 && i % 2 !== 0) return null;
        return (
          <text key={p.label} x={padL + i * stepX} y={height - 8} fontSize="10" textAnchor="middle" fill="var(--muted-2)">
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Vertical bar chart ──────────────────────────────────────────────────────
// bars: [{ label, value, color? }]
export function BarChart({ bars, width = 560, height = 200, formatValue, colorFor }) {
  const padL = 44;
  const padR = 14;
  const padT = 16;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = niceMax(Math.max(...bars.map((b) => b.value ?? 0), 1));
  const gap = 10;
  const barW = bars.length ? (innerW - gap * (bars.length - 1)) / bars.length : 0;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
      {gridLines.map((g) => {
        const y = padT + innerH - g * innerH;
        return (
          <g key={g}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 8} y={y + 4} fontSize="10" textAnchor="end" fill="var(--muted-2)">
              {formatValue ? formatValue(g * maxVal) : Math.round(g * maxVal)}
            </text>
          </g>
        );
      })}
      {bars.map((b, i) => {
        const x = padL + i * (barW + gap);
        const h = ((b.value ?? 0) / maxVal) * innerH;
        const y = padT + innerH - h;
        const fill = b.color || colorFor?.(b, i) || PALETTE[i % PALETTE.length];
        return (
          <g key={b.label}>
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx="4" fill={fill}>
              <title>{`${b.label}: ${formatValue ? formatValue(b.value) : b.value}`}</title>
            </rect>
            <text x={x + barW / 2} y={height - 10} fontSize="10.5" textAnchor="middle" fill="var(--muted)">
              {b.label.length > 10 ? `${b.label.slice(0, 9)}…` : b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut chart ─────────────────────────────────────────────────────────────
// slices: [{ label, value, color? }]
export function DonutChart({ slices, size = 160, thickness = 26 }) {
  const total = slices.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  let cumulative = 0;

  const arcs = slices.map((s, i) => {
    const fraction = (s.value || 0) / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += fraction;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = fraction > 0.5 ? 1 : 0;
    const color = s.color || PALETTE[i % PALETTE.length];
    const path =
      fraction >= 0.999
        ? // full circle — draw as two half-arcs so it renders
          `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`
        : `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    return { path, color, label: s.label, value: s.value, pct: fraction };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img">
      {arcs.map((a) => (
        <path
          key={a.label}
          d={a.path}
          fill="none"
          stroke={a.color}
          strokeWidth={thickness}
        >
          <title>{`${a.label}: ${(a.pct * 100).toFixed(0)}%`}</title>
        </path>
      ))}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--navy)">
        {total.toLocaleString()}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fontSize="10" fill="var(--muted-2)">
        sessions
      </text>
    </svg>
  );
}

// ── Funnel chart ────────────────────────────────────────────────────────────
// stages: [{ stage, count, rate }]
export function FunnelChart({ stages }) {
  const maxCount = Math.max(...stages.map((s) => s.count || 0), 1);
  return (
    <div className="funnel-chart">
      {stages.map((s, i) => {
        const pct = Math.max(((s.count || 0) / maxCount) * 100, 4);
        const color = PALETTE[i % PALETTE.length];
        return (
          <div className="funnel-row" key={s.stage}>
            <div className="funnel-label">{s.stage}</div>
            <div className="funnel-track">
              <div className="funnel-fill" style={{ width: `${pct}%`, background: color }}>
                <span className="funnel-count">{(s.count || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="funnel-rate">{s.rate}</div>
          </div>
        );
      })}
    </div>
  );
}

export { PALETTE };
