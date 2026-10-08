import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteForm, OpenTenantButton, QuotasForm, TenantActiveButton, TenantForm } from "@/components/superadmin/tenant-forms";
import { StorageBar, UsageBar } from "@/components/superadmin/usage";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api";
import { money, formatDay } from "@/lib/billing";
import { getTenantInvitations, getTenantStats, PLAN_LABELS, type InvitationStatus } from "@/lib/platform";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INVITATION_STATUS: Record<InvitationStatus, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Pending", variant: "outline" },
  ACCEPTED: { label: "Accepted", variant: "secondary" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  REVOKED: { label: "Replaced", variant: "outline" },
};

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
  // In the center's own currency, whatever the console session's.
  const { tenant, bookings, customers, revenue, currency, timeZone } = stats;
  const invitations = await getTenantInvitations(id);

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
              {tenant.counts.locations} locations · {timeZone} · {currency}
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
          <Stat label="Invoiced" value={money(revenue.invoiced, currency)} note="issued invoices, not cancelled" />
          <Stat label="Collected" value={money(revenue.collected, currency)} note="payments received, less refunds" />
          <Stat label="Collected, last 30 days" value={money(revenue.collectedLast30Days, currency)} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Usage and quotas</h2>
          <p className="mt-0.5 text-sm text-zinc-500">Authorized limits, shown against usage. Not enforced yet.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ["Locations", tenant.usage.locations],
              ["Dive sites", tenant.usage.diveSites],
              ["Boats", tenant.usage.boats],
              ["Users", tenant.usage.users],
              ["Customers", tenant.usage.customers],
            ] as const
          ).map(([label, u]) => (
            <div key={label}>
              <p className="mb-1 text-sm text-zinc-500">{label}</p>
              <UsageBar label={label} {...u} />
            </div>
          ))}
          <div>
            <p className="mb-1 text-sm text-zinc-500">Storage</p>
            <StorageBar {...tenant.usage.storage} />
          </div>
        </div>
        <QuotasForm tenant={tenant} />
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Staff invitations</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            An emailed link to set a password and join the center. A new invitation to the same email replaces a pending one.
          </p>
        </div>
        {invitations.length > 0 && (
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      {i.email}
                      {i.name && <span className="block text-xs text-zinc-500">{i.name}</span>}
                    </TableCell>
                    <TableCell>{i.role === "ADMIN" ? "Admin" : "Instructor"}</TableCell>
                    <TableCell>
                      <Badge variant={INVITATION_STATUS[i.status].variant}>{INVITATION_STATUS[i.status].label}</Badge>
                      {i.status === "PENDING" && (
                        <span className="block text-xs text-zinc-500">until {formatDay(i.expiresAt)}</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDay(i.createdAt)}</TableCell>
                    <TableCell>{i.invitedBy?.email ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <InviteForm tenantId={tenant.id} />
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900">Details</h2>
        <TenantForm tenant={tenant} />
      </section>
    </main>
  );
}
