"use server";

import { revalidatePath } from "next/cache";
import { ApiError, changeOwnPassword, checkInBooking } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { newPasswordError } from "@/lib/settings";

export type CheckInState = { error: string } | null;

export async function checkIn(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  const t = await getT();
  const id = String(formData.get("bookingId") ?? "");
  try {
    await checkInBooking(id);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("Check-in failed") };
  }
  revalidatePath("/dashboard");
  return null;
}

export type PasswordState = { error?: string; ok?: boolean } | null;

// The signed-in user's own password. Passwords are not trimmed.
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const t = await getT();
  const current = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!current) return { error: t("Enter your current password") };
  const invalid = newPasswordError(password, String(formData.get("confirmPassword") ?? ""), t);
  if (invalid) return { error: invalid };
  if (password === current) return { error: t("The new password must be different from the current one") };
  try {
    await changeOwnPassword(current, password);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : t("The password could not be changed") };
  }
  return { ok: true };
}
