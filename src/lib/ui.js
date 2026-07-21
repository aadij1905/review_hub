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

// Expanded explanation for a detector flag: what the issue is, why it hurts,
// and why it earned its severity — plus optional evidence notes (statistical
// significance, correlated issues) surfaced by the analytics detectors.
export function flagExplain(f) {
  const p1 = (n) => `${(n * 100).toFixed(1)}%`;
  const secs = f.sessions != null ? `${f.sessions.toLocaleString()} sessions` : "";
  let what = "";
  let why = "";
  let severity = "";

  switch (f.type) {
    case "high_bounce_page":
      what = `${p1(f.value)} of visitors to ${f.path} leave without any interaction — well above the ${p1(f.baseline)} site average.`;
      why = `That's ${secs} of largely wasted traffic: people arrive and immediately leave, so the acquisition spend and SEO effort behind this page aren't turning into browsing or sales.`;
      severity = f.severity >= 3
        ? `Critical because this is a high-traffic page (over 1,000 sessions), so the lost visitors add up fast.`
        : `A warning: the bounce rate is elevated but on moderate traffic, so the impact is contained for now.`;
      break;
    case "low_conversion_page":
      what = `${f.path} converts at ${p1(f.value)} — less than half the ${p1(f.baseline)} site average.`;
      why = `Visitors are landing here but not buying (${secs}). Something on the path from this page to checkout — the offer, clarity, trust signals, or friction — is underperforming.`;
      severity = f.severity >= 3
        ? `Critical because it's a high-traffic page (over 1,000 sessions), so the missed conversions are significant.`
        : `A warning: conversion is low but on moderate traffic.`;
      break;
    case "poor_quality_traffic_source":
      what = `The "${f.source}" source sends ${secs} but converts at only ${p1(f.conversionRate)} with ${p1(f.bounceRate)} bounce.`;
      why = `This channel brings volume but not buyers — the audience or targeting is mismatched, so budget and effort spent here are inefficient versus your better-performing sources.`;
      severity = `Critical: a source that both converts far below average AND bounces heavily is a clear drain, not a marginal one.`;
      break;
    case "high_cart_abandonment":
      what = `${p1(f.value)} of shoppers who add something to their cart never complete the purchase.`;
      why = `These are your highest-intent visitors — they wanted to buy. Losing them usually points to checkout friction, unexpected costs (shipping/taxes shown late), or missing payment options.`;
      severity = f.severity >= 3
        ? `Critical: abandonment above 80% is severe — the large majority of ready-to-buy shoppers are dropping.`
        : `A warning: above the 70% healthy threshold, but not yet severe.`;
      break;
    case "cart_to_checkout_dropoff":
      what = `Only ${p1(f.checkoutReachRate)} of carts make it to the checkout step.`;
      why = `Between adding to cart and starting checkout, most shoppers leave — often a cart/drawer UX issue, surprise costs shown at the cart, or an unclear path to checkout.`;
      severity = f.severity >= 3
        ? `Critical: under 25% checkout reach means the cart step itself is losing most buyers.`
        : `A warning: below the 40% healthy threshold.`;
      break;
    case "revenue_decline":
      what = `Revenue is down ${Math.abs(f.changePercent)}% comparing the first half of the period to the second.`;
      why = `A downward trend compounds — catching it early lets you diagnose whether it's traffic, conversion, or order value before the gap widens.`;
      severity = `Critical: a sustained double-digit revenue drop is a top-priority signal.`;
      break;
    case "poor_lcp":
      what = `${f.path} takes ${(f.value / 1000).toFixed(1)}s to show its main content (LCP). Google's "good" threshold is 2.5s.`;
      why = `Slow loads lose shoppers before they even see the product — every extra second measurably raises bounce and lowers conversion, especially on mobile.`;
      severity = `Critical: an LCP over 4s falls in Google's "poor" band.`;
      break;
    case "lcp_needs_improvement":
      what = `${f.path} loads its main content in ${(f.value / 1000).toFixed(1)}s — between Google's 2.5s "good" and 4s "poor" thresholds.`;
      why = `The page is noticeably slow to become useful, which nudges some shoppers to leave before it finishes loading.`;
      severity = `A warning: LCP is in the "needs improvement" band, not yet poor.`;
      break;
    case "poor_cls":
      what = `${f.path} has a layout-shift score of ${f.value.toFixed(2)} (CLS). Google's "good" is 0.1 or lower.`;
      why = `Content jumping around as the page loads causes mis-taps and frustration — shoppers accidentally click the wrong thing and lose trust in the store.`;
      severity = `A warning: CLS this high is in Google's "poor" band, but layout shift rarely blocks a purchase outright.`;
      break;
    case "poor_inp":
      what = `${f.path} takes ${f.value.toFixed(0)}ms to respond to taps and clicks (INP). Google's "good" is 200ms or less.`;
      why = `Laggy interactions make the store feel broken — shoppers tap again, give up, or distrust the checkout.`;
      severity = `A warning: INP this high is in Google's "poor" band for responsiveness.`;
      break;
    case "cta_below_fold":
      what = `On ${f.path}, the primary call-to-action (e.g. Add to Cart) isn't visible without scrolling.`;
      why = `Shoppers who don't scroll never see the buy button (${secs}) — you're relying on them to hunt for the action, which measurably cuts add-to-cart rates.`;
      severity = `Critical: a hidden primary CTA directly blocks the core conversion action.`;
      break;
    default:
      what = flagDetail(f);
      why = "";
      severity = f.severity >= 3 ? "Flagged as critical by the analytics detectors." : "Flagged as a warning by the analytics detectors.";
  }

  const notes = [];
  if (typeof f.zScore === "number") {
    notes.push(`Statistically significant (z = ${f.zScore}) — a real signal, not small-sample noise.`);
  }
  if (Array.isArray(f.coOccurringOnPage) && f.coOccurringOnPage.length) {
    notes.push(`Related issues on this page: ${f.coOccurringOnPage.map((t) => FLAG_LABELS[t] || t).join(", ")}.`);
  }

  return { what, why, severity, notes };
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
