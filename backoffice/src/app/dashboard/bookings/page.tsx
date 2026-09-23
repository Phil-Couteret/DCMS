import Link from "next/link";
import { BookingRow } from "@/components/bookings/booking-row";
import { StatusActions } from "@/components/bookings/status-actions";
import { StatusBadge } from "@/components/bookings/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBoats, getBookings, type Booking } from "@/lib/api";
import { ACTIVITY_LABELS, formatBookingDate, SLOT_LABELS, STATUS_LABELS, STATUSES } from "@/lib/bookings";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Invalid values are dropped rather than sent: the API would reject them.
  const date = ISO_DATE.test(one(params.date) ?? "") ? one(params.date) : undefined;
  const status = STATUSES.find((s) => s === one(params.status));
  const boatId = UUID.test(one(params.boatId) ?? "") ? one(params.boatId) : undefined;
  const filtered = Boolean(date || status || boatId);

  const [bookingsResult, boatsResult] = await Promise.allSettled([
    getBookings({ date, status, boatId }),
    getBoats(),
  ]);
  const boats = boatsResult.status === "fulfilled" ? boatsResult.value : [];

  return (
    <main className="space-y-6 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Bookings</h1>

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        <label className="block text-sm font-medium text-zinc-700">
          Date
          <input type="date" name="date" defaultValue={date ?? ""} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Status
          <select name="status" defaultValue={status ?? ""} className={control}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Boat
          <select name="boatId" defaultValue={boatId ?? ""} className={control}>
            <option value="">All boats</option>
            {boats.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Filter</Button>
          {filtered && (
            <Link href="/dashboard/bookings" prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              Clear
            </Link>
          )}
        </div>
      </form>

      {bookingsResult.status === "rejected" ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          Bookings could not be loaded: {String((bookingsResult.reason as Error).message)}
        </p>
      ) : bookingsResult.value.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">No bookings found</p>
          <p className="mt-1 text-sm text-zinc-500">
            {filtered ? "No booking matches these filters." : "There are no bookings yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Participants</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsResult.value.map((b: Booking) => (
                <BookingRow key={b.id} href={`/dashboard/bookings/${b.id}`}>
                  <TableCell className="font-medium">
                    {/* The link keeps the detail page reachable by keyboard. */}
                    <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="hover:underline">
                      {formatBookingDate(b.date)}
                    </Link>
                  </TableCell>
                  <TableCell>{SLOT_LABELS[b.timeSlot] ?? b.timeSlot}</TableCell>
                  <TableCell>{ACTIVITY_LABELS[b.activityType] ?? b.activityType}</TableCell>
                  <TableCell className="text-right tabular-nums">{b.participantCount}</TableCell>
                  <TableCell>
                    {b.customer.firstName} {b.customer.lastName}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusActions bookingId={b.id} status={b.status} />
                  </TableCell>
                </BookingRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
