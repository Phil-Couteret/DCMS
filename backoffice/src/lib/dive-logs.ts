import type { IncidentSeverity } from "@/lib/api";

export const SEVERITIES: IncidentSeverity[] = ["MINOR", "MODERATE", "SERIOUS", "CRITICAL"];

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  SERIOUS: "Serious",
  CRITICAL: "Critical",
};

export const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  MINOR: "bg-yellow-100 text-yellow-900",
  MODERATE: "bg-orange-100 text-orange-900",
  SERIOUS: "bg-red-100 text-red-900",
  CRITICAL: "bg-red-600 text-white",
};

export function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}
