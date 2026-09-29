import Link from "next/link";
import { RoutedDialog } from "@/components/routed-panel";
import { BoatForm, DeleteButton, GeneralForm, SiteForm } from "@/components/settings/settings-forms";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBoats, getDiveSites, getPricing, getSettings, getStaff } from "@/lib/api";
import { formatBookingDate } from "@/lib/bookings";
import { BOAT_STATUS_LABELS, SETTINGS_TABS, SITE_CERT_LEVELS, type SettingsTab } from "@/lib/settings";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// "new", a record id, or nothing.
function target(value: string | undefined) {
  return value === "new" || (value && UUID.test(value)) ? value : undefined;
}

function tabHref(tab: SettingsTab, extra: Record<string, string> = {}) {
  return `/dashboard/settings?${new URLSearchParams({ tab, ...extra })}`;
}

const eur = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });

function LoadError({ what, reason }: { what: string; reason: unknown }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {what} could not be loaded: {reason instanceof Error ? reason.message : "unknown error"}
    </p>
  );
}

function Panel({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-zinc-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

async function GeneralTab() {
  try {
    const settings = await getSettings();
    return (
      <Panel title="Center details" description="Name and contact details of the dive center.">
        <GeneralForm settings={settings} />
      </Panel>
    );
  } catch (e) {
    return <LoadError what="Settings" reason={e} />;
  }
}

async function BoatsTab({ open }: { open?: string }) {
  let boats;
  try {
    boats = await getBoats();
  } catch (e) {
    return <LoadError what="Boats" reason={e} />;
  }
  const editing = open && open !== "new" ? boats.find((b) => b.id === open) : undefined;
  const closeHref = tabHref("boats");
  return (
    <Panel
      title="Boats"
      description="A boat with bookings or trips cannot be deleted; set it to inactive instead."
      action={
        <Button nativeButton={false} render={<Link href={tabHref("boats", { boat: "new" })} prefetch={false} scroll={false} />}>
          Add boat
        </Button>
      }
    >
      {boats.length === 0 ? (
        <p className="text-sm text-zinc-500">No boats yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Registration</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Insurance expiry</TableHead>
                <TableHead>Next service</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boats.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.registrationNumber}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.capacity}</TableCell>
                  <TableCell>{BOAT_STATUS_LABELS[b.status] ?? b.status}</TableCell>
                  <TableCell>{b.insuranceExpiry ? formatBookingDate(b.insuranceExpiry) : "—"}</TableCell>
                  <TableCell>{b.nextServiceDate ? formatBookingDate(b.nextServiceDate) : "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={tabHref("boats", { boat: b.id })} prefetch={false} scroll={false} />}
                      >
                        Edit
                      </Button>
                      <DeleteButton kind="boat" id={b.id} name={b.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {open && (open === "new" || editing) && (
        <RoutedDialog wide closeHref={closeHref} title={editing ? `Edit ${editing.name}` : "Add boat"}>
          <BoatForm boat={editing ?? null} cancelHref={closeHref} />
        </RoutedDialog>
      )}
    </Panel>
  );
}

async function SitesTab({ open }: { open?: string }) {
  let sites;
  try {
    sites = await getDiveSites();
  } catch (e) {
    return <LoadError what="Dive sites" reason={e} />;
  }
  const editing = open && open !== "new" ? sites.find((s) => s.id === open) : undefined;
  const closeHref = tabHref("sites");
  return (
    <Panel
      title="Dive sites"
      description="Shown on the public site. A site with dive logs cannot be deleted."
      action={
        <Button nativeButton={false} render={<Link href={tabHref("sites", { site: "new" })} prefetch={false} scroll={false} />}>
          Add dive site
        </Button>
      }
    >
      {sites.length === 0 ? (
        <p className="text-sm text-zinc-500">No dive sites yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Depth</TableHead>
                <TableHead>Certification</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Travel</TableHead>
                <TableHead className="text-right">Max divers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nameEn}</TableCell>
                  <TableCell className="tabular-nums">
                    {s.depthMin}–{s.depthMax} m
                  </TableCell>
                  <TableCell>{SITE_CERT_LEVELS[s.requiredCertLevel] ?? s.requiredCertLevel}</TableCell>
                  <TableCell>{s.difficultyLevel}/5</TableCell>
                  <TableCell className="text-right tabular-nums">{s.travelTimeMinutes} min</TableCell>
                  <TableCell className="text-right tabular-nums">{s.maxDiversPerTrip}</TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={tabHref("sites", { site: s.id })} prefetch={false} scroll={false} />}
                      >
                        Edit
                      </Button>
                      <DeleteButton kind="site" id={s.id} name={s.nameEn} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {open && (open === "new" || editing) && (
        <RoutedDialog wide closeHref={closeHref} title={editing ? `Edit ${editing.nameEn}` : "Add dive site"}>
          <SiteForm site={editing ?? null} cancelHref={closeHref} />
        </RoutedDialog>
      )}
    </Panel>
  );
}

async function StaffTab() {
  const staff = await getStaff().catch(() => null);
  const active = staff?.filter((s) => s.status === "ACTIVE").length;
  return (
    <Panel title="Staff" description="Staff members, their availability and qualifications are managed on the Staff page.">
      {staff && (
        <p className="text-sm text-zinc-700">
          {staff.length} staff member{staff.length === 1 ? "" : "s"}, {active} active.
        </p>
      )}
      <Button nativeButton={false} render={<Link href="/dashboard/staff" prefetch={false} />}>
        Open Staff
      </Button>
    </Panel>
  );
}

async function PricingTab() {
  let pricing;
  try {
    pricing = await getPricing();
  } catch (e) {
    return <LoadError what="Pricing" reason={e} />;
  }
  const rate = `${pricing.taxRate.toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;
  return (
    <div className="space-y-6">
      <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700 ring-1 ring-zinc-200">
        The prices invoices are built from, net of {pricing.taxName} ({rate}, added on invoices; set in the General
        tab). Read-only: they are set on the server, together with the public site&apos;s catalogue.
      </p>
      <Panel title="Activities" description="Per participant.">
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Net price</TableHead>
                <TableHead className="text-right">With {pricing.taxName}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.activities.map((a) => (
                <TableRow key={a.activityType}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.price === null ? "Not set" : eur.format(a.price)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.price === null ? "—" : eur.format(Math.round(a.price * (100 + pricing.taxRate)) / 100)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {pricing.activities.some((a) => a.price === null) && (
          <p className="text-xs text-zinc-500">Bookings for an activity without a price cannot be invoiced automatically.</p>
        )}
      </Panel>
      <Panel title="Rental equipment" description="Per booking, one set.">
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Net price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.equipment.map((e) => (
                <TableRow key={e.key}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{eur.format(e.price)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Full package (all items above)</TableCell>
                <TableCell className="text-right tabular-nums">{eur.format(pricing.fullEquipmentPackage)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tab = SETTINGS_TABS.find((t) => t.key === one(params.tab))?.key ?? "general";

  return (
    <main className="space-y-6 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
      <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {SETTINGS_TABS.map((t) => (
          <Link
            key={t.key}
            href={tabHref(t.key)}
            prefetch={false}
            aria-current={t.key === tab ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              t.key === tab ? "border-[#0096c7] text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "general" && <GeneralTab />}
      {tab === "boats" && <BoatsTab open={target(one(params.boat))} />}
      {tab === "sites" && <SitesTab open={target(one(params.site))} />}
      {tab === "staff" && <StaffTab />}
      {tab === "pricing" && <PricingTab />}
    </main>
  );
}
