import type { BookingAddOn } from "@/lib/api";

// Booking add-ons (prices in Settings → Pricing).
export const ADD_ONS: { key: BookingAddOn; label: string; hint: string }[] = [
  { key: "NIGHT_DIVE", label: "Night dive", hint: "Surcharge per diver" },
  { key: "PERSONAL_INSTRUCTOR", label: "Personal instructor", hint: "Fee per booking" },
];

export const ADD_ON_LABELS: Record<BookingAddOn, string> = Object.fromEntries(ADD_ONS.map((a) => [a.key, a.label])) as Record<
  BookingAddOn,
  string
>;
