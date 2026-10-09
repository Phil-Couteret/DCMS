import Link from "next/link";
import {
  addTrip,
  assignDiver,
  autoAssign,
  removeCrew,
  setPlannedSite,
  unassignDiver,
} from "@/app/dashboard/dive-prep/actions";
import { ActionButton } from "@/components/action-button";
import { CrewForm, PrintButton, ReportForm, SiteForm } from "@/components/dive-prep/forms";
import { TripStatusActions } from "@/components/schedule/trip-forms";
import { TripStatusBadge } from "@/components/schedule/views";
import { Button } from "@/components/ui/button";
import {
  getComplianceReport,
  getDivePrep,
  getDiveSites,
  getLocations,
  getTrips,
  type DivePrep,
  type PrepBooking,
  type PrepTrip,
  type TimeSlot,
  type LocationRef,
} from "@/lib/api";
import { ACTIVITY_LABELS } from "@/lib/bookings";
import { centerNow } from "@/lib/center-time";
import { countryLabel, GENDER_LABELS, SKILL_LEVEL_LABELS } from "@/lib/customers";
import {
  certificationLabel,
  equipmentSummary,
  prepHref,
  PREP_TABS,
  SKILL_PILL,
  type PrepTab,
} from "@/lib/dive-prep";
import { tripPlace, formatDayLabel, ROLE_LABELS, SLOT_NAMES, TRIP_SLOTS } from "@/lib/trips";
import { centerLocale } from "@/lib/center";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// what is the whole sentence, with {error} where the reason goes.
async function LoadError({ what, reason }: { what: string; reason: unknown }) {
  const t = await getT();
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {t(what, { error: reason instanceof Error ? reason.message : String(reason) })}
    </p>
  );
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ring-1 ${className}`}>{children}</span>;
}

async function DiverLine({ b }: { b: PrepBooking }) {
  const t = await getT();
  const c = b.customer;
  const skill = c.centerSkillLevel;
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link href={`/dashboard/customers/${c.id}`} prefetch={false} className="font-medium text-zinc-900 hover:underline">
          {c.firstName} {c.lastName}
        </Link>
        {b.participantCount > 1 && <span className="text-zinc-500">+{b.participantCount - 1}</span>}
        <Pill className={skill ? SKILL_PILL[skill] : "bg-zinc-100 text-zinc-600 ring-zinc-200"}>
          {skill ? t(SKILL_LEVEL_LABELS[skill]) : t("Not assessed")}
        </Pill>
        <span className="text-xs text-zinc-500">{ACTIVITY_LABELS[b.activityType] ? t(ACTIVITY_LABELS[b.activityType]) : b.activityType}</span>
      </p>
      <p className="text-xs text-zinc-500">{equipmentSummary(c, t)}</p>
      {b.warnings.length > 0 && <p className="text-xs font-medium text-red-700">{b.warnings.join(" · ")}</p>}
    </div>
  );
}

async function PrepControls({
  tab,
  date,
  slot,
  location,
  locations,
}: {
  tab: PrepTab;
  date: string;
  slot: TimeSlot;
  location?: string;
  locations: LocationRef[];
}) {
  const t = await getT();
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200">
      {tab !== "prep" && <input type="hidden" name="tab" value={tab} />}
      {locations.length > 0 && (
        <label className="block text-sm font-medium text-zinc-700">
          {t("Location")}
          <select name="location" defaultValue={location ?? ""} className={control}>
            <option value="">{t("All locations")}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm font-medium text-zinc-700">
        {t("Date")}
        <input type="date" name="date" defaultValue={date} className={control} />
      </label>
      {tab === "prep" && (
        <label className="block text-sm font-medium text-zinc-700">
          {t("Time slot")}
          <select name="slot" defaultValue={slot} className={control}>
            {TRIP_SLOTS.map((s) => (
              <option key={s} value={s}>
                {t(SLOT_NAMES[s])}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button type="submit">{t("Show")}</Button>
    </form>
  );
}

async function TripCard({ trip, prep }: { trip: PrepTrip; prep: DivePrep }) {
  const t = await getT();
  const open = trip.status === "PLANNED" || trip.status === "ACTIVE";
  const { divers, crew, limit, available } = trip.capacity;
  const over = available < 0;
  const hasCaptain = trip.staff.some((s) => s.role === "CAPTAIN");
  const suggestions = trip.suggestedSites.filter((s) => s.id !== trip.plannedSiteId);
  return (
    <article className={`space-y-4 rounded-xl bg-white p-5 ring-1 ${over ? "ring-2 ring-red-400" : "ring-zinc-200"}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{tripPlace(trip, t)}</h3>
          <p className="text-xs text-zinc-500">
            {trip.boat ? `${t("{count} places", { count: trip.boat.capacity })} · ` : ""}
            {t("{crew} crew · room for {count} divers", { crew, count: Math.max(0, limit) })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                over ? "bg-red-100 text-red-800" : available === 0 ? "bg-amber-100 text-amber-900" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {t("{divers}/{limit} divers", { divers, limit: Math.max(0, limit) })}
            </span>
            <TripStatusBadge status={trip.status} />
          </div>
          <TripStatusActions tripId={trip.id} status={trip.status} startIssues={trip.issues} />
        </div>
      </header>

      {trip.issues.length > 0 && open && (
        <ul className="list-inside list-disc rounded-lg bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
          {trip.issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-900">{t("1. Crew")}</h4>
        {trip.staff.length === 0 ? (
          <p className="text-xs text-zinc-500">{t("No crew yet.")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {trip.staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <span>
                  <span className="font-medium text-zinc-900">
                    {s.staff.firstName} {s.staff.lastName}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">{t(ROLE_LABELS[s.role])}</span>
                </span>
                {open && (
                  <ActionButton
                    action={removeCrew}
                    fields={{ tripId: trip.id, staffId: s.staffId }}
                    pendingLabel={t("Removing…")}
                    variant="ghost"
                    size="xs"
                  >
                    {t("Remove")}
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
        {open && <CrewForm tripId={trip.id} staff={prep.staff} hasBoat={Boolean(trip.boat)} hasCaptain={hasCaptain} />}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-900">{t("2. Planned site")}</h4>
        {open ? (
          <SiteForm tripId={trip.id} sites={prep.sites} current={trip.plannedSiteId} />
        ) : (
          <p className="text-sm text-zinc-700">{trip.plannedSite?.nameEn ?? t("Not decided")}</p>
        )}
        {open && trip.bookings.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            {suggestions.length === 0 ? (
              <span>{t("No other site suits these divers (skill, certification, not dived in the last 3 days).")}</span>
            ) : (
              <>
                <span>{t("Suits these divers:")}</span>
                {suggestions.map((s) => (
                  <ActionButton
                    key={s.id}
                    action={setPlannedSite}
                    fields={{ tripId: trip.id, siteId: s.id }}
                    pendingLabel="…"
                    variant="secondary"
                    size="xs"
                  >
                    {s.nameEn}
                  </ActionButton>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-900">{t("3. Divers")}</h4>
        {trip.bookings.length === 0 ? (
          <p className="text-xs text-zinc-500">{t("No divers yet. Add them from the unassigned list.")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {trip.bookings.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-2 px-3 py-2">
                <DiverLine b={b} />
                {open && (
                  <ActionButton
                    action={unassignDiver}
                    fields={{ tripId: trip.id, bookingId: b.id }}
                    pendingLabel="…"
                    variant="ghost"
                    size="xs"
                  >
                    {t("Remove")}
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

async function PreparationTab({ date, slot, location }: { date: string; slot: TimeSlot; location?: string }) {
  const t = await getT();
  let prep: DivePrep;
  try {
    prep = await getDivePrep(date, slot, location);
  } catch (e) {
    return <LoadError what="The preparation could not be loaded: {error}" reason={e} />;
  }
  const openTrips = prep.trips.filter((tr) => tr.status === "PLANNED" || tr.status === "ACTIVE");
  const assigned = prep.trips.reduce((n, tr) => n + tr.capacity.divers, 0);
  const waiting = prep.unassigned.reduce((n, b) => n + b.participantCount, 0);
  const room = openTrips.reduce((n, tr) => n + Math.max(0, tr.capacity.available), 0);
  const slotFields = { date, timeSlot: slot, ...(location && { location }) };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200">
        <div className="text-sm text-zinc-700">
          <p>
            {t("{total} confirmed divers: {assigned} on trips, {waiting} waiting · room for {room} more on open trips", {
              total: assigned + waiting,
              assigned,
              waiting,
              room,
            })}
            {waiting > room && <span className="font-medium text-red-700"> — {t("{count} short", { count: waiting - room })}</span>}
          </p>
          {prep.pendingCount > 0 && (
            <p className="text-xs text-zinc-500">
              {prep.pendingCount === 1
                ? t("1 pending booking not shown; confirm it in Bookings to prepare it.")
                : t("{count} pending bookings not shown; confirm them in Bookings to prepare them.", { count: prep.pendingCount })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {prep.unassigned.length > 0 && prep.trips.some((tr) => tr.status === "PLANNED") && (
            <ActionButton action={autoAssign} fields={slotFields} pendingLabel={t("Assigning…")} variant="default">
              {t("Auto-assign divers")}
            </ActionButton>
          )}
          {prep.boatsWithoutTrip.map((b) => (
            <ActionButton
              key={b.id}
              action={addTrip}
              fields={{ ...slotFields, boatId: b.id, capacity: String(b.capacity) }}
              pendingLabel={t("Adding…")}
            >
              + {b.name}
            </ActionButton>
          ))}
          {!prep.hasShoreTrip && (
            <ActionButton action={addTrip} fields={slotFields} pendingLabel={t("Adding…")}>
              + {t("Shore dive")}
            </ActionButton>
          )}
        </div>
      </div>

      {prep.trips.length === 0 ? (
        <p className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          {t("No trips in this slot yet. Add a boat or a shore dive above.")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {prep.trips.map((tr) => (
            <TripCard key={tr.id} trip={tr} prep={prep} />
          ))}
        </div>
      )}

      <section className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
        <h3 className="font-semibold text-zinc-900">{t("Unassigned divers ({count})", { count: prep.unassigned.length })}</h3>
        {prep.unassigned.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("Every confirmed booking in this slot is on a trip.")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {prep.unassigned.map((b) => (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <DiverLine b={b} />
                <div className="flex flex-wrap items-start justify-end gap-1.5">
                  {openTrips.length === 0 && <span className="text-xs text-zinc-500">{t("No open trip")}</span>}
                  {openTrips.filter((tr) => (b.boatId ? !tr.isShore : tr.isShore)).map((tr) => {
                    const fits = tr.capacity.available >= b.participantCount;
                    return (
                      <ActionButton
                        key={tr.id}
                        action={assignDiver}
                        fields={{ tripId: tr.id, bookingId: b.id }}
                        pendingLabel="…"
                        disabled={!fits}
                        size="xs"
                      >
                        {tripPlace(tr, t)} (
                        {fits ? t("{count} left", { count: tr.capacity.available }) : t("full")})
                      </ActionButton>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function ReportTab({ date, location }: { date: string; location?: string }) {
  const t = await getT();
  let trips, sites;
  try {
    [trips, sites] = await Promise.all([getTrips(date, date, location), getDiveSites(location)]);
  } catch (e) {
    return <LoadError what="The trips could not be loaded: {error}" reason={e} />;
  }
  const shown = trips.filter((tr) => tr.status !== "CANCELLED");
  const siteOptions = sites.map((s) => ({ id: s.id, nameEn: s.nameEn, difficultyLevel: s.difficultyLevel }));
  if (shown.length === 0) {
    return <p className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">{t("No trips on this day.")}</p>;
  }
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
        {t(
          "After the boats return, record the actual site, entry and exit times and any notes for the marine authority, then complete the dive. Completed dives go into the compliance report.",
        )}
      </p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {shown.map((trip) => (
          <article
            key={trip.id}
            className={`space-y-3 rounded-xl bg-white p-5 ring-1 ${trip.status === "COMPLETED" ? "ring-2 ring-green-400" : "ring-zinc-200"}`}
          >
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-zinc-900">
                  {t(SLOT_NAMES[trip.timeSlot])} · {tripPlace(trip, t)}
                </h3>
                <p className="text-xs text-zinc-500">
                  {trip._count.bookings === 1
                    ? t("1 booking · planned site {site}", { site: trip.plannedSite?.nameEn ?? t("not set") })
                    : t("{count} bookings · planned site {site}", {
                        count: trip._count.bookings,
                        site: trip.plannedSite?.nameEn ?? t("not set"),
                      })}
                </p>
              </div>
              <TripStatusBadge status={trip.status} />
            </header>
            {trip.status === "PLANNED" ? (
              <p className="text-sm text-zinc-500">
                {t("Not started yet.")}{" "}
                <Link href={prepHref({ date, slot: trip.timeSlot, location })} prefetch={false} className="underline">
                  {t("Prepare and start it before reporting.")}
                </Link>
              </p>
            ) : (
              <ReportForm trip={trip} sites={siteOptions} />
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

async function ComplianceTab({ date }: { date: string }) {
  const t = await getT();
  let report;
  try {
    report = await getComplianceReport(date);
  } catch (e) {
    return <LoadError what="The compliance report could not be loaded: {error}" reason={e} />;
  }
  const people = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-zinc-600">
          {t(
            "Completed dives only, with what Spanish regulations (RD 933/2021) require: site, times, crew and each diver's gender, certification and nationality.",
          )}
        </p>
        {report.trips.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/dashboard/dive-prep/compliance-csv?date=${date}`} download />}
            >
              {t("Download CSV")}
            </Button>
            <PrintButton />
          </div>
        )}
      </div>
      <h2 className="hidden text-xl font-semibold print:block">
        {t("Dive compliance report · {date}", { date: formatDayLabel(date, "long") })}
      </h2>
      {report.trips.length === 0 ? (
        <p className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          {t("No completed dives on this day. Complete dives in Post-dive reports to include them.")}
        </p>
      ) : (
        report.trips.map((trip, i) => (
          <article key={trip.id} className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200 print:break-inside-avoid print:ring-zinc-400">
            <h3 className="font-semibold text-zinc-900">
              {t("Dive {number}: {slot} · {boat}", {
                number: i + 1,
                slot: t(SLOT_NAMES[trip.timeSlot]),
                boat: tripPlace(trip, t),
              })}
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
              {[
                [t("Planned site"), trip.plannedSite?.nameEn ?? "—"],
                [t("Actual site"), trip.actualSite?.nameEn ?? "—"],
                [t("Entry"), trip.entryTime ?? "—"],
                [t("Exit"), trip.exitTime ?? "—"],
                [t("Captain"), trip.captain ? people(trip.captain) : trip.boat ? "—" : t("Shore dive")],
                [
                  t("Guides"),
                  trip.guides.length > 0 ? trip.guides.map((g) => `${people(g)} (${t(ROLE_LABELS[g.role])})`).join(", ") : "—",
                ],
                [t("Divers"), String(trip.totals.divers)],
                [
                  t("Gender"),
                  t("{male} M · {female} F · {unspecified} unspecified", {
                    male: trip.totals.male,
                    female: trip.totals.female,
                    unspecified: trip.totals.unspecified,
                  }),
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="text-zinc-900">{v}</dd>
                </div>
              ))}
            </dl>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500">
                <tr>
                  <th className="py-1.5 font-medium">{t("Diver")}</th>
                  <th className="py-1.5 font-medium">{t("Gender")}</th>
                  <th className="py-1.5 font-medium">{t("Certification")}</th>
                  <th className="py-1.5 font-medium">{t("Nationality")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {trip.divers.map((d) => (
                  <tr key={d.bookingId}>
                    <td className="py-1.5">
                      {d.name}
                      {d.companions > 0 && <span className="text-zinc-500"> {t("+{count} (not named)", { count: d.companions })}</span>}
                    </td>
                    <td className="py-1.5">{d.gender ? (GENDER_LABELS[d.gender] ? t(GENDER_LABELS[d.gender]) : d.gender) : t("Not specified")}</td>
                    <td className="py-1.5">{certificationLabel(d.certification, t)}</td>
                    <td className="py-1.5">{countryLabel(d.nationality)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trip.reportNotes && <p className="whitespace-pre-line text-sm text-zinc-700">{t("Notes: {notes}", { notes: trip.reportNotes })}</p>}
          </article>
        ))
      )}
    </div>
  );
}

export default async function DivePrepPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { timeZone } = await centerLocale();
  const params = await searchParams;
  const t = await getT();
  const tab = PREP_TABS.find((pt) => pt.key === one(params.tab))?.key ?? "prep";
  const rawDate = one(params.date);
  const date = rawDate && ISO_DATE.test(rawDate) ? rawDate : centerNow(timeZone).isoDate;
  const slot = TRIP_SLOTS.find((s) => s === one(params.slot)) ?? "MORNING";
  // Only one location's trips, bookings, boats and sites; kept in every link.
  const location = UUID.test(one(params.location) ?? "") ? one(params.location) : undefined;
  const locations = await getLocations(true).catch(() => []);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Dive Prep")}</h1>
        <p className="mt-1 text-sm text-zinc-500">{formatDayLabel(date, "long")}</p>
      </div>
      <nav aria-label={t("Dive prep sections")} className="flex gap-1 overflow-x-auto border-b border-zinc-200 print:hidden">
        {PREP_TABS.map((pt) => (
          <Link
            key={pt.key}
            href={prepHref({ tab: pt.key, date, slot, location })}
            prefetch={false}
            aria-current={pt.key === tab ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              pt.key === tab ? "border-[#0096c7] text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t(pt.label)}
          </Link>
        ))}
      </nav>
      <div className="print:hidden">
        <PrepControls tab={tab} date={date} slot={slot} location={location} locations={locations} />
      </div>
      {tab === "prep" && <PreparationTab date={date} slot={slot} location={location} />}
      {tab === "report" && <ReportTab date={date} location={location} />}
      {tab === "compliance" && <ComplianceTab date={date} />}
    </main>
  );
}
