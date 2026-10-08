import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/billing/invoice-badge";
import { DailyReport } from "@/components/financial/daily-report";
import { CloseDayButton, PrintButton } from "@/components/financial/forms";
import { Button } from "@/components/ui/button";
import { getClosedDays, getDailyFinancial, getFinancialInvoices, getSettings, getTaxDeclaration } from "@/lib/api";
import { money, formatDateTime, formatDay } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";
import { FINANCIAL_TABS, financialHref, monthBounds, QUARTER_LABELS, signClass, type FinancialTab } from "@/lib/financial";
import { formatDayLabel } from "@/lib/trips";
import { centerLocale } from "@/lib/center";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const control =
  "mt-1 block rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const th = "px-4 py-2 font-medium";
const td = "px-4 py-2";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isoOr(value: string | undefined, fallback: string) {
  return value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value)) ? value : fallback;
}

function LoadError({ what, reason }: { what: string; reason: unknown }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {what} could not be loaded: {reason instanceof Error ? reason.message : "unknown error"}
    </p>
  );
}

function Stat({ label, value, hint, tone = "text-zinc-900" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 print:ring-zinc-400">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

async function DailyTab({ date, today }: { date: string; today: string }) {
  const { timeZone } = await centerLocale();
  let data, settings;
  try {
    [data, settings] = await Promise.all([getDailyFinancial(date), getSettings()]);
  } catch (e) {
    return <LoadError what="The day's figures" reason={e} />;
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <form method="get" action="/dashboard/financial" className="flex items-end gap-2">
          <input type="hidden" name="tab" value="today" />
          <label className="block text-sm font-medium text-zinc-700">
            Date
            <input type="date" name="date" defaultValue={date} className={control} />
          </label>
          <Button type="submit" variant="outline">
            Show
          </Button>
          {date !== today && (
            <Link href={financialHref({ tab: "today" })} prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              Today
            </Link>
          )}
        </form>
        <div className="flex items-start gap-2">
          <PrintButton />
          {date <= today && <CloseDayButton date={date} closed={Boolean(data.closed)} />}
        </div>
      </div>

      <h2 className="hidden text-xl font-semibold print:block">Daily financial report · {formatDayLabel(date, "long")}</h2>

      {data.closed && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-200 print:hidden">
          Closed on {formatDateTime(timeZone, data.closed.closedAt)} by {data.closed.closedBy}.{" "}
          <Link href={`/dashboard/financial/closed/${date}`} prefetch={false} className="font-medium underline">
            View the stored report
          </Link>
          . Changes made since then are not in it until the day is closed again.
        </p>
      )}

      <DailyReport data={data} editable={{ taxRate: settings.taxRate }} />
    </div>
  );
}

async function ClosedDaysTab() {
  const { timeZone, currency } = await centerLocale();
  let days;
  try {
    days = await getClosedDays();
  } catch (e) {
    return <LoadError what="Closed days" reason={e} />;
  }
  if (days.length === 0) {
    return (
      <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
        <p className="font-medium text-zinc-900">No closed days yet</p>
        <p className="mt-1 text-sm text-zinc-500">A day&apos;s report is stored here when you close it on the Daily tab.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs text-zinc-500">
          <tr>
            <th className={th}>Day</th>
            <th className={th}>Closed</th>
            <th className={`${th} text-right`}>Income</th>
            <th className={`${th} text-right`}>Expenses</th>
            <th className={`${th} text-right`}>Net</th>
            <th className={th} />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {days.map((d) => {
            const day = d.date.slice(0, 10);
            return (
              <tr key={d.id}>
                <td className={`${td} font-medium`}>{formatDayLabel(day, "long")}</td>
                <td className={`${td} text-zinc-600`}>
                  {formatDateTime(timeZone, d.closedAt)} · {d.closedBy}
                </td>
                <td className={`${td} text-right`}>{money(d.totals.income, currency)}</td>
                <td className={`${td} text-right text-red-700`}>{money(d.totals.expenses, currency)}</td>
                <td className={`${td} text-right font-medium ${signClass(d.totals.net, "text-green-700")}`}>{money(d.totals.net, currency)}</td>
                <td className={`${td} text-right`}>
                  <Link href={`/dashboard/financial/closed/${day}`} prefetch={false} className="font-medium text-[#0077b6] hover:underline">
                    View report
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function BillsTab({ from, to }: { from: string; to: string }) {
  const { timeZone, currency } = await centerLocale();
  const form = (
    <form method="get" action="/dashboard/financial" className="flex flex-wrap items-end gap-2 print:hidden">
      <input type="hidden" name="tab" value="bills" />
      <label className="block text-sm font-medium text-zinc-700">
        From
        <input type="date" name="from" defaultValue={from} className={control} />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        To
        <input type="date" name="to" defaultValue={to} className={control} />
      </label>
      <Button type="submit" variant="outline">
        Show
      </Button>
    </form>
  );
  let data;
  try {
    data = await getFinancialInvoices(from, to);
  } catch (e) {
    return (
      <div className="space-y-4">
        {form}
        <LoadError what="Invoices" reason={e} />
      </div>
    );
  }
  const { totals } = data;
  return (
    <div className="space-y-6">
      {form}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Invoices" value={String(totals.count)} hint="Issued, not cancelled" />
        <Stat label="Net amount" value={money(totals.subtotal, currency)} />
        <Stat label="Tax" value={money(totals.tax, currency)} />
        <Stat label="Total" value={money(totals.total, currency)} hint={Number(totals.discount) > 0 ? `After ${money(totals.discount, currency)} discounts` : undefined} />
      </div>
      {data.invoices.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">No invoices in this period</p>
          <p className="mt-1 text-sm text-zinc-500">Draft and cancelled invoices are not listed.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className={th}>Invoice</th>
                <th className={th}>Created</th>
                <th className={th}>Customer</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Net</th>
                <th className={`${th} text-right`}>Tax</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.invoices.map((i) => (
                <tr key={i.id}>
                  <td className={td}>
                    <Link href={`/dashboard/billing/${i.id}`} prefetch={false} className="font-medium text-[#0077b6] hover:underline">
                      {i.invoiceNumber}
                    </Link>
                  </td>
                  <td className={td}>{formatDateTime(timeZone, i.createdAt)}</td>
                  <td className={td}>
                    {i.customer.firstName} {i.customer.lastName}
                  </td>
                  <td className={td}>
                    <InvoiceStatusBadge status={i.status} />
                  </td>
                  <td className={`${td} text-right`}>{money(i.subtotal, currency)}</td>
                  <td className={`${td} text-right`}>{money(i.tax, currency)}</td>
                  <td className={`${td} text-right font-medium`}>{money(i.total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function TaxTab({ year, quarter }: { year: number; quarter: number }) {
  const { currency } = await centerLocale();
  const form = (
    <form method="get" action="/dashboard/financial" className="flex flex-wrap items-end gap-2 print:hidden">
      <input type="hidden" name="tab" value="tax" />
      <label className="block text-sm font-medium text-zinc-700">
        Quarter
        <select name="quarter" defaultValue={quarter} className={control}>
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              {QUARTER_LABELS[q]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Year
        <input type="number" name="year" min={2000} max={2100} defaultValue={year} className={`${control} w-28`} />
      </label>
      <Button type="submit" variant="outline">
        Show
      </Button>
    </form>
  );
  let d;
  try {
    d = await getTaxDeclaration(year, quarter);
  } catch (e) {
    return (
      <div className="space-y-4">
        {form}
        <LoadError what="The declaration" reason={e} />
      </div>
    );
  }
  const toPay = Number(d.net) >= 0;
  const rate = `${Number(d.taxRate)}%`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {form}
        <PrintButton label="Print declaration" />
      </div>
      <div className="hidden print:block">
        <h2 className="text-xl font-semibold">
          {d.taxName} quarterly declaration · {QUARTER_LABELS[d.quarter]} {d.year}
        </h2>
      </div>
      <p className="text-sm text-zinc-600">
        Period {formatDay(d.from)} – {formatDay(d.to)}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales base (base imponible)" value={money(d.sales.base, currency)} hint={`${d.sales.count} invoice${d.sales.count === 1 ? "" : "s"}`} />
        <Stat label={`${d.taxName} collected (cuota devengada)`} value={money(d.sales.tax, currency)} tone="text-green-700" />
        <Stat label="Purchases base (base imponible)" value={money(d.purchases.base, currency)} hint={`${d.purchases.count} expense${d.purchases.count === 1 ? "" : "s"}`} />
        <Stat label={`${d.taxName} paid (cuota soportada)`} value={money(d.purchases.tax, currency)} tone="text-amber-700" />
      </div>
      <div className={`rounded-xl p-6 text-center ring-1 ${toPay ? "bg-green-50 ring-green-200" : "bg-blue-50 ring-blue-200"}`}>
        <p className="text-sm font-medium text-zinc-700">
          Net {d.taxName} {toPay ? "to pay" : "to offset"}
        </p>
        <p className="text-xs text-zinc-500">{toPay ? "Resultado a ingresar" : "Resultado a compensar"}</p>
        <p className="mt-2 text-4xl font-semibold text-zinc-900">{money(Math.abs(Number(d.net)), currency)}</p>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200 print:ring-zinc-400">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs text-zinc-500">
            <tr>
              <th className={th}>Concept</th>
              <th className={`${th} text-right`}>Base imponible</th>
              <th className={`${th} text-right`}>
                {d.taxName} ({rate})
              </th>
              <th className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <tr>
              <td className={td}>Sales (ventas)</td>
              <td className={`${td} text-right`}>{money(d.sales.base, currency)}</td>
              <td className={`${td} text-right`}>{money(d.sales.tax, currency)}</td>
              <td className={`${td} text-right`}>{money(Number(d.sales.base) + Number(d.sales.tax), currency)}</td>
            </tr>
            <tr>
              <td className={td}>Purchases (compras)</td>
              <td className={`${td} text-right`}>{money(d.purchases.base, currency)}</td>
              <td className={`${td} text-right`}>{money(d.purchases.tax, currency)}</td>
              <td className={`${td} text-right`}>{money(d.purchases.total, currency)}</td>
            </tr>
            <tr className="font-semibold">
              <td className={td}>Net result</td>
              <td className={`${td} text-right`}>—</td>
              <td className={`${td} text-right ${signClass(d.net)}`}>{money(d.net, currency)}</td>
              <td className={`${td} text-right`}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-1 text-xs text-zinc-500">
        <p>
          Sales are issued invoices (not draft or cancelled) by the date they were created. Purchases are the expenses
          recorded on the Daily tab. Other income carries no {d.taxName} figure and is not included.
        </p>
        {Number(d.sales.discount) > 0 && (
          <p>Invoice discounts in this quarter: {money(d.sales.discount, currency)}. The tax above is as charged on the invoices.</p>
        )}
        <p>This is a summary. Check every amount before filing with the tax office.</p>
      </div>
    </div>
  );
}

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { timeZone } = await centerLocale();
  const params = await searchParams;
  const now = centerNow(timeZone);
  const today = now.isoDate;
  const tab: FinancialTab = FINANCIAL_TABS.find((t) => t.key === one(params.tab))?.key ?? "today";
  const date = isoOr(one(params.date), today);
  const month = monthBounds(today);
  const from = isoOr(one(params.from), month.from);
  const to = isoOr(one(params.to), month.to);
  const rawYear = Number(one(params.year));
  const year = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : now.year;
  const rawQuarter = Number(one(params.quarter));
  const quarter = [1, 2, 3, 4].includes(rawQuarter) ? rawQuarter : Math.floor((now.month - 1) / 3) + 1;

  return (
    <main className="space-y-6 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-zinc-900 print:hidden">Financial</h1>
      <nav aria-label="Financial sections" className="flex gap-1 overflow-x-auto border-b border-zinc-200 print:hidden">
        {FINANCIAL_TABS.map((t) => (
          <Link
            key={t.key}
            href={financialHref({ tab: t.key })}
            prefetch={false}
            aria-current={t.key === tab ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              t.key === tab ? "border-[#0096c7] text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "today" && <DailyTab date={date} today={today} />}
      {tab === "closed" && <ClosedDaysTab />}
      {tab === "bills" && <BillsTab from={from > to ? to : from} to={to} />}
      {tab === "tax" && <TaxTab year={year} quarter={quarter} />}
    </main>
  );
}
