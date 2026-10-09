import Link from "next/link";
import { auth } from "@/auth";
import { CustomersTable } from "@/components/customers/customers-table";
import { ImportCustomersForm } from "@/components/customers/import-customers";
import { RoutedDialog } from "@/components/routed-panel";
import { Button } from "@/components/ui/button";
import { getCustomers, type Customer } from "@/lib/api";
import { countryName } from "@/lib/countries";
import { LANGUAGES } from "@/lib/customers";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const t = await getT();
  const isAdmin = (await auth())?.user?.role === "ADMIN";
  const country = one(params.country) || undefined;
  const language = LANGUAGES.find((l) => l.code === one(params.language))?.code;
  const filtered = Boolean(country || language);
  // ?import=1: the import dialog, over the list with its filters.
  const importing = isAdmin && one(params.import) === "1";
  const listParams = new URLSearchParams();
  if (country) listParams.set("country", country);
  if (language) listParams.set("language", language);
  const listHref = `/dashboard/customers${listParams.size > 0 ? `?${listParams}` : ""}`;
  const withImport = `/dashboard/customers?${new URLSearchParams([...listParams, ["import", "1"]])}`;

  // Language filters on the API. Country filters here, by country name:
  // the stored value may be a code ("DE") or free text ("German") for the
  // same country. The country list comes from the unfiltered set, so
  // choosing one country does not empty the selector.
  const [loaded, all] = await Promise.allSettled([
    getCustomers({ language }),
    filtered ? getCustomers() : Promise.resolve(null),
  ]);
  const result =
    loaded.status === "fulfilled" && country
      ? { ...loaded, value: loaded.value.filter((c) => countryName(c.country) === country) }
      : loaded;
  const everyone: Customer[] =
    all.status === "fulfilled" && all.value
      ? all.value
      : result.status === "fulfilled"
        ? result.value
        : [];
  const countries = [...new Set(everyone.map((c) => countryName(c.country)))].filter(Boolean).sort((a, b) => a.localeCompare(b));

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Customers")}</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" nativeButton={false} render={<Link href={withImport} prefetch={false} scroll={false} />}>
              {t("Import CSV")}
            </Button>
          )}
          <Button nativeButton={false} render={<Link href="/dashboard/customers/new" prefetch={false} />}>
            {t("New Customer")}
          </Button>
        </div>
      </div>
      {importing && (
        <RoutedDialog wide closeHref={listHref} title={t("Import customers from CSV")}>
          <ImportCustomersForm closeHref={listHref} />
        </RoutedDialog>
      )}

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,16rem))_auto]">
        <label className="block text-sm font-medium text-zinc-700">
          {t("Country")}
          <select name="country" defaultValue={country ?? ""} className={control}>
            <option value="">{t("All countries")}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Language")}
          <select name="language" defaultValue={language ?? ""} className={control}>
            <option value="">{t("All languages")}</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {t(l.label)} ({l.code})
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">{t("Filter")}</Button>
          {filtered && (
            <Link href="/dashboard/customers" prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              {t("Clear")}
            </Link>
          )}
        </div>
      </form>

      {result.status === "rejected" ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {t("Customers could not be loaded: {error}", { error: String((result.reason as Error).message) })}
        </p>
      ) : (
        <CustomersTable customers={result.value} filtered={filtered} />
      )}
    </main>
  );
}
