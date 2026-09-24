import Link from "next/link";
import { InvoicesTable } from "@/components/billing/invoices-table";
import { Button } from "@/components/ui/button";
import { getInvoices } from "@/lib/api";
import { INVOICE_STATUS_LABELS, INVOICE_STATUSES } from "@/lib/billing";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const requested = one((await searchParams).status);
  const status = INVOICE_STATUSES.find((s) => s === requested);

  let invoices;
  let loadError: string | null = null;
  try {
    invoices = await getInvoices({ status });
  } catch (e) {
    loadError = (e as Error).message;
  }

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Billing</h1>
        <Button nativeButton={false} render={<Link href="/dashboard/billing/new" prefetch={false} />}>
          New Invoice
        </Button>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200">
        <label className="block text-sm font-medium text-zinc-700">
          Status
          <select
            name="status"
            defaultValue={status ?? ""}
            className="mt-1 block w-56 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          >
            <option value="">All</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INVOICE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Filter</Button>
        {status && (
          <Link href="/dashboard/billing" prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
            Clear
          </Link>
        )}
      </form>

      {loadError || !invoices ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          Invoices could not be loaded: {loadError}
        </p>
      ) : (
        <InvoicesTable invoices={invoices} filtered={Boolean(status)} />
      )}
    </main>
  );
}
