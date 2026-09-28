import Link from "next/link";
import {
  AssignStaffForm,
  LinkBookingButton,
  RemoveStaffButton,
  TripStatusActions,
} from "@/components/schedule/trip-forms";
import { Button } from "@/components/ui/button";
import type { Booking, Staff, TripDetail, TripListItem, TripStatus } from "@/lib/api";
import { ACTIVITY_LABELS, STATUS_LABELS as BOOKING_STATUS_LABELS } from "@/lib/bookings";
import {
  formatDayLabel,
  isTripOpen,
  monthDays,
  ROLE_LABELS,
  SLOT_ACCENT,
  SLOT_NAMES,
  SLOT_PILL,
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

function boatName(trip: Trip) {
  return trip.boat?.name ?? "Shore dive";
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TRIP_STATUS_STYLES[status]}`}>
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">{children}</div>
  );
}

export function MonthView({
  anchor,
  today,
  trips,
  href,
}: {
  anchor: string;
  today: string;
  trips: TripListItem[];
  href: HrefFor;
}) {
  const { days, leadingBlanks } = monthDays(anchor);
  const byDay = tripsByDay(trips);
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[42rem] grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-semibold text-zinc-500">
            {d}
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
                aria-label={`${formatDayLabel(day, "long")}: ${plural(dayTrips.length, "trip")}`}
              />
              <span className={`text-xs ${isToday ? "font-bold text-[#0096c7]" : "text-zinc-700"}`}>
                {Number(day.slice(8))}
              </span>
              {dayTrips.map((t) => (
                <Link
                  key={t.id}
                  href={href.trip(t.id)}
                  prefetch={false}
                  scroll={false}
                  className={`relative truncate rounded px-1.5 py-0.5 text-[0.7rem] font-medium ${SLOT_PILL[t.timeSlot]} ${
                    t.status === "CANCELLED" ? "line-through opacity-50" : ""
                  }`}
                  title={`${SLOT_NAMES[t.timeSlot]} · ${boatName(t)}${siteName(t) ? ` · ${siteName(t)}` : ""}`}
                >
                  {SLOT_NAMES[t.timeSlot].slice(0, 2)} · {boatName(t)} ({t._count.bookings})
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TripCard({ trip, href, compact = false }: { trip: TripListItem; href: string; compact?: boolean }) {
  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      className={`block rounded-lg border-l-4 bg-white p-2.5 text-left ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 ${
        SLOT_ACCENT[trip.timeSlot]
      } ${trip.status === "CANCELLED" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-900">{SLOT_NAMES[trip.timeSlot]}</p>
        <TripStatusBadge status={trip.status} />
      </div>
      <p className="mt-1 truncate text-sm text-zinc-700">{boatName(trip)}</p>
      <p className="truncate text-xs text-zinc-500">{siteName(trip) ?? "Site not set"}</p>
      <p className="mt-1.5 text-xs text-zinc-600">
        {trip.staff.length} staff · {plural(trip._count.bookings, "booking")} ·
        max {trip.maxDivers}
      </p>
      {!compact && trip.staff.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-600">
          {trip.staff.map((s) => (
            <li key={s.id} className="truncate">
              {s.staff.firstName} {s.staff.lastName} <span className="text-zinc-400">· {ROLE_LABELS[s.role]}</span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

export function WeekView({
  days,
  today,
  trips,
  href,
}: {
  days: string[];
  today: string;
  trips: TripListItem[];
  href: HrefFor;
}) {
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
            {dayTrips.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-400">No trips</p>
            ) : (
              dayTrips.map((t) => <TripCard key={t.id} trip={t} href={href.trip(t.id)} />)
            )}
          </section>
        );
      })}
    </div>
  );
}

// The day panel opened from the month view.
export function DaySummary({ trips, href }: { trips: TripListItem[]; href: HrefFor }) {
  if (trips.length === 0) return <p className="text-sm text-zinc-500">No trips scheduled for this day.</p>;
  return (
    <div className="space-y-2">
      {trips.map((t) => (
        <TripCard key={t.id} trip={t} href={href.trip(t.id)} compact />
      ))}
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

function InfoGrid({ trip }: { trip: TripDetail }) {
  const rows: [string, string][] = [
    ["Date", formatDayLabel(tripDay(trip.date), "long")],
    ["Time slot", SLOT_NAMES[trip.timeSlot]],
    ["Boat", trip.boat ? `${trip.boat.name} (${trip.boat.capacity} places)` : "Shore dive"],
    ["Planned site", trip.plannedSite?.nameEn ?? "—"],
    ["Actual site", trip.actualSite?.nameEn ?? "—"],
    ["Divers", `${trip.bookings.reduce((n, b) => n + (isSeatHolding(b.status) ? b.participantCount : 0), 0)} of ${trip.maxDivers}`],
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
          <dt className="text-zinc-500">Notes</dt>
          <dd className="whitespace-pre-wrap text-zinc-900">{trip.notes}</dd>
        </div>
      )}
    </dl>
  );
}

function isSeatHolding(status: Booking["status"]) {
  return status === "PENDING" || status === "CONFIRMED" || status === "COMPLETED";
}

function BookingLine({ b }: { b: Pick<Booking, "id" | "activityType" | "participantCount" | "status"> & { customer: Booking["customer"] } }) {
  return (
    <>
      <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="font-medium text-zinc-900 hover:underline">
        {b.customer.firstName} {b.customer.lastName}
      </Link>
      <span className="block text-xs text-zinc-500">
        {ACTIVITY_LABELS[b.activityType] ?? b.activityType} · {plural(b.participantCount, "diver")} ·{" "}
        {BOOKING_STATUS_LABELS[b.status]}
      </span>
    </>
  );
}

// Full trip detail. With `manage`, the staff, status and booking controls
// are shown (the trip panel); without, it is read-only (the day view).
export function TripDetailBody({
  trip,
  manage,
}: {
  trip: TripDetail;
  manage?: { availableStaff: Staff[]; linkableBookings: Booking[] };
}) {
  const open = isTripOpen(trip.status);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TripStatusBadge status={trip.status} />
        {manage && <TripStatusActions tripId={trip.id} status={trip.status} />}
      </div>

      <InfoGrid trip={trip} />

      <Section title={`Staff (${trip.staff.length})`}>
        {trip.staff.length === 0 ? (
          <p className="text-sm text-zinc-500">No staff assigned yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {trip.staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-zinc-900">
                    {s.staff.firstName} {s.staff.lastName}
                  </span>
                  <span className="ml-2 text-zinc-500">{ROLE_LABELS[s.role]}</span>
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

      <Section title={`Bookings (${trip.bookings.length})`}>
        {trip.bookings.length === 0 ? (
          <p className="text-sm text-zinc-500">No bookings linked yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg ring-1 ring-zinc-200">
            {trip.bookings.map((b) => (
              <li key={b.id} className="px-3 py-2 text-sm">
                <BookingLine b={b} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {manage && open && manage.linkableBookings.length > 0 && (
        <Section title="Bookings for this slot not on a trip yet">
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

export function DayView({ trips, href }: { trips: TripDetail[]; href: HrefFor }) {
  if (trips.length === 0) return <EmptyState>No trips scheduled for this day.</EmptyState>;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {trips.map((t) => (
        <article
          key={t.id}
          className={`space-y-4 rounded-xl border-l-4 bg-white p-5 ring-1 ring-zinc-200 ${SLOT_ACCENT[t.timeSlot]}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {SLOT_NAMES[t.timeSlot]} · {boatName(t)}
              </h2>
              <p className="text-sm text-zinc-500">{siteName(t) ?? "Site not set"}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={href.trip(t.id)} prefetch={false} scroll={false} />}
            >
              Manage
            </Button>
          </div>
          <TripDetailBody trip={t} />
        </article>
      ))}
    </div>
  );
}
