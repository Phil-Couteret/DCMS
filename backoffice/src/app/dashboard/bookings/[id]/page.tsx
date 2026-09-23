import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusActions } from "@/components/bookings/status-actions";
import { StatusBadge } from "@/components/bookings/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getBooking } from "@/lib/api";
import { ACTIVITY_LABELS, formatBookingDate, parseGuestNotes, SLOT_LABELS } from "@/lib/bookings";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EQUIPMENT_LABELS: Record<string, string> = {
  wetsuit: "Wetsuit",
  bcd: "BCD",
  regulator: "Regulator",
  maskFins: "Mask + Fins",
  computer: "Dive Computer",
};

const CERT_LABELS: Record<string, string> = {
  none: "None",
  openWater: "Open Water",
  advanced: "Advanced",
  rescue: "Rescue",
  divemaster: "Divemaster",
  instructor: "Instructor",
};

// "wetsuit:M" -> "Wetsuit (M)", "regulator" -> "Regulator".
function equipmentLabel(item: string) {
  const [key, size] = item.split(":");
  const name = EQUIPMENT_LABELS[key] ?? key;
  return size ? `${name} (${size})` : name;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let booking;
  try {
    booking = await getBooking(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const guest = parseGuestNotes(booking.notes);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/bookings" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All bookings
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {ACTIVITY_LABELS[booking.activityType] ?? booking.activityType}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatBookingDate(booking.date, "long")} · {SLOT_LABELS[booking.timeSlot] ?? booking.timeSlot}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <StatusBadge status={booking.status} />
          <StatusActions bookingId={booking.id} status={booking.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100">
              <Row label="Reference">
                <span className="break-all font-mono text-xs">{booking.id}</span>
              </Row>
              <Row label="Customer">
                {booking.customer.firstName} {booking.customer.lastName}
              </Row>
              <Row label="Participants">{booking.participantCount}</Row>
              <Row label="Boat">{booking.boat ? `${booking.boat.name} (capacity ${booking.boat.capacity})` : "—"}</Row>
              <Row label="Dive site">{booking.site?.nameEn ?? "Not assigned"}</Row>
              <Row label="Source">{booking.bookingSource.replace("_", " ").toLowerCase()}</Row>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {guest ? (
              <dl className="divide-y divide-zinc-100">
                <Row label="Certification">
                  {guest.certificationLevel ? CERT_LABELS[guest.certificationLevel] ?? guest.certificationLevel : "Not given"}
                </Row>
                <Row label="Equipment">
                  {guest.selectedEquipment.length > 0 ? (
                    <ul className="space-y-0.5">
                      {guest.selectedEquipment.map((item) => (
                        <li key={item}>{equipmentLabel(item)}</li>
                      ))}
                    </ul>
                  ) : (
                    "None"
                  )}
                </Row>
                <Row label="Quoted total">
                  {guest.totalPrice !== null
                    ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" }).format(guest.totalPrice)
                    : "—"}
                </Row>
              </dl>
            ) : booking.notes ? (
              <p className="whitespace-pre-wrap text-sm text-zinc-900">{booking.notes}</p>
            ) : (
              <p className="text-sm text-zinc-500">No notes.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
