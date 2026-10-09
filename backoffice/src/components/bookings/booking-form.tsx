"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { quoteBookingForm, saveBooking, type BookingFormState, type QuoteState } from "@/app/dashboard/bookings/actions";
import { Button } from "@/components/ui/button";
import type { Boat, BookingAddOn, BookingQuote, BookingStatus, DiveSiteOption, Language, TimeSlot } from "@/lib/api";
import { ADD_ONS } from "@/lib/add-ons";
import { money } from "@/lib/billing";
import { ACTIVITY_LABELS, EQUIPMENT_ITEMS, SLOT_LABELS, SOURCE_LABELS, SOURCES } from "@/lib/bookings";
import { LANGUAGES } from "@/lib/customers";
import { useT } from "@/lib/i18n/client";
import { SHORE_ACTIVITIES, SHORE_START_TIMES, shoreSession, TRIP_SLOTS } from "@/lib/trips";
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
  place: "boat" | "shore";
  boatId: string;
  shoreTime: string; // a shore booking's session start
  siteId: string;
  participantCount: number;
  numberOfDives: number;
  bookingSource: string;
  partnerId: string;
  status: BookingStatus;
  equipment: string[]; // "key" or "key:size"
  notes: string;
  bonoCode: string;
  bonoLocked: boolean; // its use is counted on the booking's invoice
  addOns: BookingAddOn[];
  transferPickup: string;
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
  const t = useT();
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
          {t("Change")}
        </Button>
      </div>
    );
  }
  return (
    <div>
      <label className={label}>
        {t("Search by name, email or phone")}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("e.g. Garcia")}
          className={control}
          autoComplete="off"
        />
      </label>
      {query.trim() && (
        <ul className="mt-2 divide-y divide-zinc-100 rounded-md ring-1 ring-zinc-200">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">{t("No customer matches. Use “New customer” instead.")}</li>
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

// The booking's price as it is filled in: what its stay would bill for it.
function LivePrice({ state, updating }: { state: QuoteState; updating: boolean }) {
  const t = useT();
  if (!state) {
    return <p className="text-sm text-zinc-500">{t("Fill in the activity, date and participants to see the price.")}</p>;
  }
  if ("error" in state) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  const q: BookingQuote = state.quote;
  const m = (v: string) => money(v, q.currency);
  const row = "flex items-baseline justify-between gap-4 py-1";
  return (
    <div className={`text-sm transition-opacity${updating ? " opacity-60" : ""}`} aria-busy={updating}>
      <dl className="divide-y divide-zinc-100">
        <div className={row}>
          <dt className="text-zinc-700">
            {t(q.activity.name)}
            {q.activity.unitPrice !== null && !q.partnerPaid && (
              <span className="text-zinc-500"> · {q.activity.units} × {m(q.activity.unitPrice)}</span>
            )}
            {q.stayDives !== null && !q.partnerPaid && (
              <span className="block text-xs text-zinc-500">
                {q.stayDives === 1
                  ? t("The rate for 1 fun dive in the stay.")
                  : t("The rate for {count} fun dives in the stay, this booking included.", { count: q.stayDives })}
              </span>
            )}
            {q.partnerPaid && <span className="block text-xs text-zinc-500">{t("Paid by the partner.")}</span>}
            {q.unpriced && (
              <span className="block text-xs text-red-700">{t("No price is set for this activity (Settings → Pricing).")}</span>
            )}
          </dt>
          <dd className="tabular-nums text-zinc-900">{m(q.activity.total)}</dd>
        </div>
        {[...q.equipment, ...q.addOns].map((l) => (
          <div key={l.description} className={row}>
            <dt className="text-zinc-700">{t(l.description)}</dt>
            <dd className="tabular-nums text-zinc-900">{m(l.total)}</dd>
          </div>
        ))}
        {q.bono && (
          <div className={row}>
            <dt className="text-zinc-700">{t("Bono {code}", { code: q.bono.code })}</dt>
            <dd className="tabular-nums text-zinc-900">−{m(q.bono.discount)}</dd>
          </div>
        )}
        <div className={row}>
          <dt className="text-zinc-500">{t("{tax} ({rate}%)", { tax: q.taxName, rate: q.taxRate })}</dt>
          <dd className="tabular-nums text-zinc-500">{m(q.tax)}</dd>
        </div>
        <div className={`${row} font-semibold`}>
          <dt className="text-zinc-900">{t("Total")}</dt>
          <dd className="tabular-nums text-zinc-900">{m(q.total)}</dd>
        </div>
      </dl>
      {q.bonoError && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {q.bonoError}
        </p>
      )}
      {q.stayChange !== null && (
        <p className="mt-2 text-xs text-zinc-500">
          {t("With this booking, the stay's total before tax changes by {amount}: its other fun dives move to the new rate too.", {
            amount: m(q.stayChange),
          })}
        </p>
      )}
    </div>
  );
}

const QUOTE_DELAY_MS = 300;

export function BookingForm({
  bookingId,
  initial,
  customers,
  boats,
  sites,
  partners,
  cancelHref,
  transferPrice,
}: {
  bookingId?: string;
  initial: BookingFormValues;
  customers: CustomerOption[];
  boats: Boat[];
  sites: (DiveSiteOption & { isShore?: boolean })[];
  partners: { id: string; name: string }[]; // active ones, plus the booking's own
  cancelHref: string;
  transferPrice?: string; // the transfer fee, formatted
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<BookingFormState>(saveBooking, null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState(initial.customerId);
  // Boat or shore: discovery dives and Open Water courses default to shore.
  const [place, setPlace] = useState(initial.place);
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(initial.timeSlot);
  const [transfer, setTransfer] = useState(initial.addOns.includes("TRANSFER"));
  const shoreSites = sites.filter((s) => s.isShore);
  const shoreTimes = SHORE_START_TIMES[timeSlot];
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

  // The live price: re-quoted a moment after the form last changed. A reply
  // to an older request is ignored.
  const formRef = useRef<HTMLFormElement>(null);
  const [quote, setQuote] = useState<QuoteState>(null);
  const [quoting, setQuoting] = useState(false);
  const [edits, setEdits] = useState(0);
  const latest = useRef(0);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const request = ++latest.current;
    setQuoting(true);
    const timer = setTimeout(async () => {
      const result = await quoteBookingForm(new FormData(form)).catch(() => null);
      if (request !== latest.current) return;
      setQuote(result);
      setQuoting(false);
    }, QUOTE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [edits, customerId, mode, place, timeSlot, equipment]);

  // The first-dive insurance check: acknowledged, or the waiver ticked.
  const insurance = quote && "quote" in quote ? quote.quote.insurance : null;
  const [waiverSigned, setWaiverSigned] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const needsCheck = !bookingId && insurance?.check === true;
  const checkPassed = !needsCheck || waiverSigned || acknowledged;

  const toggle = (key: string, on: boolean) =>
    setEquipment((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  return (
    <form ref={formRef} onSubmit={onSubmit} onChange={() => setEdits((n) => n + 1)} className="space-y-6">
      {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}
      <input type="hidden" name="customerMode" value={mode} />
      <input type="hidden" name="customerId" value={mode === "existing" ? customerId : ""} />

      <section className={section}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-zinc-900">{t("Customer")}</h2>
          <div className="flex gap-1" role="group" aria-label={t("Customer")}>
            <Button type="button" size="sm" variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode("existing")}>
              {t("Existing customer")}
            </Button>
            <Button type="button" size="sm" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
              {t("New customer")}
            </Button>
          </div>
        </div>
        {mode === "existing" ? (
          <CustomerPicker customers={options} selectedId={customerId} onSelect={setCustomerId} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={label}>
              {t("First name")}
              <input name="new_firstName" required maxLength={100} className={control} />
            </label>
            <label className={label}>
              {t("Last name")}
              <input name="new_lastName" required maxLength={100} className={control} />
            </label>
            <label className={label}>
              {t("Email")}
              <input type="email" name="new_email" required maxLength={254} className={control} />
            </label>
            <label className={label}>
              {t("Phone (optional)")}
              <input type="tel" name="new_phone" maxLength={40} className={control} />
            </label>
            <label className={label}>
              {t("Country code")}
              <input name="new_country" required maxLength={60} placeholder="ES, DE, GB…" className={control} />
            </label>
            <label className={label}>
              {t("Language")}
              <select name="new_language" defaultValue={"EN" satisfies Language} className={control}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {t(l.label)}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-zinc-500 sm:col-span-2">
              {t("The customer is saved with the booking. Their full profile can be completed later.")}
            </p>
          </div>
        )}
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">{t("Dive")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={label}>
            {t("Activity")}
            <select
              name="activityType"
              defaultValue={initial.activityType}
              required
              onChange={(e) => setPlace(SHORE_ACTIVITIES.includes(e.target.value) ? "shore" : "boat")}
              className={control}
            >
              {Object.entries(ACTIVITY_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {t(text)}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("Date")}
            <input type="date" name="date" required defaultValue={initial.date} className={control} />
          </label>
          <label className={label}>
            {t("Time slot")}
            <select name="timeSlot" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value as TimeSlot)} className={control}>
              {TRIP_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {t(SLOT_LABELS[s])}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="sm:col-span-2 lg:col-span-3">
            <legend className="text-sm font-medium text-zinc-700">{t("Where")}</legend>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
              {(
                [
                  ["boat", t("Boat trip")],
                  ["shore", t("Shore (beach, harbour or pool; no boat)")],
                ] as const
              ).map(([value, text]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-zinc-800">
                  <input type="radio" name="place" value={value} checked={place === value} onChange={() => setPlace(value)} className="size-4" />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
          {place === "boat" ? (
            <>
              <label className={label}>
                {t("Boat")}
                <select name="boatId" required defaultValue={initial.boatId} className={control}>
                  <option value="" disabled>
                    {t("Choose…")}
                  </option>
                  {boats.map((b) => (
                    <option key={b.id} value={b.id}>
                      {t("{name} ({capacity} places)", { name: b.name, capacity: b.capacity })}
                      {b.status !== "active" ? ` · ${b.status}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                {t("Dive site")}
                <select name="siteId" defaultValue={initial.place === "boat" ? initial.siteId : ""} className={control}>
                  <option value="">{t("Not assigned yet")}</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameEn}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className={label}>
                {t("Shore session")}
                <select
                  name="shoreTime"
                  required
                  key={timeSlot}
                  defaultValue={shoreTimes.includes(initial.shoreTime) ? initial.shoreTime : ""}
                  className={control}
                >
                  <option value="" disabled>
                    {t("Choose…")}
                  </option>
                  {shoreTimes.map((time) => (
                    <option key={time} value={time}>
                      {shoreSession(time)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-normal text-zinc-500">{t("One hour; a session starts every 30 minutes.")}</span>
              </label>
              <label className={label}>
                {t("Shore dive site")}
                {shoreSites.length === 0 ? (
                  <span role="alert" className="mt-1 block text-sm font-normal text-red-700">
                    {t("No shore dive site yet: mark one as a shore site in Settings → Dive Sites.")}
                  </span>
                ) : (
                  <select
                    name="siteId"
                    required
                    defaultValue={shoreSites.some((s) => s.id === initial.siteId) ? initial.siteId : shoreSites[0].id}
                    className={control}
                  >
                    {shoreSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameEn}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </>
          )}
          <label className={label}>
            {t("Participants")}
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
            {t("Number of dives")}
            <input
              type="number"
              name="numberOfDives"
              required
              min={1}
              max={20}
              step={1}
              defaultValue={initial.numberOfDives}
              className={control}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-500">
              {t("Fun dives are billed per dive and count toward the stay rate.")}
            </span>
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-zinc-700">{t("Add-ons")}</legend>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
              {ADD_ONS.map((a) => (
                <label key={a.key} className="flex items-center gap-2 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    name="addOns"
                    value={a.key}
                    defaultChecked={initial.addOns.includes(a.key)}
                    onChange={a.key === "TRANSFER" ? (e) => setTransfer(e.target.checked) : undefined}
                    className="size-4"
                  />
                  {t(a.question ?? a.label)}
                  <span className="text-xs text-zinc-500">
                    ({a.key === "TRANSFER" && transferPrice ? t("{price} per booking", { price: transferPrice }) : t(a.hint).toLowerCase()})
                  </span>
                </label>
              ))}
            </div>
            {transfer && (
              <label className={`${label} mt-3 sm:w-2/3`}>
                {t("Pickup point")}
                <input
                  name="transferPickup"
                  maxLength={200}
                  defaultValue={initial.transferPickup}
                  placeholder={t("e.g. Hotel Elba Castillo, reception")}
                  className={control}
                />
                <span className="mt-1 block text-xs font-normal text-zinc-500">{t("Where the customer is picked up. Shown on the invoice.")}</span>
              </label>
            )}
          </fieldset>
          <label className={label}>
            {t("Government bono")}
            <input
              name="bonoCode"
              maxLength={40}
              pattern="[A-Za-z0-9][A-Za-z0-9\-]{1,39}"
              title={t("The bono's code: letters, digits and dashes")}
              autoComplete="off"
              defaultValue={initial.bonoCode}
              readOnly={initial.bonoLocked}
              placeholder={t("None")}
              className={`${control} uppercase placeholder:normal-case${initial.bonoLocked ? " bg-zinc-50 text-zinc-500" : ""}`}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-500">
              {initial.bonoLocked
                ? t("Applied on this booking's invoice; cancel the invoice to change it.")
                : t("The code of a government bono (Settings → Bonos). Its discount is applied when the booking is invoiced.")}
            </span>
          </label>
          <label className={label}>
            {t("Source")}
            <select name="bookingSource" defaultValue={initial.bookingSource} className={control}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {t(SOURCE_LABELS[s])}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("Partner (partner bookings)")}
            <select name="partnerId" defaultValue={initial.partnerId} className={control}>
              <option value="">{t("None")}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {!bookingId && (
            <label className={label}>
              {t("Status")}
              <select name="status" defaultValue={initial.status} className={control}>
                <option value="CONFIRMED">{t("Confirmed")}</option>
                <option value="PENDING">{t("Pending (not checked in)")}</option>
              </select>
            </label>
          )}
        </div>
        <p className="text-xs text-zinc-500">{t("The boat must have room for these participants in that slot.")}</p>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">{t("Rental equipment")}</h2>
        <p className="text-xs text-zinc-500">{t("One set per booking. The invoice charges the items ticked here.")}</p>
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
                {t(item.label)}
              </label>
              {item.sizes && (
                <select
                  name={`size_${item.key}`}
                  aria-label={t("{item} size", { item: t(item.label) })}
                  defaultValue={initialSizes[item.key] ?? ""}
                  disabled={!equipment.has(item.key)}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm disabled:opacity-40"
                >
                  <option value="">{t("Size…")}</option>
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
          {t("Notes (optional)")}
          <textarea name="notes" rows={3} maxLength={2000} defaultValue={initial.notes} className={control} />
        </label>
      </section>

      <section className={section} aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-zinc-900">{t("Price")}</h2>
          {quoting && <span className="text-xs text-zinc-500">{t("Updating…")}</span>}
        </div>
        <LivePrice state={quote} updating={quoting} />
        <p className="text-xs text-zinc-500">{t("Worked out as the stay bill will charge it. Nothing is saved until you create the booking.")}</p>
      </section>

      {needsCheck && (
        <section role="alert" className="space-y-3 rounded-xl bg-amber-50 p-5 text-sm text-amber-950 ring-1 ring-amber-300">
          <h2 className="font-semibold">{t("Insurance check")}</h2>
          <p>
            {insurance?.insuranceExpiry
              ? t("This is the customer's first dive with us, and their dive insurance expired on {date}.", { date: insurance.insuranceExpiry })
              : t("This is the customer's first dive with us, and there is no dive insurance on file.")}{" "}
            {t("Every diver needs insurance or a signed waiver.")}
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="waiverSigned"
              checked={waiverSigned}
              onChange={(e) => setWaiverSigned(e.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="font-medium">{t("Waiver signed")}</span>
              <span className="block text-xs text-amber-900">{t("The customer has signed the liability waiver. Saved on their profile with today's date.")}</span>
            </span>
          </label>
          {!waiverSigned && (
            <div className="space-y-1">
              <label className="block font-medium">
                {t("Planned stay length (days)")}
                <input
                  type="number"
                  name="plannedStayDays"
                  min={1}
                  max={3660}
                  step={1}
                  placeholder={t("e.g. 10")}
                  className="mt-1 block w-32 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
                />
                <span className="mt-1 block text-xs font-normal text-amber-900">{t("As the customer tells you, to suggest the insurance that covers their stay.")}</span>
              </label>
              {insurance?.suggestion && quote && "quote" in quote && (
                <p className="rounded-md bg-white/70 px-3 py-2 ring-1 ring-amber-200">
                  {t("Suggested insurance: {name}, {price} (covers {days} days). Add it on the Stays page.", {
                    name: t(insurance.suggestion.name),
                    price: money(insurance.suggestion.price, quote.quote.currency),
                    days: insurance.suggestion.days,
                  })}
                </p>
              )}
            </div>
          )}
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="insuranceAcknowledged"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="font-medium">{t("I understand: dive insurance must be added to the stay before they dive")}</span>
              <span className="block text-xs text-amber-900">{t("The Stays page offers it when the stay is billed.")}</span>
            </span>
          </label>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || (mode === "existing" && !customerId) || !checkPassed}>
          {pending ? t("Saving…") : bookingId ? t("Save changes") : t("Create booking")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} />}>
          {t("Cancel")}
        </Button>
        {mode === "existing" && !customerId && <p className="text-sm text-zinc-500">{t("Choose a customer first.")}</p>}
        {!checkPassed && <p className="text-sm text-zinc-500">{t("Answer the insurance check first.")}</p>}
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
            {state.createdCustomer && ` ${t("The new customer was saved and is now selected.")}`}
          </p>
        )}
      </div>
    </form>
  );
}
