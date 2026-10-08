"use client";

import { useEffect, useRef, useState } from "react";
import { createBookingAction, createCustomerAction, type PortalFormState } from "@/app/partner/actions";
import { Button } from "@/components/ui/button";
import type { PortalCustomer } from "@/lib/api";
import { ACTIVITY_LABELS } from "@/lib/bookings";
import { SLOT_NAMES, TRIP_SLOTS } from "@/lib/trips";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

function Feedback({ state, success }: { state: PortalFormState; success: string }) {
  if (state?.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm text-green-700">{success}</p>;
  return null;
}

// Behind a button, so the lists stay at the top of the page.
function Expandable({ label: name, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) return <Button onClick={() => setOpen(true)}>{name}</Button>;
  return <div className="w-full rounded-xl bg-white p-5 ring-1 ring-zinc-200">{children(() => setOpen(false))}</div>;
}

function useResettingForm(action: typeof createCustomerAction) {
  const [state, onSubmit, pending] = useFormAction<PortalFormState>(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return { state, onSubmit, pending, form };
}

// prefix: "" in the customer form, "new_" inside the booking form.
function CustomerFields({ prefix = "" }: { prefix?: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className={label}>
        First name
        <input name={`${prefix}firstName`} required maxLength={100} className={control} />
      </label>
      <label className={label}>
        Last name
        <input name={`${prefix}lastName`} required maxLength={100} className={control} />
      </label>
      <label className={label}>
        Email
        <input name={`${prefix}email`} type="email" required maxLength={254} className={control} />
      </label>
      <label className={label}>
        Phone (optional)
        <input name={`${prefix}phone`} maxLength={40} className={control} />
      </label>
      <label className={label}>
        Nationality (country code)
        <input name={`${prefix}country`} required maxLength={2} placeholder="e.g. DE" className={`${control} uppercase`} />
      </label>
      <label className={label}>
        Date of birth (optional)
        <input name={`${prefix}birthdate`} type="date" className={control} />
      </label>
    </div>
  );
}

export function AddCustomerForm() {
  return (
    <Expandable label="Add customer">
      {(close) => <CustomerFormBody close={close} />}
    </Expandable>
  );
}

function CustomerFormBody({ close }: { close: () => void }) {
  const { state, onSubmit, pending, form } = useResettingForm(createCustomerAction);
  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-4">
      <h3 className="font-semibold text-zinc-900">New customer</h3>
      <CustomerFields />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add customer"}
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          Close
        </Button>
        <Feedback state={state} success="Customer added." />
      </div>
    </form>
  );
}

export function CreateBookingForm({ customers, today }: { customers: PortalCustomer[]; today: string }) {
  return (
    <Expandable label="Create booking">
      {(close) => <BookingFormBody customers={customers} today={today} close={close} />}
    </Expandable>
  );
}

function BookingFormBody({ customers, today, close }: { customers: PortalCustomer[]; today: string; close: () => void }) {
  const { state, onSubmit, pending, form } = useResettingForm(createBookingAction);
  const [mode, setMode] = useState<"existing" | "new">(customers.length > 0 ? "existing" : "new");
  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-4">
      <h3 className="font-semibold text-zinc-900">New booking</h3>
      <input type="hidden" name="mode" value={mode} />
      <div className="flex gap-4 text-sm" role="radiogroup" aria-label="Customer">
        {customers.length > 0 && (
          <label className="flex items-center gap-2">
            <input type="radio" checked={mode === "existing"} onChange={() => setMode("existing")} />
            One of my customers
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />
          New customer
        </label>
      </div>
      {mode === "existing" ? (
        <label className={label}>
          Customer
          <select name="customerId" required defaultValue="" className={control}>
            <option value="" disabled>
              Choose…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} ({c.email})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <CustomerFields prefix="new_" />
          <p className="text-xs text-zinc-500">If the dive center already knows this email, the booking goes to that customer.</p>
        </>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className={label}>
          Activity
          <select name="activityType" required defaultValue="FUN_DIVE" className={control}>
            {Object.entries(ACTIVITY_LABELS).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Date
          <input type="date" name="date" required min={today} defaultValue={today} className={control} />
        </label>
        <label className={label}>
          Time
          <select name="timeSlot" required defaultValue="MORNING" className={control}>
            {TRIP_SLOTS.map((s) => (
              <option key={s} value={s}>
                {SLOT_NAMES[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Divers
          <input type="number" name="participantCount" required min={1} max={20} step={1} defaultValue={1} className={control} />
        </label>
      </div>
      <label className={label}>
        Notes for the dive center (optional)
        <textarea name="notes" rows={2} maxLength={1000} placeholder="e.g. certification level, hotel pick-up" className={control} />
      </label>
      <p className="text-xs text-zinc-500">
        Bookings are priced from the dive center&apos;s price list and start as pending until the center confirms them.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Booking…" : "Create booking"}
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          Close
        </Button>
        <Feedback state={state} success="Booking created. The dive center will confirm it." />
      </div>
    </form>
  );
}
