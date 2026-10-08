"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_update } from "@/auth";
import {
  ApiError,
  createBoat,
  createDiveSite,
  createUser,
  deleteBoat,
  deleteDiveSite,
  deleteUser,
  setUserPassword,
  updateBoat,
  updateDiveSite,
  updateSettings,
  updatePricing,
  updateUser,
  type ActivityPriceKey,
  type BoatData,
  type EquipmentPriceKey,
  type FunDiveTier,
  type Language,
  type SettingsData,
  type DiveSiteData,
  type UserRole,
} from "@/lib/api";
import {
  ACTIVITY_PRICE_LABELS,
  BOAT_STATUSES,
  EQUIPMENT_PRICE_LABELS,
  newPasswordError,
  USER_ROLES,
} from "@/lib/settings";

export type SettingsFormState = { error?: string; ok?: boolean } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): SettingsFormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

function int(formData: FormData, name: string) {
  const raw = text(formData, name);
  return raw === "" ? null : Number(raw);
}

export async function saveGeneral(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const name = text(formData, "name");
  const taxName = text(formData, "taxName");
  const taxRateRaw = text(formData, "taxRate");
  const taxRate = Number(taxRateRaw);
  if (!name) return { error: "Enter the center's name" };
  if (!taxName) return { error: "Enter the tax name" };
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(taxRateRaw) || taxRate > 100) {
    return { error: "Tax rate must be a percentage between 0 and 100, with at most 2 decimals" };
  }
  const data: SettingsData = {
    name,
    legalName: text(formData, "legalName") || null,
    address: text(formData, "address") || null,
    phone: text(formData, "phone") || null,
    email: text(formData, "email") || null,
    website: text(formData, "website") || null,
    taxName,
    taxRate,
  };
  // The admin-only section, sent only when the form shows it.
  if (formData.has("timeZone")) {
    const invoicePrefix = text(formData, "invoicePrefix").toUpperCase();
    const partnerInvoicePrefix = text(formData, "partnerInvoicePrefix").toUpperCase();
    if (![invoicePrefix, partnerInvoicePrefix].every((p) => /^[A-Z0-9]{1,10}$/.test(p))) {
      return { error: "Invoice prefixes take 1 to 10 capital letters or digits" };
    }
    const logoUrl = text(formData, "logoUrl");
    if (logoUrl && !logoUrl.startsWith("https://")) return { error: "The logo URL must start with https://" };
    // An unticked colour switch clears the colour.
    const colour = (name: string) => (formData.has(`${name}On`) ? text(formData, name).toLowerCase() : null);
    Object.assign(data, {
      timeZone: text(formData, "timeZone"),
      currency: text(formData, "currency"),
      defaultLanguage: text(formData, "defaultLanguage") as Language,
      logoUrl: logoUrl || null,
      primaryColor: colour("primaryColor"),
      accentColor: colour("accentColor"),
      invoicePrefix,
      partnerInvoicePrefix,
    });
  }
  try {
    await updateSettings(data);
  } catch (e) {
    return fail(e, "Settings could not be saved");
  }
  // Every page shows dates and amounts in the session's time zone and
  // currency: refresh this session now (others within 5 minutes).
  await unstable_update({});
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function saveBoat(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const id = text(formData, "boatId");
  const name = text(formData, "name");
  const registrationNumber = text(formData, "registrationNumber");
  const capacity = int(formData, "capacity");
  const status = text(formData, "status");
  const lengthRaw = text(formData, "length");
  const length = lengthRaw === "" ? null : Number(lengthRaw);
  const dates = ["insuranceExpiry", "lastServiceDate", "nextServiceDate"] as const;

  if (!name) return { error: "Enter the boat's name" };
  if (!registrationNumber) return { error: "Enter the registration number" };
  if (capacity === null || !Number.isInteger(capacity) || capacity < 1) return { error: "Capacity must be at least 1" };
  if (!BOAT_STATUSES.includes(status) && status !== text(formData, "status_initial")) {
    return { error: "Choose a status" };
  }
  if (length !== null && (!Number.isFinite(length) || length < 0 || length > 999.99)) {
    return { error: "Length must be between 0 and 999.99 m" };
  }
  for (const d of dates) {
    const v = text(formData, d);
    if (v && !ISO_DATE.test(v)) return { error: "Enter valid dates" };
  }

  const data: BoatData = {
    name,
    registrationNumber,
    capacity,
    status,
    length: length === null ? null : Math.round(length * 100) / 100,
    engine: text(formData, "engine") || null,
    insuranceExpiry: text(formData, "insuranceExpiry") || null,
    lastServiceDate: text(formData, "lastServiceDate") || null,
    nextServiceDate: text(formData, "nextServiceDate") || null,
  };
  // Creates send only the fields that are set.
  const payload = id ? data : (Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)) as BoatData);
  try {
    if (id) await updateBoat(id, payload);
    else await createBoat(payload);
  } catch (e) {
    return fail(e, "The boat could not be saved");
  }
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=boats");
}

export async function removeBoat(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  try {
    await deleteBoat(text(formData, "id"));
  } catch (e) {
    return fail(e, "The boat could not be deleted");
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// "a, b , c" -> ["a", "b", "c"].
function list(value: string) {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function saveSite(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const id = text(formData, "siteId");
  const nameEn = text(formData, "nameEn");
  const descriptionEn = text(formData, "descriptionEn");
  const latitude = Number(text(formData, "latitude"));
  const longitude = Number(text(formData, "longitude"));
  const depthMin = int(formData, "depthMin");
  const depthMax = int(formData, "depthMax");
  const requiredCertLevel = int(formData, "requiredCertLevel");
  const difficultyLevel = int(formData, "difficultyLevel");
  const travelTimeMinutes = int(formData, "travelTimeMinutes");
  const maxDiversPerTrip = int(formData, "maxDiversPerTrip");
  const typicalVisibility = int(formData, "typicalVisibility");
  const tempMin = int(formData, "tempMin");
  const tempMax = int(formData, "tempMax");

  if (!nameEn) return { error: "Enter the site's English name" };
  if (!descriptionEn) return { error: "Enter the English description" };
  if (text(formData, "latitude") === "" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: "Latitude must be between -90 and 90" };
  }
  if (text(formData, "longitude") === "" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: "Longitude must be between -180 and 180" };
  }
  if (depthMin === null || depthMax === null || depthMin < 0 || depthMax < depthMin) {
    return { error: "Depths must be whole metres, with the maximum at least the minimum" };
  }
  if (requiredCertLevel === null || requiredCertLevel < 0 || requiredCertLevel > 4) return { error: "Choose a certification level" };
  if (difficultyLevel === null || difficultyLevel < 1 || difficultyLevel > 5) return { error: "Choose a difficulty" };
  if (travelTimeMinutes === null || travelTimeMinutes < 0) return { error: "Enter the travel time in minutes" };
  if (maxDiversPerTrip === null || maxDiversPerTrip < 1) return { error: "Max divers must be at least 1" };
  if ((tempMin === null) !== (tempMax === null) || (tempMin !== null && tempMax! < tempMin)) {
    return { error: "Give both water temperatures, with the maximum at least the minimum" };
  }

  // Translations left empty take the English text.
  const translated = (field: "name" | "description", lang: string) =>
    text(formData, `${field}${lang}`) || (field === "name" ? nameEn : descriptionEn);

  const data: Partial<DiveSiteData> = {
    nameEn,
    nameEs: translated("name", "Es"),
    nameDe: translated("name", "De"),
    nameFr: translated("name", "Fr"),
    descriptionEn,
    descriptionEs: translated("description", "Es"),
    descriptionDe: translated("description", "De"),
    descriptionFr: translated("description", "Fr"),
    latitude,
    longitude,
    depthMin,
    depthMax,
    requiredCertLevel,
    difficultyLevel,
    travelTimeMinutes,
    maxDiversPerTrip,
    typicalVisibility,
    // Required columns: left empty, they take the database defaults.
    typicalCurrent: text(formData, "typicalCurrent") || "none",
    accessibility: text(formData, "accessibility") || "boat_only",
  };
  // The list and temperature fields are free-form JSON. On edit they are only
  // sent when changed, so values this form cannot show are not overwritten.
  const json = {
    marineLife: () => list(text(formData, "marineLife")),
    pointsOfInterest: () => list(text(formData, "pointsOfInterest")),
    bestSeason: () => list(text(formData, "bestSeason")),
    facilities: () => list(text(formData, "facilities")),
  } as const;
  for (const [key, value] of Object.entries(json)) {
    if (!id || text(formData, key) !== text(formData, `${key}_initial`)) {
      (data as Record<string, unknown>)[key] = value();
    }
  }
  const tempChanged = `${tempMin ?? ""}|${tempMax ?? ""}` !== text(formData, "temp_initial");
  if (!id || tempChanged) data.waterTempRange = tempMin === null ? {} : { min: tempMin, max: tempMax };

  // Left out of a create rather than sent as null.
  if (!id && data.typicalVisibility === null) delete data.typicalVisibility;
  try {
    if (id) await updateDiveSite(id, data as DiveSiteData);
    else await createDiveSite(data as DiveSiteData);
  } catch (e) {
    return fail(e, "The dive site could not be saved");
  }
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=sites");
}

export async function removeSite(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  try {
    await deleteDiveSite(text(formData, "id"));
  } catch (e) {
    return fail(e, "The dive site could not be deleted");
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function saveUser(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const id = text(formData, "userId");
  const name = text(formData, "name") || null;
  const role = text(formData, "role") as UserRole;
  if (!USER_ROLES.includes(role)) return { error: "Choose a role" };
  try {
    if (id) {
      // Only sent for staff, when the checkbox is shown (not for yourself).
      const isActive = formData.has("activeShown") && role !== "CUSTOMER" ? formData.get("isActive") === "on" : undefined;
      await updateUser(id, { name, role, isActive });
    } else {
      const email = text(formData, "email");
      // Passwords are not trimmed: spaces are allowed in them.
      const password = String(formData.get("password") ?? "");
      if (!email) return { error: "Enter the email address" };
      const invalid = newPasswordError(password, String(formData.get("confirmPassword") ?? ""));
      if (invalid) return { error: invalid };
      await createUser({ email, password, name, role });
    }
  } catch (e) {
    return fail(e, "The user could not be saved");
  }
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=users");
}

export async function removeUser(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  try {
    await deleteUser(text(formData, "id"));
  } catch (e) {
    return fail(e, "The user could not be deleted");
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function resetUserPassword(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const password = String(formData.get("password") ?? "");
  const invalid = newPasswordError(password, String(formData.get("confirmPassword") ?? ""));
  if (invalid) return { error: invalid };
  try {
    await setUserPassword(text(formData, "userId"), password);
  } catch (e) {
    return fail(e, "The password could not be changed");
  }
  return { ok: true };
}

const PRICE = /^\d{1,5}([.,]\d{1,2})?$/; // up to 99999.99; a comma works as the decimal point

// A price field: a number, null when empty, or undefined when invalid.
function price(raw: string) {
  if (raw === "") return null;
  return PRICE.test(raw) ? Number(raw.replace(",", ".")) : undefined;
}

// The whole price list; the API replaces it in one go.
export async function savePricing(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const activities = {} as Record<ActivityPriceKey, number | null>;
  for (const [key, label] of Object.entries(ACTIVITY_PRICE_LABELS) as [ActivityPriceKey, string][]) {
    const value = price(text(formData, `activity_${key}`));
    if (value === undefined) return { error: `${label}: enter a price such as 45 or 45.50, or leave it empty` };
    activities[key] = value;
  }

  const equipment = {} as Record<EquipmentPriceKey, number>;
  const equipmentLabels = { ...EQUIPMENT_PRICE_LABELS, fullPackage: "Full package" };
  for (const [key, label] of Object.entries(equipmentLabels) as [EquipmentPriceKey, string][]) {
    const value = price(text(formData, `equipment_${key}`));
    if (value === undefined || value === null) return { error: `${label}: enter a price such as 8 or 8.50` };
    equipment[key] = value;
  }

  const column = (name: string) => formData.getAll(name).map((v) => String(v).trim());
  const [mins, tourist, local, recurrent] = ["tierMin", "tierTourist", "tierLocal", "tierRecurrent"].map(column);
  if (mins.length === 0) return { error: "Keep at least one fun dive tier" };
  const funDiveTiers: FunDiveTier[] = [];
  for (let i = 0; i < mins.length; i++) {
    const minDives = Number(mins[i]);
    if (!/^\d{1,3}$/.test(mins[i]) || minDives < 1) return { error: `Tier ${i + 1}: "from dives" must be a whole number from 1` };
    const rates = [tourist[i], local[i], recurrent[i]].map((r) => price(r ?? ""));
    if (rates.some((r) => r === undefined || r === null)) {
      return { error: `Tier from ${minDives} dives: enter all three rates` };
    }
    funDiveTiers.push({ minDives, tourist: rates[0]!, local: rates[1]!, recurrent: rates[2]! });
  }
  funDiveTiers.sort((a, b) => a.minDives - b.minDives);
  if (funDiveTiers[0].minDives !== 1) return { error: "The first tier must start at 1 dive" };
  if (new Set(funDiveTiers.map((t) => t.minDives)).size !== funDiveTiers.length) {
    return { error: "Two tiers start at the same number of dives" };
  }

  try {
    await updatePricing({ activities, equipment, funDiveTiers });
  } catch (e) {
    return fail(e, "The prices could not be saved");
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
