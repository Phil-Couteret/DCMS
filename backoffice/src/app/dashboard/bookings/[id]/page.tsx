import { auth } from "@/auth";
import { ADD_ON_LABELS } from "@/lib/add-ons";
import { shoreSession } from "@/lib/trips";
import { centerLocale } from "@/lib/center";
import { money } from "@/lib/billing";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusActions } from "@/components/bookings/status-actions";
import { StatusBadge } from "@/components/bookings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getBooking } from "@/lib/api";
import { ACTIVITY_LABELS, equipmentLabel, formatBookingDate, parseGuestNotes, SLOT_LABELS, SOURCE_LABELS } from "@/lib/bookings";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CERT_LABELS: Record<string, string> = {
  none: "None",
  openWater: "Open Water",
  advanced: "Advanced",
  rescue: "Rescue",
  divemaster: "Divemaster",
  instructor: "Instructor",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { currency } = await centerLocale();
  const t = await getT();
  // Partner pages are for admins.
  const isAdmin = (await auth())?.user?.role === "ADMIN";
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
        ← {t("All bookings")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {ACTIVITY_LABELS[booking.activityType] ? t(ACTIVITY_LABELS[booking.activityType]) : booking.activityType}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatBookingDate(booking.date, "long")} · {SLOT_LABELS[booking.timeSlot] ? t(SLOT_LABELS[booking.timeSlot]) : booking.timeSlot}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <StatusBadge status={booking.status} />
          <StatusActions bookingId={booking.id} status={booking.status} />
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/dashboard/bookings/${booking.id}/edit`} prefetch={false} />}
          >
            {t("Edit")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Booking")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100">
              <Row label={t("Reference")}>
                <span className="break-all font-mono text-xs">{booking.id}</span>
              </Row>
              <Row label={t("Customer")}>
                {booking.customer.firstName} {booking.customer.lastName}
              </Row>
              <Row label={t("Participants")}>{booking.participantCount}</Row>
              <Row label={t("Dives")}>{booking.numberOfDives}</Row>
              {booking.addOns.length > 0 && <Row label={t("Add-ons")}>{booking.addOns.map((a) => t(ADD_ON_LABELS[a])).join(", ")}</Row>}
              {booking.bono && (
                <Row label={t("Government bono")}>
                  {booking.bono.code} ·{" "}
                  {t("{discount} off the activity", {
                    discount:
                      booking.bono.type === "PERCENTAGE"
                        ? `${Number(booking.bono.discountValue)}%`
                        : money(booking.bono.discountValue, currency),
                  })}
                  <span className="block text-xs text-zinc-500">
                    {booking.bonoUsed ? t("Applied on the invoice") : t("Applied when the booking is invoiced")} · {booking.bono.description}
                  </span>
                </Row>
              )}
              <Row label={t("Boat")}>
                {booking.boat
                  ? t("{name} (capacity {capacity})", { name: booking.boat.name, capacity: booking.boat.capacity })
                  : t("Shore session {session}", { session: booking.shoreTime ? shoreSession(booking.shoreTime) : "" })}
              </Row>
              <Row label={t("Dive site")}>{booking.site?.nameEn ?? t("Not assigned")}</Row>
              <Row label={t("Source")}>
                {SOURCE_LABELS[booking.bookingSource]
                  ? t(SOURCE_LABELS[booking.bookingSource])
                  : booking.bookingSource.replace("_", " ").toLowerCase()}
                {booking.partner && (
                  <>
                    {" · "}
                    {isAdmin ? (
                      <Link href={`/dashboard/partners/${booking.partner.id}`} prefetch={false} className="hover:underline">
                        {booking.partner.name}
                      </Link>
                    ) : (
                      booking.partner.name
                    )}
                  </>
                )}
              </Row>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            {guest ? (
              <dl className="divide-y divide-zinc-100">
                <Row label={t("Certification")}>
                  {guest.certificationLevel
                    ? CERT_LABELS[guest.certificationLevel]
                      ? t(CERT_LABELS[guest.certificationLevel])
                      : guest.certificationLevel
                    : t("Not given")}
                </Row>
                <Row label={t("Equipment")}>
                  {guest.selectedEquipment.length > 0 ? (
                    <ul className="space-y-0.5">
                      {guest.selectedEquipment.map((item) => (
                        <li key={item}>{equipmentLabel(item, t)}</li>
                      ))}
                    </ul>
                  ) : (
                    t("None")
                  )}
                </Row>
                <Row label={t("Quoted total")}>
                  {guest.totalPrice !== null
                    ? money(guest.totalPrice, currency)
                    : "—"}
                </Row>
                {guest.staffNotes && (
                  <Row label={t("Staff notes")}>
                    <span className="whitespace-pre-wrap">{guest.staffNotes}</span>
                  </Row>
                )}
              </dl>
            ) : booking.notes ? (
              <p className="whitespace-pre-wrap text-sm text-zinc-900">{booking.notes}</p>
            ) : (
              <p className="text-sm text-zinc-500">{t("No notes.")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
