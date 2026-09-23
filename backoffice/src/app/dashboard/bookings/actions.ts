"use server";

import { revalidatePath } from "next/cache";
import { ApiError, getBooking, updateBookingStatus, type BookingStatus } from "@/lib/api";
import { isAllowedTransition, STATUSES } from "@/lib/bookings";

export type StatusActionState = { error: string } | null;

export async function changeStatus(
  _prev: StatusActionState,
  formData: FormData,
): Promise<StatusActionState> {
  const id = String(formData.get("bookingId") ?? "");
  const to = String(formData.get("status") ?? "") as BookingStatus;
  if (!STATUSES.includes(to)) return { error: "Unknown status" };

  try {
    // Checked against the current status, not the one the page showed: the
    // booking may have moved since the page was rendered.
    const current = await getBooking(id);
    if (!isAllowedTransition(current.status, to)) {
      return { error: `Cannot move a ${current.status.toLowerCase()} booking to ${to.toLowerCase()}` };
    }
    await updateBookingStatus(id, to);
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : "Update failed" };
  }
  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${id}`);
  revalidatePath("/dashboard");
  return null;
}
