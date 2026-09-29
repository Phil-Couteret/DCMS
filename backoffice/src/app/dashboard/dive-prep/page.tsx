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
  getTrips,
  type DivePrep,
  type PrepBooking,
  type PrepTrip,
  type TimeSlot,
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
import { formatDayLabel, ROLE_LABELS, SLOT_NAMES, TRIP_SLOTS } from "@/lib/trips";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function LoadError({ what, reason }: { what: string; reason: unknown }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {what} could not be loaded: {reason instanceof Error ? reason.message : String(reason)}
    </p>
  );
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ring-1 ${className}`}>{children}</span>;
}

function DiverLine({ b }: { b: PrepBooking }) {
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
          {skill ? SKILL_LEVEL_LABELS[skill] : "Not assessed"}
        </Pill>
        <span className="text-xs text-zinc-500">{ACTIVITY_LABELS[b.activityType] ?? b.activityType}</span>
      </p>
      <p className="text-xs text-zinc-500">{equipmentSummary(c)}</p>
      {b.warnings.length > 0 && <p className="text-xs font-medium text-red-700">{b.warnings.join(" · ")}</p>}
    </div>
  );
}

function PrepControls({ tab, date, slot }: { tab: PrepTab; date: string; slot: TimeSlot }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200">
      {tab !== "prep" && <input type="hidden" name="tab" value={tab} />}
      <label className="block text-sm font-medium text-zinc-700">
        Date
        <input type="date" name="date" defaultValue={date} className={control} />
      </label>
      {tab === "prep" && (
        <label className="block text-sm font-medium text-zinc-700">
          Time slot
          <select name="slot" defaultValue={slot} className={control}>
            {TRIP_SLOTS.map((s) => (
              <option key={s} value={s}>
                {SLOT_NAMES[s]}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button type="submit">Show</Button>
    </form>
  );
}

function TripCard({ trip, prep }: { trip: PrepTrip; prep: DivePrep }) {
  const open = trip.status === "PLANNED" || trip.status === "ACTIVE";
  const { divers, crew, limit, available } = trip.capacity;
  const over = available < 0;
  const hasCaptain = trip.staff.some((s) => s.role === "CAPTAIN");
  const suggestions = trip.suggestedSites.filter((s) => s.id !== trip.plannedSiteId);
  return (
    <article className={`space-y-4 rounded-xl bg-white p-5 ring-1 ${over ? "ring-2 ring-red-400" : "ring-zinc-200"}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{trip.boat?.name ?? "Shore dive"}</h3>
          <p className="text-xs text-zinc-500">
            {trip.boat ? `${trip.boat.capacity} places · ` : ""}
            {crew} crew · room for {Math.max(0, limit)} divers
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                over ? "bg-red-100 text-red-800" : available === 0 ? "bg-amber-100 text-amber-900" : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {divers}/{Math.max(0, limit)} divers
            </span>
            <TripStatusBadge status={trip.status} />
          </div>
          <TripStatusActions tripId={trip.id} status={trip.status} />
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
        <h4 className="text-sm font-semibold text-zinc-900">1. Crew</h4>
        {trip.staff.length === 0 ? (
          <p className="text-xs text-zinc-500">No crew yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {trip.staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                <span>
                  <span className="font-medium text-zinc-900">
                    {s.staff.firstName} {s.staff.lastName}
                  </span>
                  <span className="ml-2 text-xs text-zinc-500">{ROLE_LABELS[s.role]}</span>
                </span>
                {open && (
                  <ActionButton
                    action={removeCrew}
                    fields={{ tripId: trip.id, staffId: s.staffId }}
                    pendingLabel="Removing…"
                    variant="ghost"
                    size="xs"
                  >
                    Remove
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
        {open && <CrewForm tripId={trip.id} staff={prep.staff} hasBoat={Boolean(trip.boat)} hasCaptain={hasCaptain} />}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-900">2. Planned site</h4>
        {open ? (
          <SiteForm tripId={trip.id} sites={prep.sites} current={trip.plannedSiteId} />
        ) : (
          <p className="text-sm text-zinc-700">{trip.plannedSite?.nameEn ?? "Not decided"}</p>
        )}
        {open && trip.bookings.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
            {suggestions.length === 0 ? (
              <span>No other site suits these divers (skill, certification, not dived in the last 3 days).</span>
            ) : (
              <>
                <span>Suits these divers:</span>
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
        <h4 className="text-sm font-semibold text-zinc-900">3. Divers</h4>
        {trip.bookings.length === 0 ? (
          <p className="text-xs text-zinc-500">No divers yet. Add them from the unassigned list.</p>
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
                    Remove
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

async function PreparationTab({ date, slot }: { date: string; slot: TimeSlot }) {
  let prep: DivePrep;
  try {
    prep = await getDivePrep(date, slot);
  } catch (e) {
    return <LoadError what="The preparation" reason={e} />;
  }
  const openTrips = prep.trips.filter((t) => t.status === "PLANNED" || t.status === "ACTIVE");
  const assigned = prep.trips.reduce((n, t) => n + t.capacity.divers, 0);
  const waiting = prep.unassigned.reduce((n, b) => n + b.participantCount, 0);
  const room = openTrips.reduce((n, t) => n + Math.max(0, t.capacity.available), 0);
  const slotFields = { date, timeSlot: slot };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200">
        <div className="text-sm text-zinc-700">
          <p>
            <span className="font-semibold text-zinc-900">{assigned + waiting}</span> confirmed divers:{" "}
            {assigned} on trips, {waiting} waiting · room for {room} more on open trips
            {waiting > room && <span className="font-medium text-red-700"> — {waiting - room} short</span>}
          </p>
          {prep.pendingCount > 0 && (
            <p className="text-xs text-zinc-500">
              {prep.pendingCount} pending booking{prep.pendingCount === 1 ? "" : "s"} not shown; confirm them in
              Bookings to prepare them.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {prep.unassigned.length > 0 && prep.trips.some((t) => t.status === "PLANNED") && (
            <ActionButton action={autoAssign} fields={slotFields} pendingLabel="Assigning…" variant="default">
              Auto-assign divers
            </ActionButton>
          )}
          {prep.boatsWithoutTrip.map((b) => (
            <ActionButton
              key={b.id}
              action={addTrip}
              fields={{ ...slotFields, boatId: b.id, capacity: String(b.capacity) }}
              pendingLabel="Adding…"
            >
              + {b.name}
            </ActionButton>
          ))}
          {!prep.hasShoreTrip && (
            <ActionButton action={addTrip} fields={slotFields} pendingLabel="Adding…">
              + Shore dive
            </ActionButton>
          )}
        </div>
      </div>

      {prep.trips.length === 0 ? (
        <p className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          No trips in this slot yet. Add a boat or a shore dive above.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {prep.trips.map((t) => (
            <TripCard key={t.id} trip={t} prep={prep} />
          ))}
        </div>
      )}

      <section className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
        <h3 className="font-semibold text-zinc-900">Unassigned divers ({prep.unassigned.length})</h3>
        {prep.unassigned.length === 0 ? (
          <p className="text-sm text-zinc-500">Every confirmed booking in this slot is on a trip.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {prep.unassigned.map((b) => (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <DiverLine b={b} />
                <div className="flex flex-wrap items-start justify-end gap-1.5">
                  {openTrips.length === 0 && <span className="text-xs text-zinc-500">No open trip</span>}
                  {openTrips.map((t) => {
                    const fits = t.capacity.available >= b.participantCount;
                    return (
                      <ActionButton
                        key={t.id}
                        action={assignDiver}
                        fields={{ tripId: t.id, bookingId: b.id }}
                        pendingLabel="…"
                        disabled={!fits}
                        size="xs"
                      >
                        {t.boat?.name ?? "Shore"} ({fits ? `${t.capacity.available} left` : "full"})
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

async function ReportTab({ date }: { date: string }) {
  let trips, sites;
  try {
    [trips, sites] = await Promise.all([getTrips(date, date), getDiveSites()]);
  } catch (e) {
    return <LoadError what="The trips" reason={e} />;
  }
  const shown = trips.filter((t) => t.status !== "CANCELLED");
  const siteOptions = sites.map((s) => ({ id: s.id, nameEn: s.nameEn, difficultyLevel: s.difficultyLevel }));
  if (shown.length === 0) {
    return <p className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">No trips on this day.</p>;
  }
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
        After the boats return, record the actual site, entry and exit times and any notes for the marine authority,
        then complete the dive. Completed dives go into the compliance report.
      </p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {shown.map((t) => (
          <article
            key={t.id}
            className={`space-y-3 rounded-xl bg-white p-5 ring-1 ${t.status === "COMPLETED" ? "ring-2 ring-green-400" : "ring-zinc-200"}`}
          >
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-zinc-900">
                  {SLOT_NAMES[t.timeSlot]} · {t.boat?.name ?? "Shore dive"}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t._count.bookings} booking{t._count.bookings === 1 ? "" : "s"} · planned site{" "}
                  {t.plannedSite?.nameEn ?? "not set"}
                </p>
              </div>
              <TripStatusBadge status={t.status} />
            </header>
            {t.status === "PLANNED" ? (
              <p className="text-sm text-zinc-500">
                Not started yet.{" "}
                <Link href={prepHref({ date, slot: t.timeSlot })} prefetch={false} className="underline">
                  Prepare and start it
                </Link>{" "}
                before reporting.
              </p>
            ) : (
              <ReportForm trip={t} sites={siteOptions} />
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

async function ComplianceTab({ date }: { date: string }) {
  let report;
  try {
    report = await getComplianceReport(date);
  } catch (e) {
    return <LoadError what="The compliance report" reason={e} />;
  }
  const people = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-zinc-600">
          Completed dives only, with what Spanish regulations (RD 933/2021) require: site, times, crew and each
          diver&apos;s gender, certification and nationality.
        </p>
        {report.trips.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={`/dashboard/dive-prep/compliance-csv?date=${date}`} download />}
            >
              Download CSV
            </Button>
            <PrintButton />
          </div>
        )}
      </div>
      <h2 className="hidden text-xl font-semibold print:block">
        Dive compliance report · {formatDayLabel(date, "long")}
      </h2>
      {report.trips.length === 0 ? (
        <p className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          No completed dives on this day. Complete dives in Post-dive reports to include them.
        </p>
      ) : (
        report.trips.map((t, i) => (
          <article key={t.id} className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200 print:break-inside-avoid print:ring-zinc-400">
            <h3 className="font-semibold text-zinc-900">
              Dive {i + 1}: {SLOT_NAMES[t.timeSlot]} · {t.boat?.name ?? "Shore dive"}
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
              {[
                ["Planned site", t.plannedSite?.nameEn ?? "—"],
                ["Actual site", t.actualSite?.nameEn ?? "—"],
                ["Entry", t.entryTime ?? "—"],
                ["Exit", t.exitTime ?? "—"],
                ["Captain", t.captain ? people(t.captain) : t.boat ? "—" : "Shore dive"],
                ["Guides", t.guides.length > 0 ? t.guides.map((g) => `${people(g)} (${ROLE_LABELS[g.role]})`).join(", ") : "—"],
                ["Divers", String(t.totals.divers)],
                ["Gender", `${t.totals.male} M · ${t.totals.female} F · ${t.totals.unspecified} unspecified`],
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
                  <th className="py-1.5 font-medium">Diver</th>
                  <th className="py-1.5 font-medium">Gender</th>
                  <th className="py-1.5 font-medium">Certification</th>
                  <th className="py-1.5 font-medium">Nationality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {t.divers.map((d) => (
                  <tr key={d.bookingId}>
                    <td className="py-1.5">
                      {d.name}
                      {d.companions > 0 && <span className="text-zinc-500"> +{d.companions} (not named)</span>}
                    </td>
                    <td className="py-1.5">{d.gender ? (GENDER_LABELS[d.gender] ?? d.gender) : "Not specified"}</td>
                    <td className="py-1.5">{certificationLabel(d.certification)}</td>
                    <td className="py-1.5">{countryLabel(d.nationality)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {t.reportNotes && <p className="whitespace-pre-line text-sm text-zinc-700">Notes: {t.reportNotes}</p>}
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
  const params = await searchParams;
  const tab = PREP_TABS.find((t) => t.key === one(params.tab))?.key ?? "prep";
  const rawDate = one(params.date);
  const date = rawDate && ISO_DATE.test(rawDate) ? rawDate : centerNow().isoDate;
  const slot = TRIP_SLOTS.find((s) => s === one(params.slot)) ?? "MORNING";

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold text-zinc-900">Dive Prep</h1>
        <p className="mt-1 text-sm text-zinc-500">{formatDayLabel(date, "long")}</p>
      </div>
      <nav aria-label="Dive prep sections" className="flex gap-1 overflow-x-auto border-b border-zinc-200 print:hidden">
        {PREP_TABS.map((t) => (
          <Link
            key={t.key}
            href={prepHref({ tab: t.key, date, slot })}
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
      <div className="print:hidden">
        <PrepControls tab={tab} date={date} slot={slot} />
      </div>
      {tab === "prep" && <PreparationTab date={date} slot={slot} />}
      {tab === "report" && <ReportTab date={date} />}
      {tab === "compliance" && <ComplianceTab date={date} />}
    </main>
  );
}
