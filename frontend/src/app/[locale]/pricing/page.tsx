import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/navbar";
import { Link } from "@/i18n/navigation";
import { getPrices } from "@/lib/server-api";
import { activityPrice, EQUIPMENT, pricedActivities, type Prices } from "@/lib/booking-catalog";

// Prices are read on every request, so a change in the backoffice shows at once.
export const dynamic = "force-dynamic";

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const format = await getFormatter();

  const sectionTitle = "text-2xl font-bold tracking-tight text-slate-900";

  let prices: Prices | null = null;
  try {
    prices = await getPrices(locale);
  } catch (e) {
    console.error("[pricing] could not load prices:", e);
  }
  if (!prices) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar className="bg-brand-dark" />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{t("title")}</h1>
          <p role="alert" className="mt-10 rounded-lg bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
            {t("unavailable")}
          </p>
        </div>
      </main>
    );
  }
  // In the center's currency, cents only when there are any: €45, €47.50.
  const { currency } = prices;
  const money = (amount: number) =>
    format.number(amount, { style: "currency", currency, minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 });


  const fullPackage = prices.equipment.fullPackage;
  const itemsTotal = EQUIPMENT.reduce((sum, e) => sum + prices.equipment[e.priceKey], 0);
  const funDive = prices.activities.funDive;
  // The center's dive packs (Settings → Pricing in the backoffice), with the
  // saving against the fun dive's single price when there is one.
  const packages = (prices.divePacks ?? []).map((p) => ({
    ...p,
    save: funDive === null ? 0 : p.diveCount * funDive - p.price,
  }));
  const addOns = prices.addOns;

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar className="bg-brand-dark" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t("title")}
        </h1>

        <section aria-labelledby="activities" className="mt-12">
          <h2 id="activities" className={sectionTitle}>
            {t("activities")}
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pricedActivities(prices).map((a) => (
              <li
                key={a.key}
                className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <h3 className="text-lg font-semibold text-slate-900">{t(`items.${a.key}`)}</h3>
                <p className="mt-2 text-3xl font-bold text-brand">{money(activityPrice(prices, a)!)}</p>
                <Link
                  href="/booking"
                  className="mt-6 inline-flex items-center justify-center self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light"
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
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{money(prices.equipment[e.priceKey])}</td>
                  </tr>
                ))}
                <tr className="bg-sky-50">
                  <th scope="row" className="px-4 py-3 font-normal text-slate-900">
                    <span className="font-semibold">{t("items.fullPackage")}</span>
                    <span className="block text-xs text-slate-600">{t("items.fullPackageNote")}</span>
                  </th>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-slate-900">{money(fullPackage)}</span>
                    {itemsTotal > fullPackage && (
                      <span className="block text-xs font-medium text-emerald-700">
                        {t("save", { amount: money(itemsTotal - fullPackage) })}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {packages.length > 0 && (
          <section aria-labelledby="packages" className="mt-16">
            <h2 id="packages" className={sectionTitle}>
              {t("packages")}
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:max-w-3xl">
              {packages.map((p) => (
                <li
                  key={p.diveCount}
                  className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{t("items.divePack", { count: p.diveCount })}</h3>
                    {p.save > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {t("save", { amount: money(p.save) })}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-3xl font-bold text-brand">{money(p.price)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("perDive", { amount: money(p.price / p.diveCount) })}
                  </p>
                  <Link
                    href="/booking"
                    className="mt-6 inline-flex items-center justify-center self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light"
                  >
                    {t("bookNow")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {addOns && (
          <section aria-labelledby="extras" className="mt-16">
            <h2 id="extras" className={sectionTitle}>
              {t("extras")}
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
                  {(
                    [
                      ["nightDive", addOns.nightDive, "perDiver"],
                      ["personalInstructor", addOns.personalInstructor, "perBooking"],
                    ] as const
                  ).map(([key, amount, unit]) => (
                    <tr key={key}>
                      <th scope="row" className="px-4 py-3 font-normal text-slate-900">
                        {t(`items.${key}`)}
                      </th>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {money(amount)} <span className="text-xs font-normal text-slate-500">{t(unit)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
