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

export function fileIcon() {
  return "📁";
}

export const DEV_STATUSES = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export function devStatusLabel(key) {
  return (DEV_STATUSES.find((s) => s.key === key) || DEV_STATUSES[0]).label;
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
