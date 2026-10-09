import Link from "next/link";
import { InvoiceStatusBadge } from "@/components/billing/invoice-badge";
import { DailyReport } from "@/components/financial/daily-report";
import { CloseDayButton, PrintButton, ReportExport } from "@/components/financial/forms";
import { Button } from "@/components/ui/button";
import { getClosedDays, getDailyFinancial, getFinancialInvoices, getSettings, getTaxDeclaration } from "@/lib/api";
import { money, formatDateTime, formatDay } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";
import { FINANCIAL_TABS, financialHref, monthBounds, QUARTER_LABELS, signClass, type FinancialTab } from "@/lib/financial";
import { formatDayLabel } from "@/lib/trips";
import { centerLocale } from "@/lib/center";
import { declarationQuery } from "@/lib/declaration";
import type { T } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";

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

// message: a translated sentence with an {error} placeholder.
function LoadError({ message, reason, t }: { message: string; reason: unknown; t: T }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {message.replace("{error}", reason instanceof Error ? reason.message : t("unknown error"))}
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
  const t = await getT();
  const { timeZone } = await centerLocale();
  let data, settings;
  try {
    [data, settings] = await Promise.all([getDailyFinancial(date), getSettings()]);
  } catch (e) {
    return <LoadError message={t("The day's figures could not be loaded: {error}")} reason={e} t={t} />;
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <form method="get" action="/dashboard/financial" className="flex items-end gap-2">
          <input type="hidden" name="tab" value="today" />
          <label className="block text-sm font-medium text-zinc-700">
            {t("Date")}
            <input type="date" name="date" defaultValue={date} className={control} />
          </label>
          <Button type="submit" variant="outline">
            {t("Show")}
          </Button>
          {date !== today && (
            <Link href={financialHref({ tab: "today" })} prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              {t("Today")}
            </Link>
          )}
        </form>
        <div className="flex items-start gap-2">
          <PrintButton />
          {date <= today && <CloseDayButton date={date} closed={Boolean(data.closed)} />}
        </div>
      </div>

      <h2 className="hidden text-xl font-semibold print:block">{t("Daily financial report · {date}", { date: formatDayLabel(date, "long") })}</h2>

      {data.closed && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-200 print:hidden">
          {t("Closed on {date} by {name}.", { date: formatDateTime(timeZone, data.closed.closedAt), name: data.closed.closedBy })}{" "}
          <Link href={`/dashboard/financial/closed/${date}`} prefetch={false} className="font-medium underline">
            {t("View the stored report")}
          </Link>
          . {t("Changes made since then are not in it until the day is closed again.")}
        </p>
      )}

      <DailyReport data={data} editable={{ taxRate: settings.taxRate }} />
    </div>
  );
}

async function ClosedDaysTab() {
  const t = await getT();
  const { timeZone, currency } = await centerLocale();
  let days;
  try {
    days = await getClosedDays();
  } catch (e) {
    return <LoadError message={t("Closed days could not be loaded: {error}")} reason={e} t={t} />;
  }
  if (days.length === 0) {
    return (
      <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
        <p className="font-medium text-zinc-900">{t("No closed days yet")}</p>
        <p className="mt-1 text-sm text-zinc-500">{t("A day's report is stored here when you close it on the Daily tab.")}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs text-zinc-500">
          <tr>
            <th className={th}>{t("Day")}</th>
            <th className={th}>{t("Closed")}</th>
            <th className={`${th} text-right`}>{t("Income")}</th>
            <th className={`${th} text-right`}>{t("Expenses")}</th>
            <th className={`${th} text-right`}>{t("Net")}</th>
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
                  <div className="flex flex-col items-end gap-1.5">
                    <Link href={`/dashboard/financial/closed/${day}`} prefetch={false} className="font-medium text-[#0077b6] hover:underline">
                      {t("View report")}
                    </Link>
                    <ReportExport date={day} compact />
                  </div>
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
  const t = await getT();
  const { timeZone, currency } = await centerLocale();
  const form = (
    <form method="get" action="/dashboard/financial" className="flex flex-wrap items-end gap-2 print:hidden">
      <input type="hidden" name="tab" value="bills" />
      <label className="block text-sm font-medium text-zinc-700">
        {t("From")}
        <input type="date" name="from" defaultValue={from} className={control} />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        {t("To")}
        <input type="date" name="to" defaultValue={to} className={control} />
      </label>
      <Button type="submit" variant="outline">
        {t("Show")}
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
        <LoadError message={t("Invoices could not be loaded: {error}")} reason={e} t={t} />
      </div>
    );
  }
  const { totals } = data;
  return (
    <div className="space-y-6">
      {form}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Invoices")} value={String(totals.count)} hint={t("Issued, not cancelled")} />
        <Stat label={t("Net amount")} value={money(totals.subtotal, currency)} />
        <Stat label={t("Tax")} value={money(totals.tax, currency)} />
        <Stat label={t("Total")} value={money(totals.total, currency)} hint={Number(totals.discount) > 0 ? t("After {amount} discounts", { amount: money(totals.discount, currency) }) : undefined} />
      </div>
      {data.invoices.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">{t("No invoices in this period")}</p>
          <p className="mt-1 text-sm text-zinc-500">{t("Draft and cancelled invoices are not listed.")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className={th}>{t("Invoice")}</th>
                <th className={th}>{t("Created")}</th>
                <th className={th}>{t("Customer")}</th>
                <th className={th}>{t("Status")}</th>
                <th className={`${th} text-right`}>{t("Net")}</th>
                <th className={`${th} text-right`}>{t("Tax")}</th>
                <th className={`${th} text-right`}>{t("Total")}</th>
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
  const t = await getT();
  const { currency } = await centerLocale();
  const form = (
    <form method="get" action="/dashboard/financial" className="flex flex-wrap items-end gap-2 print:hidden">
      <input type="hidden" name="tab" value="tax" />
      <label className="block text-sm font-medium text-zinc-700">
        {t("Quarter")}
        <select name="quarter" defaultValue={quarter} className={control}>
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              {t(QUARTER_LABELS[q])}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        {t("Year")}
        <input type="number" name="year" min={2000} max={2100} defaultValue={year} className={`${control} w-28`} />
      </label>
      <Button type="submit" variant="outline">
        {t("Show")}
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
        <LoadError message={t("The declaration could not be loaded: {error}")} reason={e} t={t} />
      </div>
    );
  }
  const toPay = Number(d.net) >= 0;
  const rate = `${Number(d.taxRate)}%`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        {form}
        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`/dashboard/financial/declaration/csv?${declarationQuery(d.year, d.quarter)}`} download />}
          >
            {t("Download CSV")}
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={`/dashboard/financial/declaration?${declarationQuery(d.year, d.quarter)}`} target="_blank" rel="noopener" />}
          >
            {t("Print")}
          </Button>
        </div>
      </div>
      <div className="hidden print:block">
        <h2 className="text-xl font-semibold">
          {t("{tax} quarterly declaration · {quarter} {year}", { tax: d.taxName, quarter: t(QUARTER_LABELS[d.quarter]), year: d.year })}
        </h2>
      </div>
      <p className="text-sm text-zinc-600">
        {t("Period {from} – {to}", { from: formatDay(d.from), to: formatDay(d.to) })}
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Sales base (base imponible)")} value={money(d.sales.base, currency)} hint={d.sales.count === 1 ? t("1 invoice") : t("{count} invoices", { count: d.sales.count })} />
        <Stat label={t("{tax} collected (cuota devengada)", { tax: d.taxName })} value={money(d.sales.tax, currency)} tone="text-green-700" />
        <Stat label={t("Purchases base (base imponible)")} value={money(d.purchases.base, currency)} hint={d.purchases.count === 1 ? t("1 expense") : t("{count} expenses", { count: d.purchases.count })} />
        <Stat label={t("{tax} paid (cuota soportada)", { tax: d.taxName })} value={money(d.purchases.tax, currency)} tone="text-amber-700" />
      </div>
      <div className={`rounded-xl p-6 text-center ring-1 ${toPay ? "bg-green-50 ring-green-200" : "bg-blue-50 ring-blue-200"}`}>
        <p className="text-sm font-medium text-zinc-700">
          {toPay ? t("Net {tax} to pay", { tax: d.taxName }) : t("Net {tax} to offset", { tax: d.taxName })}
        </p>
        <p className="text-xs text-zinc-500">{toPay ? "Resultado a ingresar" : "Resultado a compensar"}</p>
        <p className="mt-2 text-4xl font-semibold text-zinc-900">{money(Math.abs(Number(d.net)), currency)}</p>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200 print:ring-zinc-400">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs text-zinc-500">
            <tr>
              <th className={th}>{t("Concept")}</th>
              <th className={`${th} text-right`}>Base imponible</th>
              <th className={`${th} text-right`}>
                {d.taxName} ({rate})
              </th>
              <th className={`${th} text-right`}>{t("Total")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <tr>
              <td className={td}>{t("Sales (ventas)")}</td>
              <td className={`${td} text-right`}>{money(d.sales.base, currency)}</td>
              <td className={`${td} text-right`}>{money(d.sales.tax, currency)}</td>
              <td className={`${td} text-right`}>{money(Number(d.sales.base) + Number(d.sales.tax), currency)}</td>
            </tr>
            <tr>
              <td className={td}>{t("Purchases (compras)")}</td>
              <td className={`${td} text-right`}>{money(d.purchases.base, currency)}</td>
              <td className={`${td} text-right`}>{money(d.purchases.tax, currency)}</td>
              <td className={`${td} text-right`}>{money(d.purchases.total, currency)}</td>
            </tr>
            <tr className="font-semibold">
              <td className={td}>{t("Net result")}</td>
              <td className={`${td} text-right`}>—</td>
              <td className={`${td} text-right ${signClass(d.net)}`}>{money(d.net, currency)}</td>
              <td className={`${td} text-right`}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-1 text-xs text-zinc-500">
        <p>
          {t(
            "Sales are issued invoices (not draft or cancelled) by the date they were created. Purchases are the expenses recorded on the Daily tab. Other income carries no {tax} figure and is not included.",
            { tax: d.taxName },
          )}
        </p>
        {Number(d.sales.discount) > 0 && (
          <p>
            {t("Invoice discounts in this quarter (government bonos): {amount}. The sales base is after them, as the tax was charged.", {
              amount: money(d.sales.discount, currency),
            })}
          </p>
        )}
        <p>{t("This is a summary. Check every amount before filing with the tax office.")}</p>
      </div>
    </div>
  );
}

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getT();
  const { timeZone } = await centerLocale();
  const params = await searchParams;
  const now = centerNow(timeZone);
  const today = now.isoDate;
  const tab: FinancialTab = FINANCIAL_TABS.find((x) => x.key === one(params.tab))?.key ?? "today";
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
      <h1 className="text-2xl font-semibold text-zinc-900 print:hidden">{t("Financial")}</h1>
      <nav aria-label={t("Financial sections")} className="flex gap-1 overflow-x-auto border-b border-zinc-200 print:hidden">
        {FINANCIAL_TABS.map((x) => (
          <Link
            key={x.key}
            href={financialHref({ tab: x.key })}
            prefetch={false}
            aria-current={x.key === tab ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              x.key === tab ? "border-[#0096c7] text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t(x.label)}
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
