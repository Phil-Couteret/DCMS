import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/bookings/booking-form";
import { ApiError, getBoats, getBooking, getCustomers, getDiveSites, getPartners } from "@/lib/api";
import { parseGuestNotes } from "@/lib/bookings";
import { customerOption } from "@/lib/customers";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  if (!UUID.test(id)) notFound();

  let booking;
  try {
    booking = await getBooking(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const [customers, boats, sites, partners] = await Promise.all([getCustomers(), getBoats(), getDiveSites(), getPartners()]);
  // The booking's own boat stays selectable even if it is no longer active.
  const boatOptions = boats.filter((b) => b.status === "active" || b.id === booking.boatId);
  const guest = parseGuestNotes(booking.notes);
  const detailHref = `/dashboard/bookings/${id}`;

  return (
    <main className="max-w-4xl space-y-6 p-6 md:p-8">
      <Link href={detailHref} prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← {t("Back to booking")}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Edit booking")}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t("Status is changed from the booking page. A guest's declared certification and quoted price are kept.")}
        </p>
      </div>
      <BookingForm
        bookingId={id}
        initial={{
          customerId: booking.customerId,
          activityType: booking.activityType,
          date: booking.date.slice(0, 10),
          timeSlot: booking.timeSlot,
          place: booking.boatId ? "boat" : "shore",
          boatId: booking.boatId ?? "",
          shoreTime: booking.shoreTime ?? "",
          siteId: booking.siteId ?? "",
          participantCount: booking.participantCount,
          numberOfDives: booking.numberOfDives,
          bonoCode: booking.bono?.code ?? "",
          bonoLocked: booking.bonoUsed,
          addOns: booking.addOns,
          bookingSource: booking.bookingSource,
          partnerId: booking.partnerId ?? "",
          status: booking.status,
          equipment: guest?.selectedEquipment ?? [],
          notes: guest ? (guest.staffNotes ?? "") : (booking.notes ?? ""),
        }}
        customers={customers.map(customerOption)}
        boats={boatOptions}
        sites={sites}
        partners={partners.filter((p) => p.isActive || p.id === booking.partnerId)}
        cancelHref={detailHref}
      />
    </main>
  );
}
