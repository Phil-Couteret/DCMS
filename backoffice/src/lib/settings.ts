// Boat.status is free text in the API; online bookings only go on "active"
// boats.
export const BOAT_STATUSES = ["active", "maintenance", "inactive"];

export const BOAT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  maintenance: "In maintenance",
  inactive: "Inactive",
};

// DiveSite.requiredCertLevel, as the public site labels it.
export const SITE_CERT_LEVELS = ["Open Water", "Advanced", "Rescue", "Divemaster", "Instructor"];

export const SETTINGS_TABS = [
  { key: "general", label: "General" },
  { key: "boats", label: "Boats" },
  { key: "sites", label: "Dive Sites" },
  { key: "staff", label: "Staff" },
  { key: "pricing", label: "Pricing" },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];

// The string entries of a free-form JSON list.
export function stringsOnly(value: unknown) {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

// {min, max} water temperature, when the JSON has that shape.
export function tempRange(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const { min, max } = value as Record<string, unknown>;
  return typeof min === "number" && typeof max === "number" ? { min, max } : null;
}
