import Link from "next/link";
import { RoutedDialog, RoutedSheet } from "@/components/routed-panel";
import { NewTripForm } from "@/components/schedule/trip-forms";
import { DaySummary, DayView, MonthView, TripDetailBody, WeekView } from "@/components/schedule/views";
import { Button } from "@/components/ui/button";
import {
  getBoats,
  getBookings,
  getDiveSites,
  getStaff,
  getTrip,
  getTrips,
  type Booking,
  type TripDetail,
} from "@/lib/api";
import { centerNow } from "@/lib/center-time";
import {
  addDays,
  formatDayLabel,
  rangeLabel,
  SCHEDULE_VIEWS,
  scheduleHref,
  shiftAnchor,
  SLOT_DOT,
  SLOT_NAMES,
  TRIP_SLOTS,
  tripDay,
  viewRange,
  type ScheduleView,
} from "@/lib/trips";
import { centerLocale } from "@/lib/center";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VIEW_LABELS: Record<ScheduleView, string> = { month: "Month", week: "Week", day: "Day" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isoOrUndefined(value: string | undefined) {
  return value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined;
}

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

// Bookings the trip panel offers to link: same day, slot and (if the trip has
// one) boat, still holding a place, and not already on this trip.
async function linkableBookings(trip: TripDetail): Promise<Booking[]> {
  const bookings = await getBookings({ date: tripDay(trip.date), boatId: trip.boatId ?? undefined });
  return bookings.filter(
    (b) =>
      b.timeSlot === trip.timeSlot &&
      b.tripId !== trip.id &&
      (b.status === "PENDING" || b.status === "CONFIRMED"),
  );
}

async function loadTripPanel(id: string) {
  const trip = await getTrip(id);
  const [staff, bookings] = await Promise.all([getStaff({ status: "ACTIVE" }), linkableBookings(trip)]);
  const onTrip = new Set(trip.staff.map((s) => s.staffId));
  return { trip, availableStaff: staff.filter((s) => !onTrip.has(s.id)), linkableBookings: bookings };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { timeZone } = await centerLocale();
  const params = await searchParams;
  const today = centerNow(timeZone).isoDate;
  const view = SCHEDULE_VIEWS.find((v) => v === one(params.view)) ?? "month";
  const anchor = isoOrUndefined(one(params.date)) ?? today;
  const day = isoOrUndefined(one(params.day));
  const tripId = UUID.test(one(params.trip) ?? "") ? one(params.trip) : undefined;
  const newTripDate = isoOrUndefined(one(params.new));

  const base = { view, date: anchor };
  const href = {
    day: (iso: string) =>
      // In the month view a day opens its panel; elsewhere it opens the day view.
      view === "month" ? scheduleHref({ ...base, day: iso }) : scheduleHref({ view: "day", date: iso }),
    trip: (id: string) => scheduleHref({ ...base, trip: id }),
  };
  const closeHref = scheduleHref(base);
  const { from, to } = viewRange(view, anchor);

  const [tripsResult, panelResult, formResult] = await Promise.allSettled([
    getTrips(from, to).then(async (trips) => ({
      trips,
      // The day view shows full detail, which the list does not carry.
      details: view === "day" ? await Promise.all(trips.map((t) => getTrip(t.id))) : [],
    })),
    tripId ? loadTripPanel(tripId) : Promise.resolve(null),
    newTripDate ? Promise.all([getBoats(), getDiveSites()]) : Promise.resolve(null),
  ]);

  const dayTrips =
    day && view === "month" && tripsResult.status === "fulfilled"
      ? tripsResult.value.trips.filter((t) => tripDay(t.date) === day)
      : [];

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Schedule</h1>
        <Button
          nativeButton={false}
          render={<Link href={scheduleHref({ ...base, new: day ?? (view === "month" ? today : anchor) })} prefetch={false} scroll={false} />}
        >
          New Trip
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-zinc-200">
        <div className="flex gap-1" role="group" aria-label="View">
          {SCHEDULE_VIEWS.map((v) => (
            <Button
              key={v}
              size="sm"
              variant={v === view ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={scheduleHref({ view: v, date: anchor })} prefetch={false} aria-current={v === view ? "page" : undefined} />}
            >
              {VIEW_LABELS[v]}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={scheduleHref({ view, date: shiftAnchor(view, anchor, -1) })} prefetch={false} aria-label="Previous" />}>
            ‹
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={scheduleHref({ view, date: today })} prefetch={false} />}>
            Today
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={scheduleHref({ view, date: shiftAnchor(view, anchor, 1) })} prefetch={false} aria-label="Next" />}>
            ›
          </Button>
        </div>
        <p className="font-medium text-zinc-900">{rangeLabel(view, anchor)}</p>
        <div className="ml-auto flex gap-3 text-xs text-zinc-600">
          {TRIP_SLOTS.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${SLOT_DOT[s]}`} />
              {SLOT_NAMES[s]}
            </span>
          ))}
        </div>
      </div>

      {tripsResult.status === "rejected" ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          Trips could not be loaded: {errorMessage(tripsResult.reason)}
        </p>
      ) : view === "month" ? (
        <MonthView anchor={anchor} today={today} trips={tripsResult.value.trips} href={href} />
      ) : view === "week" ? (
        <WeekView
          days={Array.from({ length: 7 }, (_, i) => addDays(anchor, i))}
          today={today}
          trips={tripsResult.value.trips}
          href={href}
        />
      ) : (
        <DayView trips={tripsResult.value.details} href={href} />
      )}

      {day && view === "month" && !tripId && (
        <RoutedSheet closeHref={closeHref} title={formatDayLabel(day, "long")} description={`${dayTrips.length} trip${dayTrips.length === 1 ? "" : "s"}`}>
          <DaySummary trips={dayTrips} href={href} />
          <div className="flex gap-2">
            <Button size="sm" nativeButton={false} render={<Link href={scheduleHref({ ...base, new: day })} prefetch={false} scroll={false} />}>
              New trip on this day
            </Button>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={scheduleHref({ view: "day", date: day })} prefetch={false} />}>
              Open day view
            </Button>
          </div>
        </RoutedSheet>
      )}

      {tripId &&
        (panelResult.status === "rejected" ? (
          <RoutedSheet closeHref={closeHref} title="Trip">
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
              The trip could not be loaded: {errorMessage(panelResult.reason)}
            </p>
          </RoutedSheet>
        ) : (
          panelResult.value && (
            <RoutedSheet
              closeHref={closeHref}
              title={`${SLOT_NAMES[panelResult.value.trip.timeSlot]} · ${panelResult.value.trip.boat?.name ?? "Shore dive"}`}
              description={formatDayLabel(tripDay(panelResult.value.trip.date), "long")}
            >
              <TripDetailBody
                trip={panelResult.value.trip}
                manage={{
                  availableStaff: panelResult.value.availableStaff,
                  linkableBookings: panelResult.value.linkableBookings,
                }}
              />
            </RoutedSheet>
          )
        ))}

      {newTripDate && (
        <RoutedDialog closeHref={closeHref} title="New trip" description="One trip per boat and time slot; leave the boat empty for a shore dive.">
          {formResult.status === "rejected" ? (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
              Boats and dive sites could not be loaded: {errorMessage(formResult.reason)}
            </p>
          ) : (
            formResult.value && (
              <NewTripForm
                date={newTripDate}
                boats={formResult.value[0]}
                sites={formResult.value[1]}
                tripHrefPrefix={`${scheduleHref(base)}&trip=`}
              />
            )
          )}
        </RoutedDialog>
      )}
    </main>
  );
}
