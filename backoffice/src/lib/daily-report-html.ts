import type { ClosedDay, DiveCount } from "@/lib/api";
import { formatDateTime, money, METHOD_LABELS, PAYMENT_METHODS } from "@/lib/billing";
import { activityWithDives } from "@/lib/bookings";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/financial";
import type { T } from "@/lib/i18n/core";
import { formatDayLabel, SLOT_NAMES } from "@/lib/trips";

// A closed day's report as a standalone HTML document, from the figures
// stored when the day was closed: downloaded from Closed days, or emailed.

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const DIVE_GROUPS = [
  ["funDives", "Fun dives"],
  ["snorkeling", "Snorkeling"],
  ["discoverScuba", "Discover scuba"],
  ["courses", "Courses"],
] as const;

export interface ReportContext {
  t: T;
  lang: string;
  currency: string;
  timeZone: string;
  center: { name: string; address: string | null };
}

export function dailyReportHtml(day: ClosedDay, { t, lang, currency, timeZone, center }: ReportContext) {
  const date = day.date.slice(0, 10);
  const s = day.summary;
  const m = (v: string | number) => escape(money(v, currency));
  const table = (head: string[], rows: string[][], right: number[] = []) =>
    rows.length === 0
      ? ""
      : `<table><thead><tr>${head.map((h, i) => `<th${right.includes(i) ? ' class="num"' : ""}>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c, i) => `<td${right.includes(i) ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`;
  const section = (title: string, body: string) => `<section><h2>${escape(title)}</h2>${body}</section>`;
  const none = (text: string) => `<p class="muted">${escape(text)}</p>`;
  const count = (c: DiveCount) =>
    [String(c.bookings), String(c.divers), String(c.dives)];

  const closedBy = day.closedByName ? `${day.closedByName} (${day.closedBy})` : day.closedBy;
  const cards = [
    [t("Total income"), s.totals.income],
    [t("Total expenses"), s.totals.expenses],
    [t("Net"), s.totals.net],
    [t("Invoice payments"), s.totals.payments],
  ]
    .map(([label, value]) => `<div class="card"><p class="muted">${escape(label)}</p><p class="big">${m(value)}</p></div>`)
    .join("");

  const dives = s.diveCounts
    ? table(
        [t("Activity"), t("Bookings"), t("Divers"), t("Dives")],
        DIVE_GROUPS.map(([key, label]) => [escape(t(label)), ...count(s.diveCounts![key])]),
        [1, 2, 3],
      )
    : none(t("Not recorded: this day was closed before dive counts were kept. Close it again to add them."));

  const revenue = [
    table(
      [t("Payment method"), t("Amount")],
      PAYMENT_METHODS.map((pm) => [escape(t(METHOD_LABELS[pm])), m(s.byMethod[pm])]),
      [1],
    ),
    s.byActivity.length > 0
      ? table([t("Activity"), t("Amount")], s.byActivity.map((a) => [escape(t(a.label)), m(a.amount)]), [1])
      : none(t("No invoice payments on this day.")),
    s.refunds.length > 0
      ? `<h3>${escape(t("Refunds"))}</h3>` +
        table(
          [t("Invoice"), t("Customer"), t("Reason"), t("Amount")],
          s.refunds.map((r) => [escape(r.invoiceNumber), escape(r.customerName), escape(r.reason), `−${m(r.amount)}`]),
          [3],
        )
      : "",
    `<h3>${escape(t("Manual income"))}</h3>` +
      (s.manualIncome.length > 0
        ? table(
            [t("Description"), t("Notes"), t("Amount")],
            s.manualIncome.map((i) => [escape(i.description), escape(i.notes ?? ""), m(i.amount)]),
            [2],
          )
        : none(t("No manual income on this day."))),
  ].join("");

  const expenses =
    s.expenses.length > 0
      ? table(
          [t("Category"), t("Description"), t("Notes"), t("Amount")],
          s.expenses.map((e) => [escape(t(EXPENSE_CATEGORY_LABELS[e.category])), escape(e.description), escape(e.notes ?? ""), m(e.amount)]),
          [3],
        )
      : none(t("No expenses recorded for this day."));

  const bookings = s.bookings
    ? s.bookings.length > 0
      ? table(
          [t("Customer"), t("Activity"), t("When"), t("Amount")],
          s.bookings.map((b) => [
            escape(b.customerName + (b.participantCount > 1 ? ` +${b.participantCount - 1}` : "")),
            escape(activityWithDives(b.activityType, b.numberOfDives ?? 1, t)) + (b.partnerName ? `<br><span class="muted">${escape(t("Activity paid by {partner}", { partner: b.partnerName }))}</span>` : ""),
            escape(`${t(SLOT_NAMES[b.timeSlot])} · ${b.place ?? t("Shore")}`),
            b.amount === null ? escape(t("No price set")) : m(b.amount),
          ]),
          [3],
        )
      : none(t("No bookings on this day."))
    : none(t("Not recorded: this day was closed before booking details were kept. Close it again to add them."));

  const title = `${t("Daily financial report")} · ${formatDayLabel(date, "long")}`;
  return `<!doctype html>
<html lang="${escape(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #18181b; margin: 24px auto; max-width: 860px; padding: 0 16px; font-size: 14px; }
  h1 { font-size: 22px; margin: 4px 0; } h2 { font-size: 17px; margin: 24px 0 8px; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; }
  h3 { font-size: 14px; margin: 16px 0 6px; }
  .muted { color: #71717a; font-size: 12px; margin: 2px 0; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 16px; }
  .card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 10px; } .big { font-size: 20px; font-weight: bold; margin: 4px 0 0; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
  th { background: #f4f4f5; font-size: 12px; color: #52525b; } .num { text-align: right; font-variant-numeric: tabular-nums; }
  footer { margin-top: 32px; color: #a1a1aa; font-size: 11px; }
  @media (max-width: 600px) { .cards { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<header>
  <p class="muted">${escape(center.name)}${center.address ? ` · ${escape(center.address)}` : ""}</p>
  <h1>${escape(title)}</h1>
  <p class="muted">${escape(t("Closed by {name} on {date}", { name: closedBy, date: formatDateTime(timeZone, day.closedAt) }))}</p>
</header>
<div class="cards">${cards}</div>
${section(t("Dive counts"), dives)}
${section(t("Revenue"), revenue)}
${section(t("Expenses"), expenses)}
${section(t("Booking details"), bookings)}
<footer>${escape(t("Figures as stored when the day was closed. Amounts in {currency}; invoice income is cash basis (payments received that day, less refunds).", { currency }))}</footer>
</body>
</html>
`;
}
