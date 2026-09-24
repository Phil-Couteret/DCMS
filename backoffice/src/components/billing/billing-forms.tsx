"use client";

import { useEffect, useRef, useState } from "react";
import { createFromBooking, recordPayment, recordRefund, type FormState } from "@/app/dashboard/billing/actions";
import { Button } from "@/components/ui/button";
import { METHOD_LABELS, PAYMENT_METHODS } from "@/lib/billing";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

function ErrorLine({ state }: { state: FormState }) {
  return state?.error ? (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
      {state.error}
    </p>
  ) : null;
}

export function NewInvoiceForm({ bookingId }: { bookingId?: string }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(createFromBooking, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className={label}>
        Booking ID
        <input name="bookingId" required defaultValue={bookingId} placeholder="Booking reference" className={`${control} font-mono`} />
      </label>
      <p className="text-sm text-zinc-500">
        Invoice is created from a booking. Enter the booking ID from the bookings page.
      </p>
      <ErrorLine state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invoice"}
      </Button>
    </form>
  );
}

// Opens inline; closes itself once the action succeeds.
function useInline(state: FormState) {
  const [open, setOpen] = useState(false);
  const last = useRef(state);
  useEffect(() => {
    if (state !== last.current && state?.ok) setOpen(false);
    last.current = state;
  }, [state]);
  return [open, setOpen] as const;
}

export function AddPaymentForm({ invoiceId, balance }: { invoiceId: string; balance: string }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(recordPayment, null);
  const [open, setOpen] = useInline(state);
  if (!open) return <Button onClick={() => setOpen(true)}>Add Payment</Button>;
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={label}>
          Amount (€)
          <input name="amount" required inputMode="decimal" defaultValue={balance} pattern="\d+(\.\d{1,2})?" className={control} />
        </label>
        <label className={label}>
          Method
          <select name="method" required defaultValue="CASH" className={control}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Stripe payment ID (optional)
          <input name="stripePaymentId" maxLength={255} placeholder="pi_…" className={`${control} font-mono`} />
        </label>
      </div>
      <p className="text-xs text-zinc-500">Cash and transfer count as received at once. Card payments start as pending.</p>
      <ErrorLine state={state} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Record payment"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </form>
  );
}

export function RefundForm({ invoiceId, paymentId, refundable }: { invoiceId: string; paymentId: string; refundable: string }) {
  const [state, onSubmit, pending] = useFormAction<FormState>(recordRefund, null);
  const [open, setOpen] = useInline(state);
  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Refund
      </Button>
    );
  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-3 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-200">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
        <label className={label}>
          Amount (€)
          <input name="amount" required inputMode="decimal" defaultValue={refundable} pattern="\d+(\.\d{1,2})?" className={control} />
        </label>
        <label className={label}>
          Reason
          <input name="reason" required maxLength={500} placeholder="e.g. Dive cancelled for weather" className={control} />
        </label>
      </div>
      <ErrorLine state={state} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Record refund"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </form>
  );
}
