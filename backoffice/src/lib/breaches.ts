import type { BreachSeverity, BreachStatus } from "@/lib/api";

export const BREACH_STATUSES: BreachStatus[] = ["DETECTED", "ASSESSED", "REPORTED", "RESOLVED"];
export const BREACH_SEVERITIES: BreachSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const BREACH_STATUS_LABELS: Record<BreachStatus, string> = {
  DETECTED: "Detected",
  ASSESSED: "Assessed",
  REPORTED: "Reported",
  RESOLVED: "Resolved",
};

export const BREACH_STATUS_STYLES: Record<BreachStatus, string> = {
  DETECTED: "bg-red-100 text-red-900",
  ASSESSED: "bg-amber-100 text-amber-900",
  REPORTED: "bg-sky-100 text-sky-900",
  RESOLVED: "bg-green-100 text-green-900",
};

export const SEVERITY_LABELS: Record<BreachSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const SEVERITY_STYLES: Record<BreachSeverity, string> = {
  LOW: "bg-green-100 text-green-900",
  MEDIUM: "bg-sky-100 text-sky-900",
  HIGH: "bg-amber-100 text-amber-900",
  CRITICAL: "bg-red-600 text-white",
};

// The keys the API accepts, as the previous system labelled them.
export const DATA_TYPE_LABELS: Record<string, string> = {
  customer_data: "Customer data",
  booking_data: "Booking data",
  financial_data: "Financial data",
  equipment_data: "Equipment data",
  staff_data: "Staff data",
  certification_data: "Certification data",
  medical_data: "Medical data",
};

// The statuses a breach can move to: any later one.
export function nextStatuses(status: BreachStatus) {
  return BREACH_STATUSES.slice(BREACH_STATUSES.indexOf(status) + 1);
}

// Whole hours left before the 72-hour deadline (negative once past).
export function hoursLeft(deadline: string, now = Date.now()) {
  return Math.floor((new Date(deadline).getTime() - now) / 3_600_000);
}
