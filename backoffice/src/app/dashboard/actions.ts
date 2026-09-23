"use server";

import { revalidatePath } from "next/cache";
import { ApiError, checkInBooking } from "@/lib/api";

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
