"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { saveBooking, type BookingFormState } from "@/app/dashboard/bookings/actions";
import { Button } from "@/components/ui/button";
import type { Boat, BookingStatus, DiveSiteOption, Language, TimeSlot } from "@/lib/api";
import { ACTIVITY_LABELS, EQUIPMENT_ITEMS, SLOT_LABELS, SOURCE_LABELS, SOURCES } from "@/lib/bookings";
import { LANGUAGES } from "@/lib/customers";
import { TRIP_SLOTS } from "@/lib/trips";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";
const section = "space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200";

export interface CustomerOption {
  id: string;
  label: string; // "First Last · email"
  search: string; // lower-cased text matched by the search box
}

export interface BookingFormValues {
  customerId: string;
  activityType: string;
  date: string;
  timeSlot: TimeSlot;
  boatId: string;
  siteId: string;
  participantCount: number;
  bookingSource: string;
  status: BookingStatus;
  equipment: string[]; // "key" or "key:size"
  notes: string;
}

const MAX_MATCHES = 8;

function CustomerPicker({
  customers,
  selectedId,
  onSelect,
}: {
  customers: CustomerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = customers.find((c) => c.id === selectedId);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.search.includes(q)).slice(0, MAX_MATCHES);
  }, [customers, query]);

  if (selected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-zinc-50 px-3 py-2 ring-1 ring-zinc-200">
        <span className="text-sm text-zinc-900">{selected.label}</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => onSelect("")}>
          Change
        </Button>
      </div>
    );
  }
  return (
    <div>
      <label className={label}>
        Search by name, email or phone
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Garcia"
          className={control}
          autoComplete="off"
        />
      </label>
      {query.trim() && (
        <ul className="mt-2 divide-y divide-zinc-100 rounded-md ring-1 ring-zinc-200">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No customer matches. Use “New customer” instead.</li>
          ) : (
            matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="block w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50"
                >
                  {c.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function BookingForm({
  bookingId,
  initial,
  customers,
  boats,
  sites,
  cancelHref,
}: {
  bookingId?: string;
  initial: BookingFormValues;
  customers: CustomerOption[];
  boats: Boat[];
  sites: DiveSiteOption[];
  cancelHref: string;
}) {
  const [state, onSubmit, pending] = useFormAction<BookingFormState>(saveBooking, null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState(initial.customerId);
  // A customer created by a submit whose booking then failed.
  const [created, setCreated] = useState<CustomerOption | null>(null);
  const [equipment, setEquipment] = useState(() => new Set(initial.equipment.map((e) => e.split(":")[0])));
  const initialSizes = Object.fromEntries(
    initial.equipment.filter((e) => e.includes(":")).map((e) => e.split(":") as [string, string]),
  );

  useEffect(() => {
    if (!state?.createdCustomer) return;
    const { id, label: text } = state.createdCustomer;
    setCreated({ id, label: text, search: text.toLowerCase() });
    setCustomerId(id);
    setMode("existing");
  }, [state]);

  const options = created && !customers.some((c) => c.id === created.id) ? [created, ...customers] : customers;

  const toggle = (key: string, on: boolean) =>
    setEquipment((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}
      <input type="hidden" name="customerMode" value={mode} />
      <input type="hidden" name="customerId" value={mode === "existing" ? customerId : ""} />

      <section className={section}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-zinc-900">Customer</h2>
          <div className="flex gap-1" role="group" aria-label="Customer">
            <Button type="button" size="sm" variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode("existing")}>
              Existing customer
            </Button>
            <Button type="button" size="sm" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
              New customer
            </Button>
          </div>
        </div>
        {mode === "existing" ? (
          <CustomerPicker customers={options} selectedId={customerId} onSelect={setCustomerId} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={label}>
              First name
              <input name="new_firstName" required maxLength={100} className={control} />
            </label>
            <label className={label}>
              Last name
              <input name="new_lastName" required maxLength={100} className={control} />
            </label>
            <label className={label}>
              Email
              <input type="email" name="new_email" required maxLength={254} className={control} />
            </label>
            <label className={label}>
              Phone (optional)
              <input type="tel" name="new_phone" maxLength={40} className={control} />
            </label>
            <label className={label}>
              Country code
              <input name="new_country" required maxLength={60} placeholder="ES, DE, GB…" className={control} />
            </label>
            <label className={label}>
              Language
              <select name="new_language" defaultValue={"EN" satisfies Language} className={control}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-zinc-500 sm:col-span-2">
              The customer is saved with the booking. Their full profile can be completed later.
            </p>
          </div>
        )}
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">Dive</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={label}>
            Activity
            <select name="activityType" defaultValue={initial.activityType} required className={control}>
              {Object.entries(ACTIVITY_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Date
            <input type="date" name="date" required defaultValue={initial.date} className={control} />
          </label>
          <label className={label}>
            Time slot
            <select name="timeSlot" defaultValue={initial.timeSlot} className={control}>
              {TRIP_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {SLOT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Boat
            <select name="boatId" required defaultValue={initial.boatId} className={control}>
              <option value="" disabled>
                Choose…
              </option>
              {boats.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.capacity} places){b.status !== "active" ? ` · ${b.status}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Dive site
            <select name="siteId" defaultValue={initial.siteId} className={control}>
              <option value="">Not assigned yet</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameEn}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Participants
            <input
              type="number"
              name="participantCount"
              required
              min={1}
              step={1}
              defaultValue={initial.participantCount}
              className={control}
            />
          </label>
          <label className={label}>
            Source
            <select name="bookingSource" defaultValue={initial.bookingSource} className={control}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          {!bookingId && (
            <label className={label}>
              Status
              <select name="status" defaultValue={initial.status} className={control}>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending (not checked in)</option>
              </select>
            </label>
          )}
        </div>
        <p className="text-xs text-zinc-500">The boat must have room for these participants in that slot.</p>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">Rental equipment</h2>
        <p className="text-xs text-zinc-500">One set per booking. The invoice charges the items ticked here.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EQUIPMENT_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center gap-3">
              <label className="flex min-w-36 items-center gap-2 text-sm text-zinc-900">
                <input
                  type="checkbox"
                  name="equipment"
                  value={item.key}
                  checked={equipment.has(item.key)}
                  onChange={(e) => toggle(item.key, e.target.checked)}
                />
                {item.label}
              </label>
              {item.sizes && (
                <select
                  name={`size_${item.key}`}
                  aria-label={`${item.label} size`}
                  defaultValue={initialSizes[item.key] ?? ""}
                  disabled={!equipment.has(item.key)}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm disabled:opacity-40"
                >
                  <option value="">Size…</option>
                  {item.sizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={section}>
        <label className={label}>
          Notes (optional)
          <textarea name="notes" rows={3} maxLength={2000} defaultValue={initial.notes} className={control} />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || (mode === "existing" && !customerId)}>
          {pending ? "Saving…" : bookingId ? "Save changes" : "Create booking"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} />}>
          Cancel
        </Button>
        {mode === "existing" && !customerId && <p className="text-sm text-zinc-500">Choose a customer first.</p>}
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
            {state.createdCustomer && " The new customer was saved and is now selected."}
          </p>
        )}
      </div>
    </form>
  );
}
