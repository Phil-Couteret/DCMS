import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const NAV_ITEMS = [
  { key: "home", href: "/" },
  { key: "sites", href: "/sites" },
  { key: "booking", href: "/booking" },
  { key: "pricing", href: "/pricing" },
] as const;

// White text: render over a dark background. The homepage places it over the
// hero; other pages pass a background through className.
export async function Navbar({ className = "" }: { className?: string }) {
  const locale = await getLocale();
  const t = await getTranslations("nav");

  const navLinks = NAV_ITEMS.map((item) => (
    <Link
      key={item.key}
      href={item.href}
      className="text-sm font-medium text-white/85 transition-colors hover:text-white"
    >
      {t(item.key)}
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
    <header className={`w-full ${className}`}>
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
  );
}
