import Link from "next/link";
import {
  AssignStaffForm,
  CreateDiverForm,
  DiverEquipment,
  LinkBookingButton,
  RemoveStaffButton,
  TripStatusActions,
} from "@/components/schedule/trip-forms";
import { Button } from "@/components/ui/button";
import type { BoatsNeededDay, Booking, Staff, TripDetail, TripListItem, TripStatus } from "@/lib/api";
import { ACTIVITY_LABELS, STATUS_LABELS as BOOKING_STATUS_LABELS, parseGuestNotes } from "@/lib/bookings";
import { equipmentSummary } from "@/lib/dive-prep";
import type { T } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";
import {
  formatDayLabel,
  isTripOpen,
  monthDays,
  ROLE_LABELS,
  SLOT_ACCENT,
  SLOT_NAMES,
  SLOT_PILL,
  shoreSession,
  TRIP_STATUS_LABELS,
  TRIP_STATUS_STYLES,
  tripDay,
} from "@/lib/trips";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Trip = TripListItem | TripDetail;
type HrefFor = { day: (iso: string) => string; trip: (id: string) => string };

function tripsByDay(trips: TripListItem[]) {
  const map = new Map<string, TripListItem[]>();
  for (const t of trips) {
    const key = tripDay(t.date);
    map.set(key, [...(map.get(key) ?? []), t]);
  }
  return map;
}

function siteName(trip: Trip) {
  return trip.actualSite?.nameEn ?? trip.plannedSite?.nameEn ?? null;
}

// The boat, or a shore trip's session ("Shore 10:00–11:00").
function boatName(trip: Trip, t: T) {
  if (trip.boat) return trip.boat.name;
  return trip.startTime ? t("Shore {time}", { time: shoreSession(trip.startTime) }) : t("Shore dive");
}

// Boat trips first, then shore sessions by start time.
function boatThenShore<X extends Trip>(trips: X[]) {
  return [...trips.filter((x) => !x.isShore), ...trips.filter((x) => x.isShore).sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))];
}

// A shore trip's pill and card edge: sand, to tell them from boat trips.
const SHORE_PILL = "bg-amber-200 text-amber-950 hover:bg-amber-300";
const SHORE_ACCENT = "border-l-amber-400";

function tripCount(n: number, t: T) {
  return n === 1 ? t("1 trip") : t("{count} trips", { count: n });
}

function bookingCount(n: number, t: T) {
  return n === 1 ? t("1 booking") : t("{count} bookings", { count: n });
}

function diverCount(n: number, t: T) {
  return n === 1 ? t("1 diver") : t("{count} divers", { count: n });
}

export async function TripStatusBadge({ status }: { status: TripStatus }) {
  const t = await getT();
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TRIP_STATUS_STYLES[status]}`}>
      {t(TRIP_STATUS_LABELS[status])}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">{children}</div>
  );
}

// A day's boat needs: "2 boats needed", in red with a warning when its boat
// trips cannot seat every confirmed diver (not for days gone by). The title
// gives each slot.
async function BoatsNeededNote({ need, past = false, compact = false }: { need: BoatsNeededDay | undefined; past?: boolean; compact?: boolean }) {
  const tr = await getT();
  if (!need || need.boatsNeeded === 0) return null;
  const boats = (n: number) => (n === 1 ? tr("1 boat needed") : tr("{count} boats needed", { count: n }));
  const detail = need.slots
    .map((s) =>
      [
        `${tr(SLOT_NAMES[s.timeSlot])}: ${s.divers === 1 ? tr("1 diver") : tr("{count} divers", { count: s.divers })}`,
        boats(s.boatsNeeded),
        s.trips === 0 ? tr("no boat trip planned yet") : tr("{count} seats on the trips planned", { count: s.tripSeats }),
        ...(s.unseated > 0 ? [tr("{count} more than the fleet seats", { count: s.unseated })] : []),
      ].join(" · "),
    )
    .join("\n");
  const warn = need.short && !past;
  const text = boats(need.boatsNeeded);
  return (
    <span
      title={detail}
      className={`relative block truncate ${compact ? "text-[0.65rem]" : "text-xs"} ${warn ? "font-semibold text-red-700" : "text-zinc-500"}`}
    >
      {warn ? `⚠ ${text}` : text}
      {warn && <span className="sr-only"> · {tr("the trips planned cannot seat every confirmed diver")}</span>}
    </span>
  );
}

export async function MonthView({
  anchor,
  today,
  trips,
  href,
  needs,
}: {
  anchor: string;
  today: string;
  trips: TripListItem[];
  href: HrefFor;
  needs?: Map<string, BoatsNeededDay>;
}) {
  const tr = await getT();
  const { days, leadingBlanks } = monthDays(anchor);
  const byDay = tripsByDay(trips);
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[42rem] grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-semibold text-zinc-500">
            {tr(d)}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day) => {
          const dayTrips = byDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <div
              key={day}
              className={`relative flex min-h-28 flex-col gap-1 rounded-lg bg-white p-1.5 ring-1 transition-colors hover:bg-zinc-50 ${
                isToday ? "ring-2 ring-[#0096c7]" : "ring-zinc-200"
              }`}
            >
              {/* The whole cell opens the day; pills sit above it and open their trip. */}
              <Link
                href={href.day(day)}
                prefetch={false}
                scroll={false}
                className="absolute inset-0 rounded-lg"
                aria-label={`${formatDayLabel(day, "long")}: ${tripCount(dayTrips.length, tr)}`}
              />
              <span className={`text-xs ${isToday ? "font-bold text-[#0096c7]" : "text-zinc-700"}`}>
                {Number(day.slice(8))}
              </span>
              <BoatsNeededNote need={needs?.get(day)} past={day < today} compact />
              {boatThenShore(dayTrips).map((t) => (
                <Link
                  key={t.id}
                  href={href.trip(t.id)}
                  prefetch={false}
                  scroll={false}
                  className={`relative truncate rounded px-1.5 py-0.5 text-[0.7rem] font-medium ${t.isShore ? SHORE_PILL : SLOT_PILL[t.timeSlot]} ${
                    t.status === "CANCELLED" ? "line-through opacity-50" : ""
                  }`}
                  title={`${tr(SLOT_NAMES[t.timeSlot])} · ${boatName(t, tr)}${siteName(t) ? ` · ${siteName(t)}` : ""}`}
                >
                  {t.isShore && t.startTime ? `${t.startTime} · ${tr("Shore")}` : `${tr(SLOT_NAMES[t.timeSlot]).slice(0, 2)} · ${boatName(t, tr)}`} ({t._count.bookings})
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export async function TripCard({ trip, href, compact = false }: { trip: TripListItem; href: string; compact?: boolean }) {
  const t = await getT();
  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      className={`block rounded-lg border-l-4 bg-white p-2.5 text-left ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 ${
        trip.isShore ? SHORE_ACCENT : SLOT_ACCENT[trip.timeSlot]
      } ${trip.status === "CANCELLED" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">{t(SLOT_NAMES[trip.timeSlot])}</p>
        <TripStatusBadge status={trip.status} />
      </div>
      <p className="mt-1 truncate text-sm text-zinc-700">{boatName(trip, t)}</p>
      <p className="truncate text-xs text-zinc-500">{siteName(trip) ?? t("Site not set")}</p>
      <p className="mt-1.5 text-xs text-zinc-600">
        {t("{count} staff", { count: trip.staff.length })} · {bookingCount(trip._count.bookings, t)} ·{" "}
        {t("max {count}", { count: trip.maxDivers })}
      </p>
      {!compact && trip.staff.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-600">
          {trip.staff.map((s) => (
            <li key={s.id} className="truncate">
              {s.staff.firstName} {s.staff.lastName} <span className="text-zinc-400">· {t(ROLE_LABELS[s.role])}</span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

export async function WeekView({
  days,
  today,
  trips,
  href,
  needs,
}: {
  days: string[];
  today: string;
  trips: TripListItem[];
  href: HrefFor;
  needs?: Map<string, BoatsNeededDay>;
}) {
  const tr = await getT();
  const byDay = tripsByDay(trips);
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {days.map((day) => {
        const dayTrips = byDay.get(day) ?? [];
        const isToday = day === today;
        return (
          <section
            key={day}
            className={`flex min-h-40 flex-col gap-2 rounded-xl bg-zinc-50 p-2 ring-1 ${
              isToday ? "ring-2 ring-[#0096c7]" : "ring-zinc-200"
            }`}
          >
            <Link
              href={href.day(day)}
              prefetch={false}
              scroll={false}
              className={`text-center text-xs font-semibold hover:underline ${isToday ? "text-[#0096c7]" : "text-zinc-700"}`}
            >
              {formatDayLabel(day, "weekday")}
            </Link>
            <div className="text-center">
              <BoatsNeededNote need={needs?.get(day)} past={day < today} />
            </div>
            {dayTrips.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-400">{tr("No trips")}</p>
            ) : (
              <>
                {dayTrips.filter((t) => !t.isShore).map((t) => <TripCard key={t.id} trip={t} href={href.trip(t.id)} />)}
                {dayTrips.some((t) => t.isShore) && (
                  <p className="pt-1 text-[0.7rem] font-semibold uppercase tracking-wide text-amber-800">{tr("Shore")}</p>
                )}
                {boatThenShore(dayTrips.filter((t) => t.isShore)).map((t) => <TripCard key={t.id} trip={t} href={href.trip(t.id)} />)}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

// The day panel opened from the month view.
export async function DaySummary({ trips, href }: { trips: TripListItem[]; href: HrefFor }) {
  const t = await getT();
  if (trips.length === 0) return <p className="text-sm text-zinc-500">{t("No trips scheduled for this day.")}</p>;
  const boat = trips.filter((x) => !x.isShore);
  const shore = boatThenShore(trips.filter((x) => x.isShore));
  return (
    <div className="space-y-3">
      {boat.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("Boat trips")}</h3>
          {boat.map((x) => (
            <TripCard key={x.id} trip={x} href={href.trip(x.id)} compact />
          ))}
        </div>
      )}
      {shore.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t("Shore sessions")}</h3>
          {shore.map((x) => (
            <TripCard key={x.id} trip={x} href={href.trip(x.id)} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {children}
    </section>
  );
}

async function InfoGrid({ trip }: { trip: TripDetail }) {
  const t = await getT();
  const rows: [string, string][] = [
    [t("Date"), formatDayLabel(tripDay(trip.date), "long")],
    [t("Time slot"), t(SLOT_NAMES[trip.timeSlot])],
    [
      t("Boat"),
      trip.boat
        ? t("{boat} ({count} places)", { boat: trip.boat.name, count: trip.boat.capacity })
        : trip.startTime
          ? t("Shore session {session}", { session: shoreSession(trip.startTime) })
          : t("Shore dive"),
    ],
    [t("Planned site"), trip.plannedSite?.nameEn ?? "—"],
    [t("Actual site"), trip.actualSite?.nameEn ?? "—"],
    [
      t("Divers"),
      t("{count} of {max}", {
        count: trip.bookings.reduce((n, b) => n + (isSeatHolding(b.status) ? b.participantCount : 0), 0),
        max: trip.maxDivers,
      }),
    ],
  ];
  return (
    <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-zinc-500">{label}</dt>
          <dd className="text-zinc-900">{value}</dd>
        </div>
      ))}
      {trip.notes && (
        <div className="contents">
          <dt className="text-zinc-500">{t("Notes")}</dt>
          <dd className="whitespace-pre-wrap text-zinc-900">{trip.notes}</dd>
        </div>
      )}
    </dl>
  );
}

function isSeatHolding(status: Booking["status"]) {
  return status === "PENDING" || status === "CONFIRMED" || status === "COMPLETED";
}

async function BookingLine({ b }: { b: Pick<Booking, "id" | "activityType" | "participantCount" | "status"> & { customer: Booking["customer"] } }) {
  const t = await getT();
  return (
    <>
      <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="font-medium text-zinc-900 hover:underline">
        {b.customer.firstName} {b.customer.lastName}
      </Link>
      <span className="block text-xs text-zinc-500">
        {ACTIVITY_LABELS[b.activityType] ? t(ACTIVITY_LABELS[b.activityType]) : b.activityType} ·{" "}
        {diverCount(b.participantCount, t)} · {t(BOOKING_STATUS_LABELS[b.status])}
      </span>
    </>
  );
}

// Full trip detail. With `manage`, the staff, status and booking controls
// are shown (the trip panel); without, it is read-only (the day view).
export async function TripDetailBody({
  trip,
  manage,
}: {
  trip: TripDetail;
  manage?: { availableStaff: Staff[]; linkableBookings: Booking[] };
}) {
  const t = await getT();
  const open = isTripOpen(trip.status);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TripStatusBadge status={trip.status} />
        {manage && <TripStatusActions tripId={trip.id} status={trip.status} />}
      </div>

      <InfoGrid trip={trip} />

      <Section title={t("Staff ({count})", { count: trip.staff.length })}>
        {trip.staff.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("No staff assigned yet.")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {trip.staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-zinc-900">
                    {s.staff.firstName} {s.staff.lastName}
                  </span>
                  <span className="ml-2 text-zinc-500">{t(ROLE_LABELS[s.role])}</span>
                </span>
                {manage && (
                  <RemoveStaffButton
                    tripId={trip.id}
                    staffId={s.staffId}
                    name={`${s.staff.firstName} ${s.staff.lastName}`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {manage && open && <AssignStaffForm tripId={trip.id} staff={manage.availableStaff} />}
      </Section>

      <Section title={t("Bookings ({count})", { count: trip.bookings.length })}>
        {trip.bookings.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("No bookings linked yet.")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {trip.bookings.map((b) => (
              <li key={b.id} className="px-3 py-2 text-sm">
                <BookingLine b={b} />
                {/* Their sizes, and what they rent on this booking. */}
                <span className="mt-0.5 block text-xs text-zinc-500">{equipmentSummary(b.customer, t)}</span>
                <DiverEquipment
                  bookingId={b.id}
                  items={parseGuestNotes(b.notes)?.selectedEquipment ?? []}
                  diver={b.customer}
                  editable={Boolean(manage) && open}
                />
              </li>
            ))}
          </ul>
        )}
        {manage && open && <CreateDiverForm tripId={trip.id} isShore={!trip.boat} />}
      </Section>

      {manage && open && manage.linkableBookings.length > 0 && (
        <Section title={t("Bookings for this slot not on a trip yet")}>
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {manage.linkableBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <BookingLine b={b} />
                </span>
                <LinkBookingButton tripId={trip.id} bookingId={b.id} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

export async function DayView({ trips, href }: { trips: TripDetail[]; href: HrefFor }) {
  const tr = await getT();
  if (trips.length === 0) return <EmptyState>{tr("No trips scheduled for this day.")}</EmptyState>;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {boatThenShore(trips).map((t) => (
        <article
          key={t.id}
          className={`space-y-4 rounded-xl border-l-4 bg-white p-5 ring-1 ring-zinc-200 ${t.isShore ? SHORE_ACCENT : SLOT_ACCENT[t.timeSlot]}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {tr(SLOT_NAMES[t.timeSlot])} · {boatName(t, tr)}
              </h2>
              <p className="text-sm text-zinc-500">{siteName(t) ?? tr("Site not set")}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={href.trip(t.id)} prefetch={false} scroll={false} />}
            >
              {tr("Manage")}
            </Button>
          </div>
          <TripDetailBody trip={t} />
        </article>
      ))}
    </div>
  );
}
