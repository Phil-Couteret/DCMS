"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, createTank, deleteTank, importTanks, updateTank, type ImportResult, type TankData, type TankSize } from "@/lib/api";
import { csvUpload } from "@/lib/csv-upload";
import { getT } from "@/lib/i18n/server";
import { TANK_SIZES } from "@/lib/tanks";

export type TankFormState = { error?: string; ok?: boolean } | null;
export type TankImportState = { error?: string; result?: ImportResult } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function message(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

// The tanks list (with its filters) to go back to; anything else: the plain list.
function back(formData: FormData) {
  const to = text(formData, "returnTo");
  return to.startsWith("/dashboard/equipment?") ? to : "/dashboard/equipment?tab=tanks";
}

export async function saveTank(_prev: TankFormState, formData: FormData): Promise<TankFormState> {
  const id = text(formData, "tankId");
  const serialNumber = text(formData, "serialNumber");
  const size = text(formData, "size") as TankSize;
  const locationId = text(formData, "locationId");
  const visual = text(formData, "visualInspectionDate");
  const hydro = text(formData, "hydrostaticTestDate");
  const status = text(formData, "status");
  const today = new Date().toISOString().slice(0, 10);
  const t = await getT();
  if (!serialNumber) return { error: t("Enter the serial number") };
  if (!TANK_SIZES.includes(size)) return { error: t("Choose a size") };
  if (locationId && !UUID.test(locationId)) return { error: t("Choose a location") };
  for (const [value, invalid, future] of [
    [
      visual,
      "Enter a valid visual inspection date, or leave it empty",
      "The visual inspection date is when it was last done; it cannot be in the future",
    ],
    [
      hydro,
      "Enter a valid hydrostatic test date, or leave it empty",
      "The hydrostatic test date is when it was last done; it cannot be in the future",
    ],
  ] as const) {
    if (value && !ISO_DATE.test(value)) return { error: t(invalid) };
    // A day of slack for the center being ahead of UTC.
    if (value && value > addDay(today)) return { error: t(future) };
  }
  if (status !== "ACTIVE" && status !== "RETIRED") return { error: t("Choose a status") };
  const data: TankData = {
    serialNumber,
    size,
    locationId: locationId || null,
    visualInspectionDate: visual || null,
    hydrostaticTestDate: hydro || null,
    status,
    notes: text(formData, "notes") || null,
  };
  try {
    if (id) await updateTank(id, data);
    else await createTank(data);
  } catch (e) {
    return { error: message(e, t("The tank could not be saved")) };
  }
  revalidatePath("/dashboard/equipment");
  redirect(back(formData));
}

export async function removeTank(_prev: TankFormState, formData: FormData): Promise<TankFormState> {
  const t = await getT();
  try {
    await deleteTank(text(formData, "id"));
  } catch (e) {
    return { error: message(e, t("The tank could not be deleted")) };
  }
  revalidatePath("/dashboard/equipment");
  return { ok: true };
}

export async function importTanksCsv(_prev: TankImportState, formData: FormData): Promise<TankImportState> {
  const t = await getT();
  const upload = csvUpload(formData);
  if ("error" in upload) return { error: t(upload.error) };
  const locationId = text(formData, "locationId");
  if (locationId) {
    if (!UUID.test(locationId)) return { error: t("Choose a location") };
    upload.form.set("locationId", locationId);
  }
  try {
    const result = await importTanks(upload.form);
    revalidatePath("/dashboard/equipment");
    return { result };
  } catch (e) {
    return { error: message(e, t("The file could not be imported")) };
  }
}

function addDay(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
