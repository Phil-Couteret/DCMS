import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/navbar";
import { Link } from "@/i18n/navigation";

const ACTIVITIES = [
  { key: "snorkeling", price: 25 },
  { key: "discoverScuba", price: 60 },
  { key: "funDive", price: 45 },
  { key: "openWater", price: 350 },
  { key: "advanced", price: 280 },
  { key: "rescue", price: 320 },
] as const;

const EQUIPMENT = [
  { key: "wetsuit", price: 8 },
  { key: "bcd", price: 10 },
  { key: "regulator", price: 10 },
  { key: "maskFins", price: 5 },
  { key: "computer", price: 12 },
] as const;

// Every item above hired separately comes to 45; the package costs 35.
const FULL_PACKAGE = { price: 35, save: 10 };

// Fun dives at 45 each: 5 cost 225 and 10 cost 450.
const PACKAGES = [
  { key: "fiveDives", dives: 5, price: 200, save: 25 },
  { key: "tenDives", dives: 10, price: 380, save: 70 },
] as const;

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const format = await getFormatter();
  const eur = (amount: number) =>
    format.number(amount, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const sectionTitle = "text-2xl font-bold tracking-tight text-slate-900";

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar className="bg-blue-950" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("title")}
        </h1>

        <section aria-labelledby="activities" className="mt-12">
          <h2 id="activities" className={sectionTitle}>
            {t("activities")}
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ACTIVITIES.map((a) => (
              <li
                key={a.key}
                className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <h3 className="text-lg font-semibold text-slate-900">{t(`items.${a.key}`)}</h3>
                <p className="mt-2 text-3xl font-bold text-blue-900">{eur(a.price)}</p>
                <Link
                  href="/booking"
                  className="mt-6 inline-flex items-center justify-center self-start rounded-full bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  {t("bookNow")}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="equipment" className="mt-16">
          <h2 id="equipment" className={sectionTitle}>
            {t("equipment")}
          </h2>
          <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 md:max-w-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">{t("item")}</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">{t("price")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {EQUIPMENT.map((e) => (
                  <tr key={e.key}>
                    <th scope="row" className="px-4 py-3 font-normal text-slate-900">
                      {t(`items.${e.key}`)}
                    </th>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{eur(e.price)}</td>
                  </tr>
                ))}
                <tr className="bg-sky-50">
                  <th scope="row" className="px-4 py-3 font-normal text-slate-900">
                    <span className="font-semibold">{t("items.fullPackage")}</span>
                    <span className="block text-xs text-slate-600">{t("items.fullPackageNote")}</span>
                  </th>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-900">{eur(FULL_PACKAGE.price)}</span>
                    <span className="block text-xs font-medium text-emerald-700">
                      {t("save", { amount: eur(FULL_PACKAGE.save) })}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="packages" className="mt-16">
          <h2 id="packages" className={sectionTitle}>
            {t("packages")}
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:max-w-3xl">
            {PACKAGES.map((p) => (
              <li
                key={p.key}
                className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{t(`items.${p.key}`)}</h3>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    {t("save", { amount: eur(p.save) })}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-bold text-blue-900">{eur(p.price)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {t("perDive", { amount: eur(p.price / p.dives) })}
                </p>
                <Link
                  href="/booking"
                  className="mt-6 inline-flex items-center justify-center self-start rounded-full bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  {t("bookNow")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
