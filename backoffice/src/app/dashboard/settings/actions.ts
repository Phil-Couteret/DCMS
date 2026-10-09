"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_update } from "@/auth";
import {
  ApiError,
  createBoat,
  createBono,
  deleteBono,
  updateBono,
  type BonoData,
  createDiveSite,
  createLocation,
  deleteLocation,
  setResourceLocation,
  updateLocation,
  type LocationData,
  type LocationType,
  createUser,
  cancelStaffInvitation,
  inviteStaff,
  resendStaffInvitation,
  type StaffRole,
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
  type DivePack,
  type BoatData,
  type EquipmentPriceKey,
  type FunDiveTier,
  type InsuranceOptionData,
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
import { getT } from "@/lib/i18n/server";

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
  const t = await getT();
  const name = text(formData, "name");
  const taxName = text(formData, "taxName");
  const taxRateRaw = text(formData, "taxRate");
  const taxRate = Number(taxRateRaw);
  if (!name) return { error: t("Enter the center's name") };
  if (!taxName) return { error: t("Enter the tax name") };
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(taxRateRaw) || taxRate > 100) {
    return { error: t("Tax rate must be a percentage between 0 and 100, with at most 2 decimals") };
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
      return { error: t("Invoice prefixes take 1 to 10 capital letters or digits") };
    }
    const visualInspectionIntervalMonths = int(formData, "visualInspectionIntervalMonths");
    const hydrostaticTestIntervalMonths = int(formData, "hydrostaticTestIntervalMonths");
    for (const months of [visualInspectionIntervalMonths, hydrostaticTestIntervalMonths]) {
      if (months === null || !Number.isInteger(months) || months < 1 || months > 120) {
        return { error: t("Tank test intervals are whole numbers of months, from 1 to 120") };
      }
    }
    const logoUrl = text(formData, "logoUrl");
    if (logoUrl && !logoUrl.startsWith("https://")) return { error: t("The logo URL must start with https://") };
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
      visualInspectionIntervalMonths,
      hydrostaticTestIntervalMonths,
    });
  }
  try {
    await updateSettings(data);
  } catch (e) {
    return fail(e, t("Settings could not be saved"));
  }
  // Every page shows dates and amounts in the session's time zone and
  // currency: refresh this session now (others within 5 minutes).
  await unstable_update({});
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function saveBoat(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  const id = text(formData, "boatId");
  const name = text(formData, "name");
  const registrationNumber = text(formData, "registrationNumber");
  const capacity = int(formData, "capacity");
  const status = text(formData, "status");
  const lengthRaw = text(formData, "length");
  const length = lengthRaw === "" ? null : Number(lengthRaw);
  const dates = ["insuranceExpiry", "lastServiceDate", "nextServiceDate"] as const;

  if (!name) return { error: t("Enter the boat's name") };
  if (!registrationNumber) return { error: t("Enter the registration number") };
  if (capacity === null || !Number.isInteger(capacity) || capacity < 1) return { error: t("Capacity must be at least 1") };
  if (!BOAT_STATUSES.includes(status) && status !== text(formData, "status_initial")) {
    return { error: t("Choose a status") };
  }
  if (length !== null && (!Number.isFinite(length) || length < 0 || length > 999.99)) {
    return { error: t("Length must be between 0 and 999.99 m") };
  }
  for (const d of dates) {
    const v = text(formData, d);
    if (v && !ISO_DATE.test(v)) return { error: t("Enter valid dates") };
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
    locationId: text(formData, "locationId") || null,
  };
  // Creates send only the fields that are set.
  const payload = id ? data : (Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)) as BoatData);
  try {
    if (id) await updateBoat(id, payload);
    else await createBoat(payload);
  } catch (e) {
    return fail(e, t("The boat could not be saved"));
  }
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=boats");
}

export async function removeBoat(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  try {
    await deleteBoat(text(formData, "id"));
  } catch (e) {
    return fail(e, t("The boat could not be deleted"));
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
  const t = await getT();
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

  if (!nameEn) return { error: t("Enter the site's English name") };
  if (!descriptionEn) return { error: t("Enter the English description") };
  if (text(formData, "latitude") === "" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: t("Latitude must be between -90 and 90") };
  }
  if (text(formData, "longitude") === "" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: t("Longitude must be between -180 and 180") };
  }
  if (depthMin === null || depthMax === null || depthMin < 0 || depthMax < depthMin) {
    return { error: t("Depths must be whole metres, with the maximum at least the minimum") };
  }
  if (requiredCertLevel === null || requiredCertLevel < 0 || requiredCertLevel > 4) return { error: t("Choose a certification level") };
  if (difficultyLevel === null || difficultyLevel < 1 || difficultyLevel > 5) return { error: t("Choose a difficulty") };
  if (travelTimeMinutes === null || travelTimeMinutes < 0) return { error: t("Enter the travel time in minutes") };
  if (maxDiversPerTrip === null || maxDiversPerTrip < 1) return { error: t("Max divers must be at least 1") };
  if ((tempMin === null) !== (tempMax === null) || (tempMin !== null && tempMax! < tempMin)) {
    return { error: t("Give both water temperatures, with the maximum at least the minimum") };
  }

  // Translations left empty take the English text.
  const translated = (field: "name" | "description", lang: string) =>
    text(formData, `${field}${lang}`) || (field === "name" ? nameEn : descriptionEn);

  const data: Partial<DiveSiteData> = {
    locationId: text(formData, "locationId") || null,
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
    isShore: formData.get("isShore") === "on",
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
    return fail(e, t("The dive site could not be saved"));
  }
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=sites");
}

export async function removeSite(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  try {
    await deleteDiveSite(text(formData, "id"));
  } catch (e) {
    return fail(e, t("The dive site could not be deleted"));
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function saveUser(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  const id = text(formData, "userId");
  const name = text(formData, "name") || null;
  const role = text(formData, "role") as UserRole;
  if (!USER_ROLES.includes(role)) return { error: t("Choose a role") };
  try {
    if (id) {
      // Only sent for staff, when the checkbox is shown (not for yourself).
      const isActive = formData.has("activeShown") && role !== "CUSTOMER" ? formData.get("isActive") === "on" : undefined;
      await updateUser(id, { name, role, isActive });
    } else {
      const email = text(formData, "email");
      // Passwords are not trimmed: spaces are allowed in them.
      const password = String(formData.get("password") ?? "");
      if (!email) return { error: t("Enter the email address") };
      const invalid = newPasswordError(password, String(formData.get("confirmPassword") ?? ""), t);
      if (invalid) return { error: invalid };
      await createUser({ email, password, name, role });
    }
  } catch (e) {
    return fail(e, t("The user could not be saved"));
  }
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=users");
}

export async function removeUser(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  try {
    await deleteUser(text(formData, "id"));
  } catch (e) {
    return fail(e, t("The user could not be deleted"));
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function resetUserPassword(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  const password = String(formData.get("password") ?? "");
  const invalid = newPasswordError(password, String(formData.get("confirmPassword") ?? ""), t);
  if (invalid) return { error: invalid };
  try {
    await setUserPassword(text(formData, "userId"), password);
  } catch (e) {
    return fail(e, t("The password could not be changed"));
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
  const t = await getT();
  const activities = {} as Record<ActivityPriceKey, number | null>;
  for (const [key, label] of Object.entries(ACTIVITY_PRICE_LABELS) as [ActivityPriceKey, string][]) {
    const value = price(text(formData, `activity_${key}`));
    if (value === undefined) return { error: t("{item}: enter a price such as 45 or 45.50, or leave it empty", { item: t(label) }) };
    activities[key] = value;
  }

  const equipment = {} as Record<EquipmentPriceKey, number>;
  const equipmentLabels = { ...EQUIPMENT_PRICE_LABELS, fullPackage: "Full package" };
  for (const [key, label] of Object.entries(equipmentLabels) as [EquipmentPriceKey, string][]) {
    const value = price(text(formData, `equipment_${key}`));
    if (value === undefined || value === null) return { error: t("{item}: enter a price such as 8 or 8.50", { item: t(label) }) };
    equipment[key] = value;
  }

  const column = (name: string) => formData.getAll(name).map((v) => String(v).trim());
  const [mins, tourist, local, recurrent] = ["tierMin", "tierTourist", "tierLocal", "tierRecurrent"].map(column);
  if (mins.length === 0) return { error: t("Keep at least one fun dive tier") };
  const funDiveTiers: FunDiveTier[] = [];
  for (let i = 0; i < mins.length; i++) {
    const minDives = Number(mins[i]);
    if (!/^\d{1,3}$/.test(mins[i]) || minDives < 1) return { error: t('Tier {n}: "from dives" must be a whole number from 1', { n: i + 1 }) };
    const rates = [tourist[i], local[i], recurrent[i]].map((r) => price(r ?? ""));
    if (rates.some((r) => r === undefined || r === null)) {
      return { error: t("Tier from {count} dives: enter all three rates", { count: minDives }) };
    }
    funDiveTiers.push({ minDives, tourist: rates[0]!, local: rates[1]!, recurrent: rates[2]! });
  }
  funDiveTiers.sort((a, b) => a.minDives - b.minDives);
  if (funDiveTiers[0].minDives !== 1) return { error: t("The first tier must start at 1 dive") };
  if (new Set(funDiveTiers.map((t) => t.minDives)).size !== funDiveTiers.length) {
    return { error: t("Two tiers start at the same number of dives") };
  }

  const addOns = {
    nightDive: price(text(formData, "addOn_nightDive")),
    personalInstructor: price(text(formData, "addOn_personalInstructor")),
    transfer: price(text(formData, "addOn_transfer")),
  };
  if (addOns.transfer == null) return { error: t("Transfer fee: enter a price such as 15") };
  if (addOns.nightDive == null) return { error: t("Night dive surcharge: enter a price such as 20") };
  if (addOns.personalInstructor == null) return { error: t("Personal instructor fee: enter a price such as 100") };

  const [insIds, insNames, insDays, insPrices] = ["insId", "insName", "insDays", "insPrice"].map(column);
  const insurance: InsuranceOptionData[] = [];
  for (let i = 0; i < insNames.length; i++) {
    const name = insNames[i].replace(/\s+/g, " ");
    if (!name) return { error: t("Insurance period {n}: enter a name, such as 1 week", { n: i + 1 }) };
    if (name.length > 40) return { error: t("Insurance period {n}: the name is at most 40 characters", { n: i + 1 }) };
    const days = Number(insDays[i]);
    if (!/^\d{1,4}$/.test(insDays[i] ?? "") || days < 1 || days > 3660) {
      return { error: t("{name}: the days covered must be a whole number from 1 to 3660", { name }) };
    }
    const periodPrice = price(insPrices[i] ?? "");
    if (periodPrice == null) return { error: t("{name}: enter its price", { name }) };
    insurance.push({ ...(UUID_RE.test(insIds[i] ?? "") && { id: insIds[i] }), name, days, price: periodPrice });
  }
  if (new Set(insurance.map((p) => p.name.toLowerCase())).size !== insurance.length) {
    return { error: t("Two insurance periods have the same name") };
  }

  const [packDives, packPrices] = ["packDives", "packPrice"].map(column);
  const divePacks: DivePack[] = [];
  for (let i = 0; i < packDives.length; i++) {
    const diveCount = Number(packDives[i]);
    if (!/^\d{1,3}$/.test(packDives[i]) || diveCount < 2 || diveCount > 100) {
      return { error: t("Pack {n}: the number of dives must be a whole number from 2 to 100", { n: i + 1 }) };
    }
    const packPrice = price(packPrices[i] ?? "");
    if (packPrice == null) return { error: t("{count}-dive pack: enter its price", { count: diveCount }) };
    divePacks.push({ diveCount, price: packPrice });
  }
  if (new Set(divePacks.map((p) => p.diveCount)).size !== divePacks.length) {
    return { error: t("Two packs have the same number of dives") };
  }

  try {
    await updatePricing({
      activities,
      equipment,
      funDiveTiers,
      addOns: { nightDive: addOns.nightDive, personalInstructor: addOns.personalInstructor, transfer: addOns.transfer },
      divePacks: divePacks.sort((a, b) => a.diveCount - b.diveCount),
      insurance,
    });
  } catch (e) {
    return fail(e, t("The prices could not be saved"));
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// --- Locations ---

const LOCATION_TYPE_VALUES: LocationType[] = ["DIVING", "BIKE", "SURF", "KITE"];

export async function saveLocation(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  const id = text(formData, "locationId");
  const name = text(formData, "name");
  const type = text(formData, "type") as LocationType;
  if (!name) return { error: t("Location name is required") };
  if (!LOCATION_TYPE_VALUES.includes(type)) return { error: t("Choose an activity type") };
  const website = text(formData, "website");
  if (website && !/^https?:\/\//.test(website)) return { error: t("The website must start with http:// or https://") };
  const data: LocationData = {
    name,
    type,
    address: {
      street: text(formData, "street"),
      city: text(formData, "city"),
      postalCode: text(formData, "postalCode"),
      country: text(formData, "country"),
    },
    contactInfo: {
      phone: text(formData, "phone"),
      mobile: text(formData, "mobile"),
      email: text(formData, "email"),
      website,
    },
    isActive: formData.get("isActive") === "on",
  };
  try {
    if (id) await updateLocation(id, data);
    else await createLocation(data);
  } catch (e) {
    return fail(e, t("The location could not be saved"));
  }
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=locations");
}

export async function removeLocation(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  try {
    await deleteLocation(text(formData, "id"));
  } catch (e) {
    return fail(e, t("The location could not be deleted"));
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// The location selector on each boat and dive site row.
export async function assignLocation(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  const kind = text(formData, "kind");
  if (kind !== "boat" && kind !== "site") return { error: t("Unknown item") };
  try {
    await setResourceLocation(kind, text(formData, "id"), text(formData, "locationId") || null);
  } catch (e) {
    return fail(e, t("The location could not be changed"));
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// A government bono (Settings → Bonos). The code is stored upper case.
export async function saveBono(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  const id = text(formData, "bonoId");
  const code = text(formData, "code").toUpperCase();
  const type = text(formData, "type");
  const value = Number(text(formData, "discountValue").replace(",", "."));
  const description = text(formData, "description");
  const validFrom = text(formData, "validFrom");
  const validTo = text(formData, "validTo");
  const usageLimit = int(formData, "usageLimit");
  if (!/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(code)) return { error: t("The code must be 2 to 40 letters, digits or dashes") };
  if (type !== "PERCENTAGE" && type !== "FIXED") return { error: t("Choose the kind of discount") };
  if (!Number.isFinite(value) || value <= 0 || Math.round(value * 100) !== value * 100) {
    return { error: t("Enter the discount as a positive number with at most 2 decimals") };
  }
  if (type === "PERCENTAGE" && value > 100) return { error: t("A percentage discount cannot be over 100") };
  if (!description) return { error: t("Enter a description") };
  if (!ISO_DATE.test(validFrom)) return { error: t("Enter the date the bono is valid from") };
  if (validTo && !ISO_DATE.test(validTo)) return { error: t("Enter a valid end date, or leave it empty") };
  if (validTo && validTo < validFrom) return { error: t("The end date cannot be before the start date") };
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    return { error: t("The usage limit is a whole number of at least 1, or empty for no limit") };
  }
  const data: BonoData = {
    code,
    type,
    discountValue: value,
    description,
    validFrom,
    validTo: validTo || null,
    usageLimit,
    isActive: formData.get("isActive") === "on",
  };
  try {
    if (id) await updateBono(id, data);
    else await createBono(data);
  } catch (e) {
    return fail(e, t("The bono could not be saved"));
  }
  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?tab=bonos");
}

export async function removeBono(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  try {
    await deleteBono(text(formData, "id"));
  } catch (e) {
    return fail(e, t("The bono could not be deleted"));
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

// --- Staff invitations ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function inviteStaffAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const t = await getT();
  const email = text(formData, "email").toLowerCase();
  const role = text(formData, "role") as StaffRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: t("Enter a valid email address") };
  if (role !== "ADMIN" && role !== "INSTRUCTOR") return { error: t("Choose a role") };
  let emailed: boolean;
  try {
    emailed = (await inviteStaff({ email, role })).emailed;
  } catch (e) {
    return fail(e, t("The invitation could not be sent"));
  }
  revalidatePath("/dashboard/settings");
  redirect(`/dashboard/settings?${new URLSearchParams({ tab: "users", invited: email, ...(!emailed && { failed: "1" }) })}`);
}

// For ActionButton: { ok, message } or { error }.
export async function resendInvitationAction(
  _prev: { error?: string; ok?: boolean; message?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; message?: string }> {
  const t = await getT();
  const id = text(formData, "id");
  if (!UUID_RE.test(id)) return { error: t("Unknown invitation") };
  try {
    const sent = await resendStaffInvitation(id);
    revalidatePath("/dashboard/settings");
    return sent.emailed ? { ok: true, message: t("Sent again") } : { error: t("The email could not be sent; try again later") };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("The invitation could not be sent") };
  }
}

export async function cancelInvitationAction(
  _prev: { error?: string; ok?: boolean; message?: string } | null,
  formData: FormData,
): Promise<{ error?: string; ok?: boolean; message?: string }> {
  const t = await getT();
  const id = text(formData, "id");
  if (!UUID_RE.test(id)) return { error: t("Unknown invitation") };
  try {
    await cancelStaffInvitation(id);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("The invitation could not be cancelled") };
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

