import Link from "next/link";
import { BillStayButton, StayCosts } from "@/components/stays/stay-forms";
import { Button } from "@/components/ui/button";
import { getPricing, getStays, type FunDiveTier, type Stay } from "@/lib/api";
import { money } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";
import { volumeBadge } from "@/lib/stays";
import { SLOT_NAMES } from "@/lib/trips";
import { centerLocale } from "@/lib/center";
import type { T } from "@/lib/i18n/core";
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
  if (customerType === "LOCAL") return t("Local customers pay a flat {price} per fun dive.", { price });
  if (customerType === "RECURRENT") return t("Recurrent customers pay a flat {price} per fun dive.", { price });
  const lower = tiers
    .filter((tier) => tier.minDives > 1)
    .map((tier) => t("{count} dives {price}", { count: tier.minDives, price: money(tier.tourist, currency) }))
    .join(", ");
  const rate =
    stay.totalDives === 1
      ? t("Every fun dive in this stay is priced at {price}, the rate for 1 dive.", { price })
      : t("Every fun dive in this stay is priced at {price}, the rate for {count} dives.", { price, count: stay.totalDives });
  return lower ? `${rate} ${t("More dives in the stay lower the rate for all of them: {rates}.", { rates: lower })}` : rate;
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
                : t("{count} fun dives @ {price}", { count: stay.totalDives, price: money(stay.pricePerDive, currency) })}
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
                          {t(SLOT_NAMES[b.timeSlot])} · {b.boatName}
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
    const [list, pricing] = await Promise.all([getStays(), getPricing()]);
    stays = list;
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
