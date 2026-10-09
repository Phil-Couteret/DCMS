import { format } from "date-fns";
import Link from "next/link";
import { auth } from "@/auth";
import { ActivityBars, RevenueTrend } from "@/components/dashboard/charts";
import { CheckInButton } from "@/components/dashboard/check-in-button";
import { StatusBadge as BookingStatusBadge } from "@/components/bookings/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBoats, getDashboardOverview, getStaff, getTodayBookings, type Booking, type DashboardOverview } from "@/lib/api";
import { money } from "@/lib/billing";
import { SLOT_LABELS } from "@/lib/bookings";
import { centerNow, greeting, pendingAlert, SLOT_START, type SlotKey, zoneLabel } from "@/lib/center-time";
import { centerLocale } from "@/lib/center";

export const dynamic = "force-dynamic";

const ACTIVITY_LABELS: Record<string, string> = {
  SNORKELING: "Snorkeling",
  DISCOVER_SCUBA: "Discover Scuba",
  FUN_DIVE: "Fun Dive",
  OW_CERT: "Open Water Course",
  AOW_CERT: "Advanced Course",
  RESCUE_CERT: "Rescue Course",
  DM_CERT: "Divemaster Course",
};

const SLOTS: { key: SlotKey; label: string }[] = [
  { key: "MORNING", label: "Morning · 08:00" },
  { key: "AFTERNOON", label: "Afternoon · 14:00" },
];

// Cancelled bookings and no-shows are not trips: they are left out of every
// figure and list on this page.
const INACTIVE = new Set(["CANCELLED", "NO_SHOW"]);

function slotTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const { timeZone } = await centerLocale();
  const now = centerNow(timeZone);
  const isAdmin = (await auth())?.user.role === "ADMIN";
  const [bookingsResult, boatsResult, staffResult, overviewResult] = await Promise.allSettled([
    getTodayBookings(),
    getBoats(),
    getStaff(),
    getDashboardOverview(),
  ]);
  const overview: DashboardOverview | null = overviewResult.status === "fulfilled" ? overviewResult.value : null;

  const bookings =
    bookingsResult.status === "fulfilled"
      ? bookingsResult.value.filter((b) => !INACTIVE.has(b.status))
      : null;
  const boatNames = new Map(
    boatsResult.status === "fulfilled" ? boatsResult.value.map((b) => [b.id, b.name]) : [],
  );
  const staffOnDuty =
    staffResult.status === "fulfilled"
      ? staffResult.value.filter((s) => s.status === "ACTIVE").length
      : null;

  const metrics = [
    { label: "Today's bookings", value: bookings?.length },
    { label: "Boats out today", value: bookings ? new Set(bookings.map((b) => b.boatId)).size : undefined },
    { label: "Check-ins pending", value: bookings?.filter((b) => b.status === "PENDING").length },
    { label: "Staff on duty", value: staffOnDuty ?? undefined },
  ];

  const alerts = (bookings ?? [])
    .map((b) => ({ booking: b, untilStart: pendingAlert(b.status, b.timeSlot, now.minutes) }))
    .filter((a): a is { booking: Booking; untilStart: number } => a.untilStart !== null)
    .sort((a, b) => a.untilStart - b.untilStart);

  const boatName = (b: Booking) => b.boat?.name ?? boatNames.get(b.boatId) ?? "Unknown boat";

  return (
    <main className="space-y-8 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900">{greeting(now.minutes)}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {format(new Date(now.year, now.month - 1, now.day), "EEEE d MMMM yyyy")} · {zoneLabel(timeZone)} time
        </p>
      </header>

      {bookingsResult.status === "rejected" && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          Today&apos;s bookings could not be loaded: {String((bookingsResult.reason as Error).message)}
        </p>
      )}

      <section aria-label="Today at a glance" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader>
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{m.value ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section aria-labelledby="alerts">
        <h2 id="alerts" className="text-lg font-semibold text-zinc-900">Alerts</h2>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nothing needs attention.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {alerts.map(({ booking: b, untilStart }) => (
              <li
                key={b.id}
                className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
              >
                <span className="font-medium">
                  {b.customer.firstName} {b.customer.lastName}
                </span>{" "}
                is still pending for the {slotTime(SLOT_START[b.timeSlot])} {ACTIVITY_LABELS[b.activityType] ?? b.activityType}
                {" on "}
                {boatName(b)} —{" "}
                {untilStart > 0
                  ? `starts in ${untilStart} min`
                  : untilStart === 0
                    ? "starting now"
                    : `started ${-untilStart} min ago`}
                .
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="trips">
        <h2 id="trips" className="text-lg font-semibold text-zinc-900">Today&apos;s trips</h2>
        <div className="mt-3 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {SLOTS.map((slot) => {
            const list = (bookings ?? []).filter((b) => b.timeSlot === slot.key);
            return (
              <Card key={slot.key}>
                <CardHeader>
                  <CardTitle>{slot.label}</CardTitle>
                  <CardDescription>
                    {list.length} booking{list.length === 1 ? "" : "s"} ·{" "}
                    {list.reduce((n, b) => n + b.participantCount, 0)} participants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {list.length === 0 ? (
                    <p className="text-sm text-zinc-500">No bookings.</p>
                  ) : (
                    <ul className="divide-y divide-zinc-100">
                      {list.map((b) => (
                        <li key={b.id} className="flex items-start justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900">
                              {ACTIVITY_LABELS[b.activityType] ?? b.activityType}
                            </p>
                            <p className="text-sm text-zinc-600">
                              {b.customer.firstName} {b.customer.lastName} · {b.participantCount}{" "}
                              {b.participantCount === 1 ? "diver" : "divers"} · {boatName(b)}
                            </p>
                          </div>
                          {b.status === "PENDING" ? (
                            <CheckInButton bookingId={b.id} />
                          ) : (
                            <Badge variant="secondary">
                              {b.status === "CONFIRMED" ? "Checked in" : b.status.toLowerCase()}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
      {overviewResult.status === "rejected" && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          The figures below could not be loaded: {String((overviewResult.reason as Error).message)}
        </p>
      )}

      {overview?.revenue && isAdmin && (
        <section aria-labelledby="revenue" className="space-y-3">
          <h2 id="revenue" className="text-lg font-semibold text-zinc-900">Revenue</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
            <Card>
              <CardHeader>
                <CardDescription>Revenue this month</CardDescription>
                <CardTitle className="text-4xl font-semibold">{money(overview.revenue.month, overview.currency)}</CardTitle>
                <p className="text-xs text-zinc-500">
                  Payments received since {format(new Date(`${overview.revenue.monthStart}T00:00:00`), "d MMMM")}, less refunds.
                </p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Last 30 days</CardTitle>
                <CardDescription>Revenue per day: payments received, less refunds.</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueTrend
                  points={overview.revenue.trend.map((p) => ({ date: p.date, amount: Number(p.amount) }))}
                  currency={overview.currency}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {overview && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section aria-labelledby="by-activity">
            <Card className="h-full">
              <CardHeader>
                <CardTitle id="by-activity">Bookings by activity</CardTitle>
                <CardDescription>
                  Last 30 days ({format(new Date(`${overview.bookingsPeriod.from}T00:00:00`), "d MMM")} –{" "}
                  {format(new Date(`${overview.bookingsPeriod.to}T00:00:00`), "d MMM")}), cancellations and no-shows left out.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overview.bookingsByActivity.length === 0 ? (
                  <p className="text-sm text-zinc-500">No bookings in the last 30 days.</p>
                ) : (
                  <ActivityBars
                    rows={overview.bookingsByActivity.map((r) => ({
                      label: ACTIVITY_LABELS[r.activityType] ?? r.activityType,
                      count: r.count,
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="upcoming">
            <Card className="h-full">
              <CardHeader>
                <CardTitle id="upcoming">Upcoming bookings</CardTitle>
                <CardDescription>Today and the next 6 days.</CardDescription>
              </CardHeader>
              <CardContent>
                {overview.upcoming.length === 0 ? (
                  <p className="text-sm text-zinc-500">No bookings in the next 7 days.</p>
                ) : (
                  <div className="space-y-4">
                    {[...new Set(overview.upcoming.map((b) => b.date))].map((day) => (
                      <div key={day}>
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {day === overview.today ? "Today" : format(new Date(`${day}T00:00:00`), "EEEE d MMMM")}
                        </h3>
                        <ul className="mt-1 divide-y divide-zinc-100">
                          {overview.upcoming
                            .filter((b) => b.date === day)
                            .map((b) => (
                              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                                <span className="min-w-0">
                                  <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="font-medium text-zinc-900 hover:underline">
                                    {b.customer.firstName} {b.customer.lastName}
                                  </Link>
                                  <span className="block text-xs text-zinc-500">
                                    {SLOT_LABELS[b.timeSlot] ?? b.timeSlot} · {ACTIVITY_LABELS[b.activityType] ?? b.activityType}
                                    {b.numberOfDives > 1 ? ` · ${b.numberOfDives} dives` : ""} · {b.boat.name}
                                    {b.participantCount > 1 ? ` · ${b.participantCount} divers` : ""}
                                  </span>
                                </span>
                                <BookingStatusBadge status={b.status} />
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </main>
  );
}
