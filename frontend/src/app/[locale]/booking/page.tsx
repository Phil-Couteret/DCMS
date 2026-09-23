import { setRequestLocale } from "next-intl/server";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Navbar } from "@/components/navbar";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar className="bg-blue-950" />
      <BookingFlow />
    </main>
  );
}
