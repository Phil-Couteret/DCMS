import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { BillStayButton, StayCosts } from "@/components/stays/stay-forms";
import { addInsuranceAction } from "./actions";
import { Button } from "@/components/ui/button";
import { getPricing, getStays, type FunDiveTier, type Stay, type StayInsurance } from "@/lib/api";
import { money } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";
import { volumeBadge } from "@/lib/stays";
import { SLOT_NAMES } from "@/lib/trips";
import { ACTIVITY_LABELS, formatBookingDate } from "@/lib/bookings";
import { ADD_ON_LABELS } from "@/lib/add-ons";
import { centerLocale } from "@/lib/center";
import type { T } from "@/lib/i18n/core";
import { chosenLocation } from "@/lib/current-location";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const th = "px-3 py-2 font-medium";
const td = "px-3 py-2 align-top";

const CUSTOMER_TYPE_NAMES = { TOURIST: "Tourist", LOCAL: "Local", RECURRENT: "Recurrent" } as const;

function day(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

// The stay rate, from the center's fun dive tiers (Settings → Pricing).
function rateNote(t: T, stay: Stay, currency: string, tiers: FunDiveTier[]) {
  const { customerType } = stay.customer;
  const price = money(stay.pricePerDive, currency);
  // After a price change the stay's dives have different rates: each at the
  // tier for all of them, from its own booking's price list.
  if ((stay.funDiveRates?.length ?? 0) > 1) {
    return t(
      "Every fun dive in this stay is priced at the rate for {count} dives, from the price list of the day it was booked: {rates}.",
      { count: stay.totalDives, rates: stay.funDiveRates.map((r) => money(r, currency)).join(" / ") },
    );
  }
  if (customerType === "LOCAL") return t("Local customers pay a flat {price} per fun dive.", { price });
  if (customerType === "RECURRENT") return t("Recurrent customers pay a flat {price} per fun dive.", { price });
  // The rates this stay is billed at (locked on its bookings).
  const lower = (stay.funDiveTiers?.length ? stay.funDiveTiers : tiers)
    .filter((tier) => tier.minDives > 1)
    .map((tier) => t("{count} dives {price}", { count: tier.minDives, price: money(tier.tourist, currency) }))
    .join(", ");
  const rate =
    stay.totalDives === 1
      ? t("Every fun dive in this stay is priced at {price}, the rate for 1 dive.", { price })
      : t("Every fun dive in this stay is priced at {price}, the rate for {count} dives.", { price, count: stay.totalDives });
  return lower ? `${rate} ${t("More dives in the stay lower the rate for all of them: {rates}.", { rates: lower })}` : rate;
}

// What changed in the price list since the stay's bookings were made: they
// are billed at the prices locked then.
function PriceChanges({ t, changes, currency }: { t: T; changes: Stay["priceChanges"]; currency: string }) {
  if (changes.length === 0) return null;
  const m = (v: number) => money(v, currency);
  const line = (c: Stay["priceChanges"][number]) => {
    switch (c.kind) {
      case "stayRate":
        return t("Fun dive rate: {locked} when booked, {current} today", { locked: m(c.locked), current: m(c.current) });
      case "activity":
        return c.current === null
          ? t("{activity}: {locked} per diver when booked, no price today", { activity: t(ACTIVITY_LABELS[c.activityType] ?? c.activityType), locked: m(c.locked) })
          : t("{activity}: {locked} per diver when booked, {current} today", {
              activity: t(ACTIVITY_LABELS[c.activityType] ?? c.activityType),
              locked: m(c.locked),
              current: m(c.current),
            });
      case "equipment":
        return c.bookings === 1
          ? t("Equipment hire: 1 booking at the prices when it was booked")
          : t("Equipment hire: {count} bookings at the prices when they were booked", { count: c.bookings });
      case "addOn":
        return t("{addOn}: {locked} when booked, {current} today", { addOn: t(ADD_ON_LABELS[c.addOn] ?? c.addOn), locked: m(c.locked), current: m(c.current) });
    }
  };
  return (
    <div role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-300">
      <p className="font-medium">{t("Prices have changed since some of these bookings were made.")}</p>
      <p className="mt-0.5">{t("This stay is billed at the prices locked when each booking was made:")}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {changes.map((c, i) => (
          <li key={i}>{line(c)}</li>
        ))}
      </ul>
    </div>
  );
}

// Dive insurance for the stay's diving: how the customer is covered, or the
// insurance to add to the bill.
function InsuranceNote({ t, insurance, customerId, currency }: { t: T; insurance: StayInsurance; customerId: string; currency: string }) {
  if (insurance.offer) {
    const { offer } = insurance;
    return (
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-300">
        <div>
          <p className="font-medium">{t("No dive insurance and no signed waiver")}</p>
          <p className="mt-0.5">
            {insurance.insuranceExpiry
              ? t("Their insurance expires on {date}, before the stay's last dive.", { date: formatBookingDate(insurance.insuranceExpiry) })
              : t("Every diver needs insurance or a signed waiver.")}{" "}
            {t("Add {item} to the bill for {price}?", { item: t(offer.description), price: money(offer.price, currency) })}
          </p>
        </div>
        <ActionButton action={addInsuranceAction} fields={{ customerId }} pendingLabel={t("Adding…")}>
          {t("Add insurance ({price})", { price: money(offer.price, currency) })}
        </ActionButton>
      </div>
    );
  }
  const text =
    insurance.cover === "insured"
      ? t("Dive insurance valid until {date}.", { date: formatBookingDate(insurance.insuranceExpiry!) })
      : insurance.cover === "waiver"
        ? t("Liability waiver signed on {date}.", { date: formatBookingDate(insurance.waiverSignedAt!) })
        : t("Dive insurance is in the extra costs.");
  return <p className="text-sm text-zinc-600">✓ {text}</p>;
}

async function StayCard({
  stay,
  today,
  taxName,
  currency,
  tiers,
}: {
  stay: Stay;
  today: string;
  taxName: string;
  currency: string;
  tiers: FunDiveTier[];
}) {
  const t = await getT();
  const { customer } = stay;
  const name = `${customer.firstName} ${customer.lastName}`;
  const badge = volumeBadge(stay.totalDives);
  const hasFunDives = stay.bookings.some((b) => b.activityType === "FUN_DIVE");
  const disabledReason =
    stay.unpriced.length > 0
      ? t("No price is set for {items}", { items: stay.unpriced.join(", ") })
      : Number(stay.totals.subtotal) === 0
        ? stay.bookings.some((b) => b.partner)
          ? t("Paid by the partner: nothing for the customer to pay")
          : t("Nothing to bill yet")
        : undefined;

  return (
    <details open className="group rounded-xl bg-white ring-1 ring-zinc-200">
      <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            <span className="mr-2 inline-block text-zinc-400 transition-transform group-open:rotate-90">›</span>
            {name}
          </h2>
          <p className="text-sm text-zinc-500">
            {customer.email} · {t(CUSTOMER_TYPE_NAMES[customer.customerType])}
          </p>
          <p className="text-sm text-zinc-500">
            {stay.startDate ? t("Stay started {date}", { date: day(stay.startDate) }) : t("No bookings yet")}
            {stay.endDate && stay.endDate !== stay.startDate && ` · ${t("last booking {date}", { date: day(stay.endDate) })}`}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            {hasFunDives && <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badge.className}`}>{t(badge.label)}</span>}
            <span className="text-xl font-semibold text-[#0077b6]">{money(stay.totals.subtotal, currency)}</span>
          </div>
          {hasFunDives && (
            <p className="text-sm text-zinc-500">
              {stay.totalDives === 1
                ? t("1 fun dive @ {price}", { price: money(stay.pricePerDive, currency) })
                : t("{count} fun dives @ {price}", {
                    count: stay.totalDives,
                    price: (stay.funDiveRates?.length ? stay.funDiveRates : [stay.pricePerDive]).map((r) => money(r, currency)).join(" / "),
                  })}
            </p>
          )}
          {Number(stay.totals.discount) > 0 && (
            <p className="text-sm font-medium text-emerald-800">{t("−{amount} government bonos", { amount: money(stay.totals.discount, currency) })}</p>
          )}
          <p className="text-xs text-zinc-500">
            {Number(stay.totals.discount) > 0
              ? t("before {tax} · {total} with {tax} and bonos", { tax: taxName, total: money(stay.totals.total, currency) })
              : t("before {tax} · {total} with {tax}", { tax: taxName, total: money(stay.totals.total, currency) })}
          </p>
        </div>
      </summary>

      <div className="space-y-5 border-t border-zinc-100 p-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">{t("Stay breakdown")}</h3>
          {stay.bookings.length === 0 ? (
            <p className="text-sm italic text-zinc-500">{t("No unbilled bookings in this stay.")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                  <tr>
                    <th className={th}>{t("Date")}</th>
                    <th className={th}>{t("Activity")}</th>
                    <th className={`${th} text-right`}>{t("Divers")}</th>
                    <th className={`${th} text-right`}>{t("Price each")}</th>
                    <th className={`${th} text-right`}>{t("Total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {stay.bookings.map((b) => (
                    <tr key={b.id}>
                      <td className={td}>
                        <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="hover:underline">
                          {day(b.date)}
                        </Link>
                        <span className="block text-xs text-zinc-500">
                          {t(SLOT_NAMES[b.timeSlot])} · {b.boatName ?? t("Shore {time}", { time: b.shoreTime ?? "" })}
                          {b.status === "PENDING" && ` · ${t("pending")}`}
                        </span>
                      </td>
                      <td className={td}>
                        {t(b.activityName)}
                        {b.partner && (
                          <span className="block text-xs font-medium text-purple-800">{b.partnerName ? t("Paid by {name}", { name: b.partnerName }) : t("Paid by the partner")}</span>
                        )}
                        {b.equipment.map((e) => (
                          <span key={e.description} className="block text-xs text-zinc-500">
                            + {e.description} ({money(e.total, currency)})
                          </span>
                        ))}
                        {b.addOns.map((a) => (
                          <span key={a.description} className="block text-xs text-zinc-500">
                            + {t(a.description)} ({money(a.total, currency)})
                          </span>
                        ))}
                        {b.bono && (
                          <span className="block text-xs font-medium text-emerald-800">
                            {t("Bono {code}: −{amount}", { code: b.bono.code, amount: money(b.bono.discount, currency) })}
                          </span>
                        )}
                      </td>
                      <td className={`${td} text-right`}>{b.participantCount}</td>
                      <td className={`${td} text-right`}>
                        {b.unitPrice === null ? <span className="text-red-700">{t("No price")}</span> : money(b.unitPrice, currency)}
                      </td>
                      <td className={`${td} text-right`}>
                        {b.partner ? (
                          <>
                            <span className="text-zinc-500">{t("Partner")}</span>
                            {Number(b.total) > 0 && <span className="block text-xs">{t("+{amount} customer", { amount: money(b.total, currency) })}</span>}
                          </>
                        ) : (
                          money(b.total, currency)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hasFunDives && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-200">{rateNote(t, stay, currency, tiers)}</p>}
          <PriceChanges t={t} changes={stay.priceChanges} currency={currency} />
          {stay.pack && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <strong>{t("{count}-dive pack available:", { count: stay.pack.diveCount })}</strong>{" "}
              {stay.pack.divers > 1
                ? t("{price} per diver × {divers} divers for these fun dives, instead of the stay rate.", {
                    price: money(stay.pack.price, currency),
                    divers: stay.pack.divers,
                  })
                : t("{price} per diver for these fun dives, instead of the stay rate.", { price: money(stay.pack.price, currency) })}{" "}
              {Number(stay.pack.totals.total) < Number(stay.totals.total)
                ? t("Billed with the pack, the stay comes to {total} with {tax} ({amount} less).", {
                    total: money(stay.pack.totals.total, currency),
                    tax: taxName,
                    amount: money(Number(stay.totals.total) - Number(stay.pack.totals.total), currency),
                  })
                : Number(stay.pack.totals.total) > Number(stay.totals.total)
                  ? t("Billed with the pack, the stay comes to {total} with {tax} ({amount} more).", {
                      total: money(stay.pack.totals.total, currency),
                      tax: taxName,
                      amount: money(Number(stay.pack.totals.total) - Number(stay.totals.total), currency),
                    })
                  : t("Billed with the pack, the stay comes to {total} with {tax} (the same).", {
                      total: money(stay.pack.totals.total, currency),
                      tax: taxName,
                    })}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">{t("Extra costs")}</h3>
          {stay.insurance && <InsuranceNote t={t} insurance={stay.insurance} customerId={customer.id} currency={currency} />}
          <StayCosts customerId={customer.id} costs={stay.costs} total={stay.totals.costs} today={today} taxName={taxName} currency={currency} />
        </section>

        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-zinc-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/dashboard/bookings/new?customer=${customer.id}`} prefetch={false} />}>
              {t("Add booking")}
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href={`/dashboard/customers/${customer.id}`} prefetch={false} />}>
              {t("View customer")}
            </Button>
          </div>
          <div className="flex flex-col items-end gap-2">
            {stay.pack && (
              <BillStayButton
                customerId={customer.id}
                name={name}
                total={stay.pack.totals.total}
                disabledReason={disabledReason}
                currency={currency}
                pack={stay.pack}
              />
            )}
            <BillStayButton customerId={customer.id} name={name} total={stay.totals.total} disabledReason={disabledReason} currency={currency} />
          </div>
        </div>
      </div>
    </details>
  );
}

export default async function StaysPage() {
  const { timeZone, currency } = await centerLocale();
  const today = centerNow(timeZone).isoDate;
  const t = await getT();
  let stays: Stay[];
  let taxName: string;
  let tiers: FunDiveTier[];
  try {
    const [list, pricing, location] = await Promise.all([getStays(), getPricing(), chosenLocation()]);
    // With a location chosen at the top: the stays with a booking there.
    stays = location ? list.filter((s) => s.bookings.some((b) => b.locationId === location)) : list;
    taxName = pricing.taxName;
    tiers = pricing.funDiveTiers;
  } catch (e) {
    return (
      <main className="p-6 md:p-8">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {t("Stays could not be loaded: {error}", { error: e instanceof Error ? e.message : t("unknown error") })}
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t("Stays")}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("Customers with unbilled bookings from the last 30 days. A stay covers up to 30 days from its first booking and is billed on one invoice.")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/stays" prefetch={false} />}>
            {t("Refresh")}
          </Button>
          <Button nativeButton={false} render={<Link href="/dashboard/bookings/new" prefetch={false} />}>
            {t("New Booking")}
          </Button>
        </div>
      </div>

      {stays.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">{t("No open stays")}</p>
          <p className="mt-1 text-sm text-zinc-500">{t("Customers with unbilled bookings from the last 30 days appear here.")}</p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/dashboard/bookings/new" prefetch={false} />}>
            {t("Create a booking")}
          </Button>
        </div>
      ) : (
        stays.map((s) => <StayCard key={s.customer.id} stay={s} today={today} taxName={taxName} currency={currency} tiers={tiers} />)
      )}
    </main>
  );
}
