import { centerLocale } from "@/lib/center";
import Link from "next/link";
import { AddExpenseForm, AddIncomeForm, DeleteEntryButton } from "@/components/financial/forms";
import type { DailyFinancial, DayBooking, DiveCount } from "@/lib/api";
import { activityWithDives } from "@/lib/bookings";
import { SLOT_NAMES } from "@/lib/trips";
import { INVOICE_STATUS_LABELS, money, METHOD_LABELS, PAYMENT_METHODS } from "@/lib/billing";
import { centerClock } from "@/lib/center-time";
import { EXPENSE_CATEGORY_LABELS, signClass } from "@/lib/financial";
import { getT } from "@/lib/i18n/server";

type Summary = Omit<DailyFinancial, "closed">;

const th = "px-4 py-2 font-medium";
const td = "px-4 py-2";

async function Card({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: string }) {
  const { currency } = await centerLocale();
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 print:ring-zinc-400">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{money(value, currency)}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

async function Section({
  title,
  total,
  action,
  children,
}: {
  title: string;
  total?: { label: string; value: string; tone?: string };
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { currency } = await centerLocale();
  return (
    <section className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-zinc-200 print:break-inside-avoid print:ring-zinc-400">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {total && (
          <p className={`text-sm font-semibold ${total.tone ?? "text-zinc-900"}`}>
            {total.label}: {money(total.value, currency)}
          </p>
        )}
      </div>
      {children}
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-500">{children}</p>;
}

export const DIVE_GROUPS = [
  ["funDives", "Fun dives"],
  ["snorkeling", "Snorkeling"],
  ["discoverScuba", "Discover scuba"],
  ["courses", "Courses"],
] as const;

// What the day's bookings are: how many of each kind, divers and dives.
async function DiveCounts({ counts }: { counts: NonNullable<Summary["diveCounts"]> }) {
  const t = await getT();
  const line = (c: DiveCount) =>
    `${t(c.divers === 1 ? "1 diver" : "{count} divers", { count: c.divers })} · ${t(c.dives === 1 ? "1 dive" : "{count} dives", { count: c.dives })}`;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {DIVE_GROUPS.map(([key, label]) => (
        <div key={key} className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 print:ring-zinc-400">
          <p className="text-xs font-medium text-zinc-500">{t(label)}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{counts[key].bookings}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {t(counts[key].bookings === 1 ? "1 booking" : "{count} bookings", { count: counts[key].bookings })} · {line(counts[key])}
          </p>
        </div>
      ))}
    </div>
  );
}

// How a booking is being billed.
function billingText(b: DayBooking, t: (k: string, v?: Record<string, string | number>) => string) {
  if (b.billing.kind === "invoice") return `${b.billing.invoiceNumber} · ${t(INVOICE_STATUS_LABELS[b.billing.status])}`;
  return b.billing.kind === "stay" ? t("In an open stay") : t("Not billed yet");
}

// The day's bookings, folded away by default.
async function BookingDetails({ bookings }: { bookings: DayBooking[] }) {
  const t = await getT();
  const { currency } = await centerLocale();
  return (
    <details className="group rounded-xl bg-white ring-1 ring-zinc-200 print:ring-zinc-400">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2 p-5 [&::-webkit-details-marker]:hidden">
        <h2 className="text-lg font-semibold text-zinc-900">
          <span className="mr-2 inline-block text-zinc-400 transition-transform group-open:rotate-90">›</span>
          {t("Booking details ({count})", { count: bookings.length })}
        </h2>
        <span className="text-xs text-zinc-500">{t("At each booking's prices, before tax")}</span>
      </summary>
      <div className="px-5 pb-5">
        {bookings.length === 0 ? (
          <Empty>{t("No bookings on this day.")}</Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className={th}>{t("Customer")}</th>
                  <th className={th}>{t("Activity")}</th>
                  <th className={th}>{t("When")}</th>
                  <th className={th}>{t("Billing")}</th>
                  <th className={`${th} text-right`}>{t("Amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className={td}>
                      <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="font-medium text-zinc-900 hover:underline">
                        {b.customerName}
                      </Link>
                      {b.participantCount > 1 && <span className="text-zinc-500"> +{b.participantCount - 1}</span>}
                    </td>
                    <td className={td}>
                      {activityWithDives(b.activityType, b.numberOfDives, t)}
                      {b.partnerName && (
                        <span className="block text-xs text-zinc-500">{t("Activity paid by {partner}", { partner: b.partnerName })}</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap text-zinc-600`}>
                      {t(SLOT_NAMES[b.timeSlot])} · {b.place ?? t("Shore")}
                    </td>
                    <td className={`${td} text-zinc-600`}>
                      {b.billing.kind === "invoice" ? (
                        <Link href={`/dashboard/billing/${b.billing.invoiceId}`} prefetch={false} className="hover:underline">
                          {billingText(b, t)}
                        </Link>
                      ) : (
                        billingText(b, t)
                      )}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{b.amount === null ? t("No price set") : money(b.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          {t("Fun dives billed with a stay get the stay's volume rate, so its invoice can differ.")}
        </p>
      </div>
    </details>
  );
}

// editable: the Daily tab, where entries can be added and deleted. A stored
// closed-day report is read-only.
export async function DailyReport({ data, editable }: { data: Summary; editable?: { taxRate: string } }) {
  const t = await getT();
  const { timeZone, currency } = await centerLocale();
  const { totals, taxName } = data;
  const movements = [
    ...data.payments.map((p) => ({ ...p, at: p.paidAt, kind: "Payment" as const, signed: p.amount })),
    ...data.refunds.map((r) => ({ ...r, at: r.processedAt, kind: "Refund" as const, signed: `-${r.amount}` })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label={t("Total income")} value={totals.income} tone="text-zinc-900" />
        <Card label={t("Total expenses")} value={totals.expenses} tone="text-red-700" />
        <Card label={t("Net")} value={totals.net} tone={signClass(totals.net, "text-green-700")} />
        <Card label={t("Invoice payments")} value={totals.payments} hint={t("Less refunds made this day")} tone={signClass(totals.payments)} />
      </div>

      {data.diveCounts && <DiveCounts counts={data.diveCounts} />}
      {data.bookings && <BookingDetails bookings={data.bookings} />}

      <Section title={t("Income from invoices")} total={{ label: t("Total"), value: totals.payments }}>
        <p className="text-xs text-zinc-500">
          {t("Payments received and refunds made on this day, whenever the dives took place.")}
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-zinc-700">{t("By payment method")}</h3>
            <dl className="mt-1 divide-y divide-zinc-100 text-sm">
              {PAYMENT_METHODS.map((m) => (
                <div key={m} className="flex justify-between py-1">
                  <dt className="text-zinc-600">{t(METHOD_LABELS[m])}</dt>
                  <dd className={signClass(data.byMethod[m])}>{money(data.byMethod[m], currency)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-700">{t("By activity")}</h3>
            {data.byActivity.length === 0 ? (
              <Empty>{t("No invoice payments on this day.")}</Empty>
            ) : (
              <dl className="mt-1 divide-y divide-zinc-100 text-sm">
                {data.byActivity.map((a) => (
                  <div key={a.activityType} className="flex justify-between py-1">
                    <dt className="text-zinc-600">{t(a.label)}</dt>
                    <dd className={signClass(a.amount)}>{money(a.amount, currency)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
        {movements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500">
                <tr>
                  <th className={th}>{t("Time")}</th>
                  <th className={th}>{t("Invoice")}</th>
                  <th className={th}>{t("Customer")}</th>
                  <th className={th}>{t("Type")}</th>
                  <th className={th}>{t("Method")}</th>
                  <th className={`${th} text-right`}>{t("Amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <tr key={`${m.kind}-${m.id}`}>
                    <td className={td}>{centerClock(timeZone, m.at)}</td>
                    <td className={td}>
                      <Link href={`/dashboard/billing/${m.invoiceId}`} prefetch={false} className="font-medium text-[#0077b6] hover:underline">
                        {m.invoiceNumber}
                      </Link>
                    </td>
                    <td className={td}>{m.customerName}</td>
                    <td className={td}>{m.kind === "Refund" ? ("reason" in m ? t("Refund ({reason})", { reason: m.reason }) : t("Refund")) : t("Payment")}</td>
                    <td className={td}>{t(METHOD_LABELS[m.method])}</td>
                    <td className={`${td} text-right ${signClass(m.signed)}`}>{money(m.signed, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={t("Other income")}
        total={{ label: t("Total"), value: totals.manualIncome, tone: "text-green-700" }}
        action={editable && <AddIncomeForm date={data.date} currency={currency} />}
      >
        {data.manualIncome.length === 0 ? (
          <Empty>{t("No other income recorded for this day.")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500">
                <tr>
                  <th className={th}>{t("Description")}</th>
                  <th className={th}>{t("Notes")}</th>
                  <th className={`${th} text-right`}>{t("Amount")}</th>
                  {editable && <th className={`${th} print:hidden`} />}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.manualIncome.map((i) => (
                  <tr key={i.id}>
                    <td className={td}>{i.description}</td>
                    <td className={`${td} whitespace-pre-line text-zinc-600`}>{i.notes ?? "—"}</td>
                    <td className={`${td} text-right`}>{money(i.amount, currency)}</td>
                    {editable && (
                      <td className={`${td} text-right print:hidden`}>
                        <DeleteEntryButton id={i.id} kind="income" label={`${i.description}, ${money(i.amount, currency)}`} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title={t("Expenses")}
        total={{ label: t("Total"), value: totals.expenses, tone: "text-red-700" }}
        action={editable && <AddExpenseForm date={data.date} taxName={taxName} taxRate={editable.taxRate} currency={currency} />}
      >
        {data.expenses.length === 0 ? (
          <Empty>{t("No expenses recorded for this day.")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500">
                <tr>
                  <th className={th}>{t("Category")}</th>
                  <th className={th}>{t("Description")}</th>
                  <th className={th}>{t("Notes")}</th>
                  <th className={`${th} text-right`}>{taxName}</th>
                  <th className={`${th} text-right`}>{t("Amount")}</th>
                  {editable && <th className={`${th} print:hidden`} />}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.expenses.map((e) => (
                  <tr key={e.id}>
                    <td className={td}>
                      <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
                        {EXPENSE_CATEGORY_LABELS[e.category] ? t(EXPENSE_CATEGORY_LABELS[e.category]) : e.category}
                      </span>
                    </td>
                    <td className={td}>{e.description}</td>
                    <td className={`${td} whitespace-pre-line text-zinc-600`}>{e.notes ?? "—"}</td>
                    <td className={`${td} text-right text-zinc-600`}>{money(e.tax, currency)}</td>
                    <td className={`${td} text-right`}>{money(e.amount, currency)}</td>
                    {editable && (
                      <td className={`${td} text-right print:hidden`}>
                        <DeleteEntryButton id={e.id} kind="expense" label={`${e.description}, ${money(e.amount, currency)}`} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
