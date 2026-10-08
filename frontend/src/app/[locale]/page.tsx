import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/navbar";
import { Link } from "@/i18n/navigation";
import { getCenter } from "@/lib/server-api";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const center = await getCenter().catch(() => null);

  return (
    <main className="min-h-screen bg-brand-dark">
      <section className="relative isolate flex min-h-[85vh] w-full flex-col overflow-hidden bg-gradient-to-b from-accent via-brand-light to-brand-dark">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/45" />

        <Navbar />

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {center?.name || t("hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85 sm:text-xl">
            {center?.name ? t("hero.title") : null}
          </p>
          <Link
            href="/booking"
            className="mt-10 rounded-full bg-white px-8 py-3 text-base font-semibold text-brand shadow-lg transition hover:bg-sky-100"
          >
            {t("nav.booking")}
          </Link>
        </div>
      </section>
    </main>
  );
}
