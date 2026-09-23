"use client";

import { useActionState } from "react";
import { checkIn, type CheckInState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function CheckInButton({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<CheckInState, FormData>(checkIn, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Checking in…" : "Check In"}
      </Button>
      {state?.error && (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
