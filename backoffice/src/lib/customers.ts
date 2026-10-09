import type { CustomerType, Language, SkillLevel } from "@/lib/api";
import { COUNTRY_NAMES, countryCode } from "@/lib/countries";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "EN", label: "English" },
  { code: "ES", label: "Spanish" },
  { code: "DE", label: "German" },
  { code: "FR", label: "French" },
];

export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.label]),
);

// "Germany (DE)" for a stored code; a name or nationality ("German") as the
// country's name; anything unrecognised as written. See lib/countries.ts.
export function countryLabel(country: string) {
  const code = countryCode(country);
  if (!code) return country;
  return country.trim().length === 2 ? `${COUNTRY_NAMES[code]} (${code})` : COUNTRY_NAMES[code];
}

export const CERT_LABELS: Record<string, string> = {
  none: "None",
  openWater: "Open Water",
  advanced: "Advanced",
  rescue: "Rescue",
  divemaster: "Divemaster",
  instructor: "Instructor",
};

// Picker entry for a customer: shown label and the text the search matches.
export function customerOption(c: { id: string; firstName: string; lastName: string; email: string; phone: string | null }) {
  const name = `${c.firstName} ${c.lastName}`;
  return {
    id: c.id,
    label: `${name} · ${c.email}`,
    search: [name, c.email, c.phone ?? ""].join(" ").toLowerCase(),
  };
}

export const CERT_AGENCIES = ["PADI", "SSI", "CMAS", "NAUI", "BSAC", "VDST", "Other"];

// Customer.gender is free text; the old system stored these values.
export const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  TOURIST: "Tourist",
  LOCAL: "Local",
  RECURRENT: "Recurrent",
};

// Staff's operational assessment, independent of certification.
export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

// Sizes are free text in the API; these are what the form offers.
export const TANK_SIZES = ["10L", "12L", "15L", "Nitrox 12L", "Nitrox 15L"];
export const GEAR_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// Rental items with a size, in the order staff prepare them.
export const RENTAL_SIZE_FIELDS = [
  { key: "bcdSize", label: "BCD" },
  { key: "wetsuitSize", label: "Wetsuit" },
  { key: "finsSize", label: "Fins" },
  { key: "bootsSize", label: "Boots" },
] as const;

// Whether an ISO date is before today at the center.
export function isPast(iso: string | null, today: string) {
  return iso !== null && iso.slice(0, 10) < today;
}
