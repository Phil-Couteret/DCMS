import Link from "next/link";
import { OpenTenantButton, TenantActiveButton, TenantForm } from "@/components/superadmin/tenant-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDay } from "@/lib/billing";
import { getAuditLog, getTenants, PLAN_LABELS, type AuditEntry } from "@/lib/platform";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "tenant.create": "Created center",
  "tenant.update": "Changed center",
  "tenant.enter": "Entered center",
};

function auditDetails(entry: AuditEntry) {
  if (entry.action !== "tenant.update" || !entry.details) return null;
  return Object.entries(entry.details as Record<string, { from: unknown; to: unknown }>)
    .map(([k, c]) => `${k}: ${String(c.from)} → ${String(c.to)}`)
    .join(", ");
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function SuperadminPage() {
  const [tenants, audit] = await Promise.all([getTenants(), getAuditLog()]);
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Centers</h1>

      <Panel title="All centers" description={`${tenants.length} on the platform, ${tenants.filter((t) => t.isActive).length} active.`}>
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Center</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link href={`/superadmin/tenants/${t.id}`} prefetch={false} className="font-medium hover:underline">
                      {t.name}
                    </Link>
                    <span className="block text-xs text-zinc-500">{t.slug}</span>
                  </TableCell>
                  <TableCell>{PLAN_LABELS[t.plan]}</TableCell>
                  <TableCell>
                    {t.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.counts.staff}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.counts.customers}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.counts.bookings}</TableCell>
                  <TableCell>{formatDay(t.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/superadmin/tenants/${t.id}`} prefetch={false} />}
                      >
                        Stats
                      </Button>
                      <OpenTenantButton tenant={t} />
                      <TenantActiveButton tenant={t} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Panel
        title="New center"
        description="Creates the center with its settings and the default price list. Open it afterwards to add its first admin under Settings → Users, its boats and dive sites, and to adjust its prices."
      >
        <TenantForm
          tenant={null}
          timeZones={["UTC", ...Intl.supportedValuesOf("timeZone")]}
          currencies={Intl.supportedValuesOf("currency")}
        />
      </Panel>

      <Panel title="Recent platform activity" description="Centers created or changed, and every entry into a center you are not a member of.">
        {audit.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">{new Date(e.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC</TableCell>
                    <TableCell>{e.user?.email ?? "—"}</TableCell>
                    <TableCell>{ACTION_LABELS[e.action] ?? e.action}</TableCell>
                    <TableCell>{e.tenant?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-zinc-600">{auditDetails(e) ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </main>
  );
}
