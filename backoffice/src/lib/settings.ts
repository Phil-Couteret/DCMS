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
  { key: "users", label: "Users", adminOnly: true },
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number]["key"];

// User.role. Customers can only sign in on the public site.
export const USER_ROLES = ["ADMIN", "INSTRUCTOR", "CUSTOMER"] as const;

export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  INSTRUCTOR: "Instructor",
  CUSTOMER: "Customer",
};

// The API's rule (bcrypt reads at most 72 bytes).
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

// Checks a new password and its confirmation; null when both are fine.
export function newPasswordError(password: string, confirm: string) {
  if (password.length < PASSWORD_MIN) return `The password must be at least ${PASSWORD_MIN} characters`;
  if (password.length > PASSWORD_MAX) return `The password must be at most ${PASSWORD_MAX} characters`;
  if (password !== confirm) return "The passwords do not match";
  return null;
}

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
