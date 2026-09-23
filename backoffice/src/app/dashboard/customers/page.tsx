import Link from "next/link";
import { CustomersTable } from "@/components/customers/customers-table";
import { Button } from "@/components/ui/button";
import { getCustomers, type Customer } from "@/lib/api";
import { countryLabel, LANGUAGES } from "@/lib/customers";

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
  const country = one(params.country) || undefined;
  const language = LANGUAGES.find((l) => l.code === one(params.language))?.code;
  const filtered = Boolean(country || language);

  // Country and language filter on the API. The country list comes from the
  // unfiltered set, so choosing one country does not empty the selector.
  const [result, all] = await Promise.allSettled([
    getCustomers({ country, language }),
    filtered ? getCustomers() : Promise.resolve(null),
  ]);
  const everyone: Customer[] =
    all.status === "fulfilled" && all.value
      ? all.value
      : result.status === "fulfilled"
        ? result.value
        : [];
  const countries = [...new Set(everyone.map((c) => c.country))].sort();

  return (
    <main className="space-y-6 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Customers</h1>

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,16rem))_auto]">
        <label className="block text-sm font-medium text-zinc-700">
          Country
          <select name="country" defaultValue={country ?? ""} className={control}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Language
          <select name="language" defaultValue={language ?? ""} className={control}>
            <option value="">All languages</option>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} ({l.code})
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Filter</Button>
          {filtered && (
            <Link href="/dashboard/customers" prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              Clear
            </Link>
          )}
        </div>
      </form>

      {result.status === "rejected" ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          Customers could not be loaded: {String((result.reason as Error).message)}
        </p>
      ) : (
        <CustomersTable customers={result.value} filtered={filtered} />
      )}
    </main>
  );
}
