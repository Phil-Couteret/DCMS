"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  updateUser,
  type BoatData,
  type DiveSiteData,
  type UserRole,
} from "@/lib/api";
import { BOAT_STATUSES, newPasswordError, USER_ROLES } from "@/lib/settings";

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
  try {
    await updateSettings({
      name,
      legalName: text(formData, "legalName") || null,
      address: text(formData, "address") || null,
      phone: text(formData, "phone") || null,
      email: text(formData, "email") || null,
      website: text(formData, "website") || null,
      taxName,
      taxRate,
    });
  } catch (e) {
    return fail(e, "Settings could not be saved");
  }
  revalidatePath("/dashboard/settings");
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
      await updateUser(id, { name, role });
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
