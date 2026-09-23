import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const NAV_ITEMS = [
  { key: "home", href: "/" },
  { key: "sites", href: "/sites" },
  { key: "booking", href: "/booking" },
  { key: "pricing", href: "/pricing" },
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const navLinks = NAV_ITEMS.map((item) => (
    <Link
      key={item.key}
      href={item.href}
      className="text-sm font-medium text-white/85 transition-colors hover:text-white"
    >
      {t(`nav.${item.key}`)}
    </Link>
  ));

  const languageSwitcher = (
    <div className="flex gap-1">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href="/"
          locale={l}
          aria-current={l === locale ? "true" : undefined}
          className={`rounded px-2 py-1 text-xs font-semibold uppercase transition-colors ${
            l === locale
              ? "bg-white text-blue-900"
              : "text-white/80 hover:bg-white/15 hover:text-white"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-blue-950">
      <section className="relative isolate flex min-h-[85vh] w-full flex-col overflow-hidden bg-gradient-to-b from-sky-500 via-blue-700 to-blue-950">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/45" />

        <header className="w-full">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="text-lg font-bold tracking-tight text-white">
              DCMS
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              {navLinks}
              {languageSwitcher}
            </div>

            <details className="group relative md:hidden">
              <summary className="cursor-pointer list-none rounded p-2 text-white hover:bg-white/15 [&::-webkit-details-marker]:hidden">
                <span className="sr-only">Menu</span>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </summary>
              <div className="absolute right-0 z-10 mt-2 flex w-56 flex-col gap-4 rounded-lg bg-blue-950/95 p-4 shadow-xl ring-1 ring-white/10">
                {navLinks}
                {languageSwitcher}
              </div>
            </details>
          </nav>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/85 sm:text-xl">
            {t("hero.subtitle")}
          </p>
          <Link
            href="/booking"
            className="mt-10 rounded-full bg-white px-8 py-3 text-base font-semibold text-blue-900 shadow-lg transition hover:bg-sky-100"
          >
            {t("nav.booking")}
          </Link>
        </div>
      </section>
    </main>
  );
}
