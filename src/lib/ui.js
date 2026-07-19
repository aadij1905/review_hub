import { CONFIDENCE_PCT } from "./config";

export function confidencePct(confidence) {
  if (typeof confidence === "number") {
    return confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  }
  return CONFIDENCE_PCT[confidence] ?? 60;
}

export function confidenceClass(confidence) {
  const key = typeof confidence === "string" ? confidence : "medium";
  return `badge-conf-${key === "high" || key === "medium" || key === "low" ? key : "medium"}`;
}

export const DEV_STATUSES = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export function devStatusLabel(key) {
  return (DEV_STATUSES.find((s) => s.key === key) || DEV_STATUSES[0]).label;
}

// Turn a raw detector flag (analytics service `flags[]`) into display text.
// Flag shapes vary by `type` — see analytic-service/detectors/detectors.js.
const FLAG_LABELS = {
  high_bounce_page: "High bounce page",
  low_conversion_page: "Low conversion page",
  poor_quality_traffic_source: "Poor quality traffic source",
  high_cart_abandonment: "High cart abandonment",
  cart_to_checkout_dropoff: "Cart-to-checkout drop-off",
  revenue_decline: "Revenue declining",
  poor_lcp: "Poor page load (LCP)",
  lcp_needs_improvement: "Slow page load (LCP)",
  poor_cls: "Layout shift (CLS)",
  poor_inp: "Slow interactivity (INP)",
  cta_below_fold: "CTA below the fold",
};

export function flagLabel(f) {
  return FLAG_LABELS[f.type] || f.type;
}

export function flagDetail(f) {
  switch (f.type) {
    case "high_bounce_page":
    case "low_conversion_page":
      return `${f.path} — ${(f.value * 100).toFixed(1)}% vs ${(f.baseline * 100).toFixed(1)}% site avg (${f.sessions.toLocaleString()} sessions)`;
    case "poor_quality_traffic_source":
      return `${f.source} — ${(f.conversionRate * 100).toFixed(1)}% conversion, ${(f.bounceRate * 100).toFixed(1)}% bounce (${f.sessions.toLocaleString()} sessions)`;
    case "high_cart_abandonment":
      return `${(f.value * 100).toFixed(1)}% of carts abandoned`;
    case "cart_to_checkout_dropoff":
      return `Only ${(f.checkoutReachRate * 100).toFixed(1)}% of carts reach checkout`;
    case "revenue_decline":
      return `${Math.abs(f.changePercent)}% week-on-week`;
    case "poor_lcp":
    case "lcp_needs_improvement":
      return `${f.path} — ${(f.value / 1000).toFixed(1)}s (${f.sessions.toLocaleString()} sessions)`;
    case "poor_cls":
      return `${f.path} — score ${f.value.toFixed(2)} (${f.sessions.toLocaleString()} sessions)`;
    case "poor_inp":
      return `${f.path} — ${f.value.toFixed(0)}ms (${f.sessions.toLocaleString()} sessions)`;
    case "cta_below_fold":
      return `${f.path} — not visible without scrolling (${f.sessions.toLocaleString()} sessions)`;
    default:
      return "";
  }
}

export function flagSeverityClass(f) {
  return f.severity >= 3 ? "issue-critical" : "issue-warning";
}

export function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
