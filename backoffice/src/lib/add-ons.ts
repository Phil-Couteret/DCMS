import type { BookingAddOn } from "@/lib/api";

// Booking add-ons (prices in Settings → Pricing).
// question: the booking form's checkbox, when it reads differently.
export const ADD_ONS: { key: BookingAddOn; label: string; hint: string; question?: string }[] = [
  { key: "NIGHT_DIVE", label: "Night dive", hint: "Surcharge per diver" },
  { key: "PERSONAL_INSTRUCTOR", label: "Personal instructor", hint: "Fee per booking" },
  { key: "TRANSFER", label: "Transfer", question: "Transfer required", hint: "Fee per booking" },
];

export const ADD_ON_LABELS: Record<BookingAddOn, string> = Object.fromEntries(ADD_ONS.map((a) => [a.key, a.label])) as Record<
  BookingAddOn,
  string
>;
