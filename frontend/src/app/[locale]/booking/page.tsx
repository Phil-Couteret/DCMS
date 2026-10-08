import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Navbar } from "@/components/navbar";
import { getPrices } from "@/lib/api";
import type { Prices } from "@/lib/booking-catalog";

// Prices are read on every request, so a change in the backoffice shows at once.
export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");

  let prices: Prices | null = null;
  try {
    prices = await getPrices(locale);
  } catch (e) {
    console.error("[booking] could not load prices:", e);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar className="bg-blue-950" />
      {prices ? (
        <BookingFlow prices={prices} />
      ) : (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
            {t("unavailable")}
          </p>
        </div>
      )}
    </main>
  );
}
