import Link from "next/link";
import { auth } from "@/auth";
import { RoutedDialog } from "@/components/routed-panel";
import {
  BonoForm,
  BoatForm,
  DeleteButton,
  GeneralForm,
  LocationForm,
  LocationSelect,
  PricingForm,
  SiteForm,
  UserForm,
  UserPasswordForm,
} from "@/components/settings/settings-forms";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getBonos, getBoats, getDiveSites, getLocations, getPricing, getSettings, getStaff, getUsers, type LocationRef } from "@/lib/api";
import { formatBookingDate } from "@/lib/bookings";
import { money } from "@/lib/billing";
import { centerLocale } from "@/lib/center";
import { LOCATION_TYPE_LABELS, shortAddress } from "@/lib/locations";
import { BOAT_STATUS_LABELS, SETTINGS_TABS, SITE_CERT_LEVELS, USER_ROLE_LABELS, type SettingsTab } from "@/lib/settings";
import type { T } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";

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

// message: a translated text with a {reason} placeholder.
function LoadError({ message, reason, t }: { message: string; reason: unknown; t: T }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {message.replace("{reason}", reason instanceof Error ? reason.message : t("unknown error"))}
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

async function GeneralTab({ isAdmin }: { isAdmin: boolean }) {
  const t = await getT();
  try {
    const settings = await getSettings();
    // Listed on the server so the form renders the same list it hydrates with.
    const timeZones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
    const currencies = Intl.supportedValuesOf("currency");
    return (
      <Panel title={t("Center details")} description={t("Name, contact details and how the center works.")}>
        <GeneralForm settings={settings} isAdmin={isAdmin} timeZones={timeZones} currencies={currencies} />
      </Panel>
    );
  } catch (e) {
    return <LoadError message={t("Settings could not be loaded: {reason}")} reason={e} t={t} />;
  }
}

async function BoatsTab({ open }: { open?: string }) {
  const t = await getT();
  let boats;
  let locations: LocationRef[];
  try {
    [boats, locations] = await Promise.all([getBoats(), getLocations(true)]);
  } catch (e) {
    return <LoadError message={t("Boats could not be loaded: {reason}")} reason={e} t={t} />;
  }
  const editing = open && open !== "new" ? boats.find((b) => b.id === open) : undefined;
  const closeHref = tabHref("boats");
  return (
    <Panel
      title={t("Boats")}
      description={t("A boat with bookings or trips cannot be deleted; set it to inactive instead.")}
      action={
        <Button nativeButton={false} render={<Link href={tabHref("boats", { boat: "new" })} prefetch={false} scroll={false} />}>
          {t("Add boat")}
        </Button>
      }
    >
      {boats.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("No boats yet.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Registration")}</TableHead>
                <TableHead>{t("Location")}</TableHead>
                <TableHead className="text-right">{t("Capacity")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Insurance expiry")}</TableHead>
                <TableHead>{t("Next service")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boats.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.registrationNumber}</TableCell>
                  <TableCell>
                    <LocationSelect kind="boat" id={b.id} name={b.name} current={b.location} locations={locations} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{b.capacity}</TableCell>
                  <TableCell>{BOAT_STATUS_LABELS[b.status] ? t(BOAT_STATUS_LABELS[b.status]) : b.status}</TableCell>
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
                        {t("Edit")}
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
        <RoutedDialog wide closeHref={closeHref} title={editing ? t("Edit {name}", { name: editing.name }) : t("Add boat")}>
          <BoatForm boat={editing ?? null} cancelHref={closeHref} locations={locations} />
        </RoutedDialog>
      )}
    </Panel>
  );
}

async function SitesTab({ open }: { open?: string }) {
  const t = await getT();
  let sites;
  let locations: LocationRef[];
  try {
    [sites, locations] = await Promise.all([getDiveSites(), getLocations(true)]);
  } catch (e) {
    return <LoadError message={t("Dive sites could not be loaded: {reason}")} reason={e} t={t} />;
  }
  const editing = open && open !== "new" ? sites.find((s) => s.id === open) : undefined;
  const closeHref = tabHref("sites");
  return (
    <Panel
      title={t("Dive sites")}
      description={t("Shown on the public site. A site with dive logs cannot be deleted.")}
      action={
        <Button nativeButton={false} render={<Link href={tabHref("sites", { site: "new" })} prefetch={false} scroll={false} />}>
          {t("Add dive site")}
        </Button>
      }
    >
      {sites.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("No dive sites yet.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Location")}</TableHead>
                <TableHead>{t("Depth")}</TableHead>
                <TableHead>{t("Certification")}</TableHead>
                <TableHead>{t("Difficulty")}</TableHead>
                <TableHead className="text-right">{t("Travel")}</TableHead>
                <TableHead className="text-right">{t("Max divers")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.nameEn}
                    {s.isShore && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">{t("Shore")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <LocationSelect kind="site" id={s.id} name={s.nameEn} current={s.location} locations={locations} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {s.depthMin}–{s.depthMax} m
                  </TableCell>
                  <TableCell>{SITE_CERT_LEVELS[s.requiredCertLevel] ? t(SITE_CERT_LEVELS[s.requiredCertLevel]) : s.requiredCertLevel}</TableCell>
                  <TableCell>{s.difficultyLevel}/5</TableCell>
                  <TableCell className="text-right tabular-nums">{t("{count} min", { count: s.travelTimeMinutes })}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.maxDiversPerTrip}</TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={tabHref("sites", { site: s.id })} prefetch={false} scroll={false} />}
                      >
                        {t("Edit")}
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
        <RoutedDialog wide closeHref={closeHref} title={editing ? t("Edit {name}", { name: editing.nameEn }) : t("Add dive site")}>
          <SiteForm site={editing ?? null} cancelHref={closeHref} locations={locations} />
        </RoutedDialog>
      )}
    </Panel>
  );
}

async function LocationsTab({ open }: { open?: string }) {
  const t = await getT();
  let locations;
  try {
    locations = await getLocations();
  } catch (e) {
    return <LoadError message={t("Locations could not be loaded: {reason}")} reason={e} t={t} />;
  }
  const editing = open && open !== "new" ? locations.find((l) => l.id === open) : undefined;
  const closeHref = tabHref("locations");
  return (
    <Panel
      title={t("Locations")}
      description={t("The places the center operates from. Boats, dive sites and bookings are assigned to one; the schedule and dive prep can be filtered by it.")}
      action={
        <Button nativeButton={false} render={<Link href={tabHref("locations", { location: "new" })} prefetch={false} scroll={false} />}>
          {t("Add location")}
        </Button>
      }
    >
      {locations.length === 0 ? (
        <p className="text-sm text-zinc-500">{t('No locations configured. Click "Add location" to create the first one.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Activity type")}</TableHead>
                <TableHead>{t("Address")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="text-right">{t("Boats")}</TableHead>
                <TableHead className="text-right">{t("Dive sites")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{LOCATION_TYPE_LABELS[l.type] ? t(LOCATION_TYPE_LABELS[l.type]) : l.type}</TableCell>
                  <TableCell>{shortAddress(l.address) ?? <span className="text-zinc-400">{t("Not set")}</span>}</TableCell>
                  <TableCell>
                    {l.isActive ? <Badge variant="secondary">{t("Active")}</Badge> : <Badge variant="outline">{t("Inactive")}</Badge>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.boatCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.diveSiteCount}</TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={tabHref("locations", { location: l.id })} prefetch={false} scroll={false} />}
                      >
                        {t("Edit")}
                      </Button>
                      <DeleteButton
                        kind="location"
                        id={l.id}
                        name={l.name}
                        confirmText={t(
                          "Delete {name}? Its {boats} boat(s) and {sites} dive site(s), and its bookings, are kept but no longer assigned to a location. This cannot be undone.",
                          { name: l.name, boats: l.boatCount, sites: l.diveSiteCount },
                        )}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {open && (open === "new" || editing) && (
        <RoutedDialog wide closeHref={closeHref} title={editing ? t("Edit {name}", { name: editing.name }) : t("Add location")}>
          <LocationForm location={editing ?? null} cancelHref={closeHref} />
        </RoutedDialog>
      )}
    </Panel>
  );
}

async function BonosTab({ open }: { open?: string }) {
  const t = await getT();
  let bonos;
  let currency: string;
  try {
    [bonos, { currency }] = await Promise.all([getBonos(), centerLocale()]);
  } catch (e) {
    return <LoadError message={t("Bonos could not be loaded: {reason}")} reason={e} t={t} />;
  }
  const editing = open && open !== "new" ? bonos.find((b) => b.id === open) : undefined;
  const closeHref = tabHref("bonos");
  const date = (iso: string) => formatBookingDate(iso.slice(0, 10));
  return (
    <Panel
      title={t("Government bonos")}
      description={t(
        "Discount codes, such as the Canary Islands government's bonos. Staff enter the code on a booking; the discount comes off the activity when it is invoiced, and that counts as a use.",
      )}
      action={
        <Button nativeButton={false} render={<Link href={tabHref("bonos", { bono: "new" })} prefetch={false} scroll={false} />}>
          {t("Add bono")}
        </Button>
      }
    >
      {bonos.length === 0 ? (
        <p className="text-sm text-zinc-500">{t('No bonos yet. Click "Add bono" to create the first one.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Code")}</TableHead>
                <TableHead>{t("Description")}</TableHead>
                <TableHead className="text-right">{t("Discount")}</TableHead>
                <TableHead>{t("Valid")}</TableHead>
                <TableHead className="text-right">{t("Used")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonos.map((b) => {
                const usedUp = b.usageLimit !== null && b.usageCount >= b.usageLimit;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-medium">{b.code}</TableCell>
                    <TableCell className="max-w-72 whitespace-normal">{b.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {b.type === "PERCENTAGE" ? `${Number(b.discountValue)}%` : money(b.discountValue, currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {date(b.validFrom)} – {b.validTo ? date(b.validTo) : t("no end")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {b.usageCount}
                      {b.usageLimit !== null && <span className="text-zinc-500"> / {b.usageLimit}</span>}
                    </TableCell>
                    <TableCell>
                      {!b.isActive ? (
                        <Badge variant="outline">{t("Inactive")}</Badge>
                      ) : usedUp ? (
                        <Badge variant="outline">{t("Used up")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("Active")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={tabHref("bonos", { bono: b.id })} prefetch={false} scroll={false} />}
                        >
                          {t("Edit")}
                        </Button>
                        <DeleteButton
                          kind="bono"
                          id={b.id}
                          name={b.code}
                          confirmText={
                            b._count.bookings > 0
                              ? t("{code} is on {count} booking(s) and cannot be deleted; deactivate it instead. Try anyway?", {
                                  code: b.code,
                                  count: b._count.bookings,
                                })
                              : t("Delete bono {code}? This cannot be undone.", { code: b.code })
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {open && (open === "new" || editing) && (
        <RoutedDialog wide closeHref={closeHref} title={editing ? t("Edit bono {code}", { code: editing.code }) : t("Add bono")}>
          <BonoForm bono={editing ?? null} currency={currency} cancelHref={closeHref} />
        </RoutedDialog>
      )}
    </Panel>
  );
}

async function StaffTab() {
  const t = await getT();
  const staff = await getStaff().catch(() => null);
  const active = staff?.filter((s) => s.status === "ACTIVE").length;
  return (
    <Panel title={t("Staff")} description={t("Staff members, their availability and qualifications are managed on the Staff page.")}>
      {staff && (
        <p className="text-sm text-zinc-700">
          {staff.length === 1
            ? t("1 staff member, {active} active.", { active: active ?? 0 })
            : t("{count} staff members, {active} active.", { count: staff.length, active: active ?? 0 })}
        </p>
      )}
      <Button nativeButton={false} render={<Link href="/dashboard/staff" prefetch={false} />}>
        {t("Open Staff")}
      </Button>
    </Panel>
  );
}

async function PricingTab({ canEdit }: { canEdit: boolean }) {
  const t = await getT();
  let pricing;
  try {
    pricing = await getPricing();
  } catch (e) {
    return <LoadError message={t("Pricing could not be loaded: {reason}")} reason={e} t={t} />;
  }
  return <PricingForm pricing={pricing} canEdit={canEdit} />;
}

async function UsersTab({ open, password, selfId }: { open?: string; password?: string; selfId: string }) {
  const t = await getT();
  let users;
  try {
    users = await getUsers();
  } catch (e) {
    return <LoadError message={t("Users could not be loaded: {reason}")} reason={e} t={t} />;
  }
  const editing = open && open !== "new" ? users.find((u) => u.id === open) : undefined;
  const resetting = password ? users.find((u) => u.id === password) : undefined;
  const closeHref = tabHref("users");
  return (
    <Panel
      title={t("Users")}
      description={t(
        "Login accounts. Admins and instructors sign in here; customers on the public site. A user with a staff or customer profile cannot be deleted.",
      )}
      action={
        <Button nativeButton={false} render={<Link href={tabHref("users", { user: "new" })} prefetch={false} scroll={false} />}>
          {t("Add user")}
        </Button>
      }
    >
      <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Email")}</TableHead>
              <TableHead>{t("Role")}</TableHead>
              <TableHead>{t("Profile")}</TableHead>
              <TableHead>{t("Created")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const self = u.id === selfId;
              const linked = u.staffId ? "Staff" : u.customerId ? "Customer" : null;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name ?? "—"}
                    {self && <span className="ml-1.5 text-xs font-normal text-zinc-500">{t("(you)")}</span>}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {USER_ROLE_LABELS[u.role] ? t(USER_ROLE_LABELS[u.role]) : u.role}
                    {!u.isActive && <span className="ml-1.5 text-xs text-red-700">{t("(no access)")}</span>}
                  </TableCell>
                  <TableCell>{linked ? t(linked) : "—"}</TableCell>
                  <TableCell>{formatBookingDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={tabHref("users", { user: u.id })} prefetch={false} scroll={false} />}
                      >
                        {t("Edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={tabHref("users", { password: u.id })} prefetch={false} scroll={false} />}
                      >
                        {t("Password")}
                      </Button>
                      {self || linked ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          title={
                            self
                              ? t("You cannot delete your own account")
                              : linked === "Staff"
                                ? t("Has a staff profile")
                                : t("Has a customer profile")
                          }
                        >
                          {t("Delete")}
                        </Button>
                      ) : (
                        <DeleteButton kind="user" id={u.id} name={u.name ?? u.email} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {open && (open === "new" || editing) && (
        <RoutedDialog closeHref={closeHref} title={editing ? t("Edit {name}", { name: editing.name ?? editing.email }) : t("Add user")}>
          <UserForm user={editing ?? null} isSelf={editing?.id === selfId} cancelHref={closeHref} />
        </RoutedDialog>
      )}
      {resetting && (
        <RoutedDialog
          closeHref={closeHref}
          title={t("Set password")}
          description={t("A new password for {email}. They are not told; give it to them yourself.", { email: resetting.email })}
        >
          <UserPasswordForm user={resetting} cancelHref={closeHref} />
        </RoutedDialog>
      )}
    </Panel>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const t = await getT();
  // Admin-only tabs are hidden from instructors; the API refuses them too.
  const tabs = SETTINGS_TABS.filter((x) => !("adminOnly" in x) || isAdmin);
  const tab = tabs.find((x) => x.key === one(params.tab))?.key ?? "general";

  return (
    <main className="space-y-6 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">{t("Settings")}</h1>
      <nav aria-label={t("Settings sections")} className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={tabHref(x.key)}
            prefetch={false}
            aria-current={x.key === tab ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              x.key === tab ? "border-[#0096c7] text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t(x.label)}
          </Link>
        ))}
      </nav>
      {tab === "general" && <GeneralTab isAdmin={isAdmin} />}
      {tab === "locations" && <LocationsTab open={target(one(params.location))} />}
      {tab === "boats" && <BoatsTab open={target(one(params.boat))} />}
      {tab === "sites" && <SitesTab open={target(one(params.site))} />}
      {tab === "staff" && <StaffTab />}
      {tab === "pricing" && <PricingTab canEdit={isAdmin} />}
      {tab === "bonos" && <BonosTab open={target(one(params.bono))} />}
      {tab === "users" && (
        <UsersTab open={target(one(params.user))} password={target(one(params.password))} selfId={session!.user.id} />
      )}
    </main>
  );
}
