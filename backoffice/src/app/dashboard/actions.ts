"use server";

import { revalidatePath } from "next/cache";
import { ApiError, changeOwnPassword, checkInBooking } from "@/lib/api";
import { newPasswordError } from "@/lib/settings";

export type CheckInState = { error: string } | null;

export async function checkIn(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  const id = String(formData.get("bookingId") ?? "");
  try {
    await checkInBooking(id);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Check-in failed" };
  }
  revalidatePath("/dashboard");
  return null;
}

export type PasswordState = { error?: string; ok?: boolean } | null;

// The signed-in user's own password. Passwords are not trimmed.
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const current = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!current) return { error: "Enter your current password" };
  const invalid = newPasswordError(password, String(formData.get("confirmPassword") ?? ""));
  if (invalid) return { error: invalid };
  if (password === current) return { error: "The new password must be different from the current one" };
  try {
    await changeOwnPassword(current, password);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "The password could not be changed" };
  }
  return { ok: true };
}
