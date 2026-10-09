import Link from "next/link";
import { BookingForm } from "@/components/bookings/booking-form";
import { getBoats, getCustomers, getDiveSites, getPartners } from "@/lib/api";
import { centerNow } from "@/lib/center-time";
import { customerOption } from "@/lib/customers";
import { centerLocale } from "@/lib/center";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { timeZone } = await centerLocale();
  const params = await searchParams;
  const t = await getT();
  // ?customer=<id> preselects the customer, e.g. from their profile.
  const customer = typeof params.customer === "string" && UUID.test(params.customer) ? params.customer : "";

  const [customers, boats, sites, partners] = await Promise.all([getCustomers(), getBoats(), getDiveSites(), getPartners()]);
  const activeBoats = boats.filter((b) => b.status === "active");

  return (
    <main className="max-w-4xl space-y-6 p-6 md:p-8">
      <Link href="/dashboard/bookings" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← {t("All bookings")}
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">{t("New booking")}</h1>
      {activeBoats.length === 0 ? (
        <p role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          {t("Bookings need a boat, and there is no active boat.")}{" "}
          <Link href="/dashboard/settings?tab=boats" prefetch={false} className="font-medium underline">
            {t("Add one in Settings")}
          </Link>
          .
        </p>
      ) : (
        <BookingForm
          initial={{
            customerId: customers.some((c) => c.id === customer) ? customer : "",
            activityType: "FUN_DIVE",
            date: centerNow(timeZone).isoDate,
            timeSlot: "MORNING",
            boatId: activeBoats.length === 1 ? activeBoats[0].id : "",
            siteId: "",
            participantCount: 1,
            numberOfDives: 1,
            bonoCode: "",
            bonoLocked: false,
            addOns: [],
            bookingSource: "WALK_IN",
            partnerId: "",
            status: "CONFIRMED",
            equipment: [],
            notes: "",
          }}
          customers={customers.map(customerOption)}
          boats={activeBoats}
          sites={sites}
          partners={partners.filter((p) => p.isActive)}
          cancelHref="/dashboard/bookings"
        />
      )}
    </main>
  );
}
