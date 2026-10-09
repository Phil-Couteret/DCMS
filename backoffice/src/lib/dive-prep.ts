import type { ComplianceTrip, PrepBooking, StaffType, TimeSlot, TripRole } from "@/lib/api";
import { CERT_LABELS } from "@/lib/customers";
import { translator, type T } from "@/lib/i18n/core";
import { SLOT_NAMES, tripPlace } from "@/lib/trips";

export const PREP_TABS = [
  { key: "prep", label: "Preparation" },
  { key: "report", label: "Post-dive reports" },
  { key: "compliance", label: "Compliance" },
] as const;

export type PrepTab = (typeof PREP_TABS)[number]["key"];

// Trip roles each staff type may take; the API enforces the same.
export const ROLES_FOR_TYPE: Record<StaffType, TripRole[]> = {
  CAPTAIN: ["CAPTAIN"],
  GUIDE: ["GUIDE", "TRAINEE_GUIDE"],
  TRAINER: ["GUIDE", "TRAINEE_GUIDE"],
  ADMIN: [],
};

export const SKILL_PILL: Record<string, string> = {
  BEGINNER: "bg-sky-50 text-sky-800 ring-sky-200",
  INTERMEDIATE: "bg-amber-50 text-amber-800 ring-amber-200",
  ADVANCED: "bg-green-50 text-green-800 ring-green-200",
  EXPERT: "bg-violet-50 text-violet-800 ring-violet-200",
};

export function prepHref(q: { tab?: PrepTab; date: string; slot?: TimeSlot; location?: string }) {
  const params = new URLSearchParams({ date: q.date });
  if (q.tab && q.tab !== "prep") params.set("tab", q.tab);
  if (q.slot && q.slot !== "MORNING") params.set("slot", q.slot);
  if (q.location) params.set("location", q.location);
  return `/dashboard/dive-prep?${params}`;
}

// Leaves the English text as it is (the compliance CSV stays in English).
const english = translator("en");

// What to put in the diver's crate: their tank, and the rental sizes unless
// they bring their own set.
export function equipmentSummary(c: PrepBooking["customer"], t: T = english) {
  const tank = t("Tank {size}", { size: c.tankSize ?? "12L" });
  if (c.ownEquipment) return t("Own equipment · {tank}", { tank });
  const sizes = [
    ["BCD", c.bcdSize],
    ["Wetsuit", c.wetsuitSize],
    ["Fins", c.finsSize],
    ["Boots", c.bootsSize],
  ]
    .map(([name, size]) => `${t(name as string)} ${size ?? "?"}`)
    .join(", ");
  return t("Rental: {sizes} · {tank}", { sizes, tank });
}

export function certificationLabel(cert: { agency: string; level: string } | null, t: T = english) {
  return cert ? `${cert.agency} ${CERT_LABELS[cert.level] ? t(CERT_LABELS[cert.level]) : cert.level}` : t("No certification");
}

function csvCell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? "" : String(value);
  // Text starting like a formula (names and notes are typed by people) is
  // prefixed so spreadsheets show it instead of running it.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const name = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

// One row per completed dive, then one row per named diver, for the marine
// authority's records.
export function complianceCsv(date: string, trips: ComplianceTrip[]) {
  const rows: (string | number | null)[][] = [
    [
      "Date",
      "Time slot",
      "Boat / dive type",
      "Planned site",
      "Actual site",
      "Entry time",
      "Exit time",
      "Total divers",
      "Male",
      "Female",
      "Unspecified",
      "Captain",
      "Guides",
      "Notes",
    ],
    ...trips.map((t) => [
      date,
      SLOT_NAMES[t.timeSlot],
      tripPlace(t),
      t.plannedSite?.nameEn ?? "",
      t.actualSite?.nameEn ?? "",
      t.entryTime,
      t.exitTime,
      t.totals.divers,
      t.totals.male,
      t.totals.female,
      t.totals.unspecified,
      t.captain ? name(t.captain) : "",
      t.guides.map(name).join("; "),
      t.reportNotes,
    ]),
    [],
    ["Date", "Time slot", "Boat / dive type", "Diver", "Gender", "Certification", "Nationality", "Companions"],
    ...trips.flatMap((t) =>
      t.divers.map((d) => [
        date,
        SLOT_NAMES[t.timeSlot],
        tripPlace(t),
        d.name,
        d.gender ?? "",
        certificationLabel(d.certification),
        d.nationality,
        d.companions,
      ]),
    ),
  ];
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
