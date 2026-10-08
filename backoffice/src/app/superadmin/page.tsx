import Link from "next/link";
import { headers } from "next/headers";
import { OnboardForm, OpenTenantButton, TenantActiveButton } from "@/components/superadmin/tenant-forms";
import { formatBytes, StorageBar, UsageBar } from "@/components/superadmin/usage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDay } from "@/lib/billing";
import { getAuditLog, getPlatformOverview, getTenants, PLAN_LABELS, type AuditEntry } from "@/lib/platform";
import { backofficeOrigin, hostKind, requestHost } from "@/lib/tenant-host";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "tenant.create": "Created center",
  "tenant.update": "Changed center",
  "tenant.enter": "Entered center",
  "tenant.invite": "Invited",
};

function auditDetails(entry: AuditEntry) {
  if (entry.action === "tenant.invite" && entry.details) {
    const d = entry.details as { email?: string; role?: string };
    return `${d.email ?? ""} as ${d.role === "INSTRUCTOR" ? "instructor" : "admin"}`;
  }
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
  const [tenants, audit, overview] = await Promise.all([getTenants(), getAuditLog(), getPlatformOverview()]);
  // Each center's backoffice address, when the backoffice runs on its
  // domain (TENANT_DOMAIN); on other hosts centers are opened with "Open".
  const h = await headers();
  const onDomain = hostKind(requestHost(h)).kind !== "other";
  const PROTOCOL = process.env.NODE_ENV === "production" ? "https" : "http";
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Centers</h1>

      <section aria-label="Platform overview" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Centers", `${overview.activeTenants} active of ${overview.tenants}`],
          ["Customers", overview.customers.toLocaleString("en-GB")],
          ["Bookings", overview.bookings.toLocaleString("en-GB")],
          ["Storage", formatBytes(overview.storageBytes)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
          </div>
        ))}
      </section>

      <Panel
        title="All centers"
        description="Usage against each center's authorized limits (red from 100%, amber from 80%). Limits are not enforced yet."
      >
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Center</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Dive sites</TableHead>
                <TableHead>Boats</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Storage</TableHead>
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
                    <span className="block text-xs text-zinc-500">
                      {onDomain ? (
                        <a href={backofficeOrigin(h, PROTOCOL, t.slug)} target="_blank" rel="noreferrer" className="hover:underline">
                          {t.slug} ↗
                        </a>
                      ) : (
                        t.slug
                      )}{" "}
                      · {PLAN_LABELS[t.plan]} · {formatDay(t.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {t.isActive ? <Badge variant="secondary">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    <UsageBar label="Locations" {...t.usage.locations} />
                  </TableCell>
                  <TableCell>
                    <UsageBar label="Dive sites" {...t.usage.diveSites} />
                  </TableCell>
                  <TableCell>
                    <UsageBar label="Boats" {...t.usage.boats} />
                  </TableCell>
                  <TableCell>
                    <UsageBar label="Users" {...t.usage.users} />
                  </TableCell>
                  <TableCell>
                    <UsageBar label="Customers" {...t.usage.customers} />
                  </TableCell>
                  <TableCell>
                    <StorageBar {...t.usage.storage} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/superadmin/tenants/${t.id}`} prefetch={false} />}
                      >
                        Manage
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
        description="Creates the center in one go: its settings and default prices, its first location, and an invitation for its first admin."
      >
        <OnboardForm timeZones={["UTC", ...Intl.supportedValuesOf("timeZone")]} currencies={Intl.supportedValuesOf("currency")} />
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
