import Link from "next/link";
import { notFound } from "next/navigation";
import { OpenTenantButton, TenantActiveButton, TenantForm } from "@/components/superadmin/tenant-forms";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api";
import { eur, formatDay } from "@/lib/billing";
import { getTenantStats, PLAN_LABELS } from "@/lib/platform";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-zinc-500">{note}</p>}
    </div>
  );
}

export default async function TenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const stats = await getTenantStats(id).catch((e) => {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  });
  const { tenant, bookings, customers, revenue } = stats;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/superadmin" prefetch={false} className="text-sm text-zinc-600 hover:underline">
          ← All centers
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold text-zinc-900">
              {tenant.name}
              {tenant.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
            </h1>
            <p className="text-sm text-zinc-500">
              {tenant.slug} · {PLAN_LABELS[tenant.plan]} plan · since {formatDay(tenant.createdAt)} · {tenant.counts.staff} staff,{" "}
              {tenant.counts.locations} locations
            </p>
          </div>
          <div className="flex items-start gap-2">
            <OpenTenantButton tenant={tenant} />
            <TenantActiveButton tenant={tenant} />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Bookings</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="All bookings" value={bookings.total} />
          <Stat label="Last 30 days" value={bookings.last30Days} note="booked in the period" />
          <Stat label="Upcoming" value={bookings.upcoming} note="pending or confirmed, from today" />
          <Stat
            label="Completed"
            value={bookings.byStatus.COMPLETED ?? 0}
            note={`${bookings.byStatus.CANCELLED ?? 0} cancelled, ${bookings.byStatus.NO_SHOW ?? 0} no-shows`}
          />
        </div>
        <p className="text-xs text-zinc-500">
          {Object.entries(bookings.byStatus)
            .map(([s, n]) => `${STATUS_LABELS[s] ?? s}: ${n}`)
            .join(" · ")}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Customers</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Customers" value={customers.total} />
          <Stat label="New, last 30 days" value={customers.last30Days} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Revenue</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Invoiced" value={eur(revenue.invoiced)} note="issued invoices, not cancelled" />
          <Stat label="Collected" value={eur(revenue.collected)} note="payments received, less refunds" />
          <Stat label="Collected, last 30 days" value={eur(revenue.collectedLast30Days)} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900">Details</h2>
        <TenantForm tenant={tenant} />
      </section>
    </main>
  );
}
