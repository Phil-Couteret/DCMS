import type { Language } from "@/lib/api";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "EN", label: "English" },
  { code: "ES", label: "Spanish" },
  { code: "DE", label: "German" },
  { code: "FR", label: "French" },
];

export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.code, l.label]),
);

// Country is free text on Customer; the guest booking form sends these codes.
const COUNTRY_NAMES: Record<string, string> = {
  ES: "Spain",
  DE: "Germany",
  GB: "United Kingdom",
  FR: "France",
  US: "United States",
};

export function countryLabel(country: string) {
  return COUNTRY_NAMES[country] ? `${COUNTRY_NAMES[country]} (${country})` : country;
}

export const CERT_LABELS: Record<string, string> = {
  none: "None",
  openWater: "Open Water",
  advanced: "Advanced",
  rescue: "Rescue",
  divemaster: "Divemaster",
  instructor: "Instructor",
};
