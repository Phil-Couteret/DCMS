import Link from "next/link";
import { BillStayButton, StayCosts } from "@/components/stays/stay-forms";
import { Button } from "@/components/ui/button";
import { getSettings, getStays, type Stay } from "@/lib/api";
import { eur } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";
import { volumeBadge } from "@/lib/stays";
import { SLOT_NAMES } from "@/lib/trips";

export const dynamic = "force-dynamic";

const th = "px-3 py-2 font-medium";
const td = "px-3 py-2 align-top";

const CUSTOMER_TYPE_NAMES = { TOURIST: "Tourist", LOCAL: "Local", RECURRENT: "Recurrent" } as const;

function day(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

function rateNote(stay: Stay) {
  const { customerType } = stay.customer;
  if (customerType !== "TOURIST") {
    return `${CUSTOMER_TYPE_NAMES[customerType]} customers pay a flat ${eur(stay.pricePerDive)} per fun dive.`;
  }
  return `Every fun dive in this stay is priced at ${eur(stay.pricePerDive)}, the rate for ${stay.totalDives} dive${
    stay.totalDives === 1 ? "" : "s"
  }. More dives in the stay lower the rate for all of them: 3 dives €44, 6 dives €42, 9 dives €40, 13 dives €38.`;
}

function StayCard({ stay, today, taxName }: { stay: Stay; today: string; taxName: string }) {
  const { customer } = stay;
  const name = `${customer.firstName} ${customer.lastName}`;
  const badge = volumeBadge(stay.totalDives);
  const hasFunDives = stay.bookings.some((b) => b.activityType === "FUN_DIVE");
  const disabledReason =
    stay.unpriced.length > 0
      ? `No price is set for ${stay.unpriced.join(", ")}`
      : stay.bookings.length === 0 && stay.costs.length === 0
        ? "Nothing to bill yet"
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
            {customer.email} · {CUSTOMER_TYPE_NAMES[customer.customerType]}
          </p>
          <p className="text-sm text-zinc-500">
            {stay.startDate ? `Stay started ${day(stay.startDate)}` : "No bookings yet"}
            {stay.endDate && stay.endDate !== stay.startDate && ` · last booking ${day(stay.endDate)}`}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-2">
            {hasFunDives && <span className={`rounded px-2 py-0.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>}
            <span className="text-xl font-semibold text-[#0077b6]">{eur(stay.totals.subtotal)}</span>
          </div>
          {hasFunDives && (
            <p className="text-sm text-zinc-500">
              {stay.totalDives} fun dive{stay.totalDives === 1 ? "" : "s"} @ {eur(stay.pricePerDive)}
            </p>
          )}
          <p className="text-xs text-zinc-500">
            before {taxName} · {eur(stay.totals.total)} with {taxName}
          </p>
        </div>
      </summary>

      <div className="space-y-5 border-t border-zinc-100 p-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">Stay breakdown</h3>
          {stay.bookings.length === 0 ? (
            <p className="text-sm italic text-zinc-500">No unbilled bookings in this stay.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Activity</th>
                    <th className={`${th} text-right`}>Divers</th>
                    <th className={`${th} text-right`}>Price each</th>
                    <th className={`${th} text-right`}>Total</th>
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
                          {SLOT_NAMES[b.timeSlot]} · {b.boatName}
                          {b.status === "PENDING" && " · pending"}
                        </span>
                      </td>
                      <td className={td}>
                        {b.activityName}
                        {b.partner && <span className="block text-xs font-medium text-purple-800">Paid by partner</span>}
                        {b.equipment.map((e) => (
                          <span key={e.description} className="block text-xs text-zinc-500">
                            + {e.description} ({eur(e.total)})
                          </span>
                        ))}
                      </td>
                      <td className={`${td} text-right`}>{b.participantCount}</td>
                      <td className={`${td} text-right`}>
                        {b.unitPrice === null ? <span className="text-red-700">No price</span> : eur(b.unitPrice)}
                      </td>
                      <td className={`${td} text-right`}>
                        {b.partner ? (
                          <>
                            <span className="text-zinc-500">Partner</span>
                            {Number(b.total) > 0 && <span className="block text-xs">+{eur(b.total)} customer</span>}
                          </>
                        ) : (
                          eur(b.total)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {hasFunDives && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-200">{rateNote(stay)}</p>}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-900">Extra costs</h3>
          <StayCosts customerId={customer.id} costs={stay.costs} total={stay.totals.costs} today={today} taxName={taxName} />
        </section>

        <div className="flex flex-wrap items-start justify-between gap-3 border-t border-zinc-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/dashboard/bookings/new?customer=${customer.id}`} prefetch={false} />}>
              Add booking
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href={`/dashboard/customers/${customer.id}`} prefetch={false} />}>
              View customer
            </Button>
          </div>
          <BillStayButton customerId={customer.id} name={name} total={stay.totals.total} disabledReason={disabledReason} />
        </div>
      </div>
    </details>
  );
}

export default async function StaysPage() {
  const today = centerNow().isoDate;
  let stays: Stay[];
  let taxName = "IGIC";
  try {
    const [list, settings] = await Promise.all([getStays(), getSettings()]);
    stays = list;
    taxName = settings.taxName;
  } catch (e) {
    return (
      <main className="p-6 md:p-8">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          Stays could not be loaded: {e instanceof Error ? e.message : "unknown error"}
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Stays</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Customers with unbilled bookings from the last 30 days. A stay covers up to 30 days from its first booking and is
            billed on one invoice.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/stays" prefetch={false} />}>
            Refresh
          </Button>
          <Button nativeButton={false} render={<Link href="/dashboard/bookings/new" prefetch={false} />}>
            New Booking
          </Button>
        </div>
      </div>

      {stays.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">No open stays</p>
          <p className="mt-1 text-sm text-zinc-500">Customers with unbilled bookings from the last 30 days appear here.</p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/dashboard/bookings/new" prefetch={false} />}>
            Create a booking
          </Button>
        </div>
      ) : (
        stays.map((s) => <StayCard key={s.customer.id} stay={s} today={today} taxName={taxName} />)
      )}
    </main>
  );
}
