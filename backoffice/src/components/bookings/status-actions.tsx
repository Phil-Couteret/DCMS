"use client";

import { useActionState } from "react";
import { changeStatus, type StatusActionState } from "@/app/dashboard/bookings/actions";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/lib/api";
import { TRANSITIONS } from "@/lib/bookings";
import { useT } from "@/lib/i18n/client";

export function StatusActions({ bookingId, status }: { bookingId: string; status: BookingStatus }) {
  const [state, action, pending] = useActionState<StatusActionState, FormData>(changeStatus, null);
  const t = useT();
  const transitions = TRANSITIONS[status];
  if (transitions.length === 0) return <span className="text-xs text-zinc-400">—</span>;

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="flex flex-wrap justify-end gap-1.5">
        {transitions.map((tr) => (
          <Button
            key={tr.to}
            type="submit"
            name="status"
            value={tr.to}
            size="sm"
            variant={tr.to === "CANCELLED" || tr.to === "NO_SHOW" ? "outline" : "default"}
            disabled={pending}
          >
            {t(tr.label)}
          </Button>
        ))}
      </div>
      {state?.error && (
        <p role="alert" className="max-w-64 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
