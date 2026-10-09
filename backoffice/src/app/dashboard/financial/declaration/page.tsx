import { AutoPrint } from "@/components/financial/auto-print";
import { getSettings, getTaxDeclaration } from "@/lib/api";
import { formatDay, money } from "@/lib/billing";
import { centerLocale } from "@/lib/center";
import { parsePeriod } from "@/lib/declaration";
import { QUARTER_LABELS } from "@/lib/financial";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const th = "border-b border-zinc-400 px-2 py-1.5 text-left font-semibold";
const td = "border-b border-zinc-200 px-2 py-1";

// The quarterly declaration laid out for paper (Financial → Print): the
// summary, then every sale and purchase. Opens the print dialog by itself.
export default async function DeclarationPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getT();
  const raw = await searchParams;
  const period = parsePeriod(new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))));
  if (!period) return <p className="p-8 text-sm">{t("Choose a year and quarter on the Financial page.")}</p>;
  const [d, center, { currency }] = await Promise.all([getTaxDeclaration(period.year, period.quarter), getSettings(), centerLocale()]);
  const m = (v: string | number) => money(v, currency);
  const toPay = Number(d.net) >= 0;
  const sales = d.entries.filter((e) => e.kind === "SALE");
  const purchases = d.entries.filter((e) => e.kind === "PURCHASE");
  const Entries = ({ title, rows }: { title: string; rows: typeof d.entries }) => (
    <section className="mt-6 break-inside-auto">
      <h2 className="text-sm font-semibold">
        {title} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-600">{t("None.")}</p>
      ) : (
        <table className="mt-1 w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={th}>{t("Date")}</th>
              <th className={th}>{t("Description")}</th>
              <th className={`${th} text-right`}>{t("Net")}</th>
              <th className={`${th} text-right`}>{t("Rate")}</th>
              <th className={`${th} text-right`}>{d.taxName}</th>
              <th className={`${th} text-right`}>{t("Total")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e, i) => (
              <tr key={i} className="break-inside-avoid">
                <td className={`${td} whitespace-nowrap`}>{formatDay(e.date)}</td>
                <td className={td}>{e.description}</td>
                <td className={`${td} text-right tabular-nums`}>{m(e.net)}</td>
                <td className={`${td} text-right tabular-nums`}>{Number(e.taxRate)}%</td>
                <td className={`${td} text-right tabular-nums`}>{m(e.tax)}</td>
                <td className={`${td} text-right tabular-nums`}>{m(e.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
  return (
    <main className="mx-auto max-w-4xl bg-white p-8 text-zinc-900 print:max-w-none print:p-0">
      <AutoPrint />
      <header className="flex items-start justify-between gap-6 border-b border-zinc-900 pb-3">
        <div>
          <p className="text-lg font-semibold">{center.legalName || center.name}</p>
          {center.address && <p className="text-xs text-zinc-600">{center.address}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-lg font-semibold">
            {t("{tax} quarterly declaration", { tax: d.taxName })}
          </h1>
          <p className="text-sm">
            {t(QUARTER_LABELS[d.quarter])} {d.year} · {formatDay(d.from)} – {formatDay(d.to)}
          </p>
        </div>
      </header>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={th}>{t("Concept")}</th>
            <th className={`${th} text-right`}>Base imponible</th>
            <th className={`${th} text-right`}>{d.taxName}</th>
            <th className={`${th} text-right`}>{t("Total")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={td}>{t("Sales (ventas), {count} invoice(s)", { count: d.sales.count })}</td>
            <td className={`${td} text-right tabular-nums`}>{m(d.sales.base)}</td>
            <td className={`${td} text-right tabular-nums`}>{m(d.sales.tax)}</td>
            <td className={`${td} text-right tabular-nums`}>{m(Number(d.sales.base) + Number(d.sales.tax))}</td>
          </tr>
          <tr>
            <td className={td}>{t("Purchases (compras), {count} expense(s)", { count: d.purchases.count })}</td>
            <td className={`${td} text-right tabular-nums`}>{m(d.purchases.base)}</td>
            <td className={`${td} text-right tabular-nums`}>{m(d.purchases.tax)}</td>
            <td className={`${td} text-right tabular-nums`}>{m(d.purchases.total)}</td>
          </tr>
          <tr className="font-semibold">
            <td className={td}>
              {toPay
                ? t("Net {tax} to pay (resultado a ingresar)", { tax: d.taxName })
                : t("Net {tax} to offset (resultado a compensar)", { tax: d.taxName })}
            </td>
            <td className={td} />
            <td className={`${td} text-right tabular-nums`}>{m(Math.abs(Number(d.net)))}</td>
            <td className={td} />
          </tr>
        </tbody>
      </table>
      <Entries title={t("Sales")} rows={sales} />
      <Entries title={t("Purchases")} rows={purchases} />
      <p className="mt-6 text-xs text-zinc-600">
        {t(
          "Sales are issued invoices (not draft or cancelled) by the date they were created, net of discounts. Purchases are the expenses recorded in the backoffice. This is a summary: check every amount before filing with the tax office.",
        )}
      </p>
    </main>
  );
}
