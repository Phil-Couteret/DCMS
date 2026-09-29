import Link from "next/link";
import { AddExpenseForm, AddIncomeForm, DeleteEntryButton } from "@/components/financial/forms";
import type { DailyFinancial } from "@/lib/api";
import { eur, METHOD_LABELS, PAYMENT_METHODS } from "@/lib/billing";
import { centerClock } from "@/lib/center-time";
import { EXPENSE_CATEGORY_LABELS, signClass } from "@/lib/financial";

type Summary = Omit<DailyFinancial, "closed">;

const th = "px-4 py-2 font-medium";
const td = "px-4 py-2";

function Card({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200 print:ring-zinc-400">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{eur(value)}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Section({
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
  return (
    <section className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-zinc-200 print:break-inside-avoid print:ring-zinc-400">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {total && (
          <p className={`text-sm font-semibold ${total.tone ?? "text-zinc-900"}`}>
            {total.label}: {eur(total.value)}
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

// editable: the Daily tab, where entries can be added and deleted. A stored
// closed-day report is read-only.
export function DailyReport({ data, editable }: { data: Summary; editable?: { taxRate: string } }) {
  const { totals, taxName } = data;
  const movements = [
    ...data.payments.map((p) => ({ ...p, at: p.paidAt, kind: "Payment" as const, signed: p.amount })),
    ...data.refunds.map((r) => ({ ...r, at: r.processedAt, kind: "Refund" as const, signed: `-${r.amount}` })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Total income" value={totals.income} tone="text-zinc-900" />
        <Card label="Total expenses" value={totals.expenses} tone="text-red-700" />
        <Card label="Net" value={totals.net} tone={signClass(totals.net, "text-green-700")} />
        <Card label="Invoice payments" value={totals.payments} hint="Less refunds made this day" tone={signClass(totals.payments)} />
      </div>

      <Section title="Income from invoices" total={{ label: "Total", value: totals.payments }}>
        <p className="text-xs text-zinc-500">
          Payments received and refunds made on this day, whenever the dives took place.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-zinc-700">By payment method</h3>
            <dl className="mt-1 divide-y divide-zinc-100 text-sm">
              {PAYMENT_METHODS.map((m) => (
                <div key={m} className="flex justify-between py-1">
                  <dt className="text-zinc-600">{METHOD_LABELS[m]}</dt>
                  <dd className={signClass(data.byMethod[m])}>{eur(data.byMethod[m])}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-700">By activity</h3>
            {data.byActivity.length === 0 ? (
              <Empty>No invoice payments on this day.</Empty>
            ) : (
              <dl className="mt-1 divide-y divide-zinc-100 text-sm">
                {data.byActivity.map((a) => (
                  <div key={a.activityType} className="flex justify-between py-1">
                    <dt className="text-zinc-600">{a.label}</dt>
                    <dd className={signClass(a.amount)}>{eur(a.amount)}</dd>
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
                  <th className={th}>Time</th>
                  <th className={th}>Invoice</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Type</th>
                  <th className={th}>Method</th>
                  <th className={`${th} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {movements.map((m) => (
                  <tr key={`${m.kind}-${m.id}`}>
                    <td className={td}>{centerClock(m.at)}</td>
                    <td className={td}>
                      <Link href={`/dashboard/billing/${m.invoiceId}`} prefetch={false} className="font-medium text-[#0077b6] hover:underline">
                        {m.invoiceNumber}
                      </Link>
                    </td>
                    <td className={td}>{m.customerName}</td>
                    <td className={td}>{m.kind === "Refund" ? `Refund${"reason" in m ? ` (${m.reason})` : ""}` : "Payment"}</td>
                    <td className={td}>{METHOD_LABELS[m.method]}</td>
                    <td className={`${td} text-right ${signClass(m.signed)}`}>{eur(m.signed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Other income"
        total={{ label: "Total", value: totals.manualIncome, tone: "text-green-700" }}
        action={editable && <AddIncomeForm date={data.date} />}
      >
        {data.manualIncome.length === 0 ? (
          <Empty>No other income recorded for this day.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500">
                <tr>
                  <th className={th}>Description</th>
                  <th className={th}>Notes</th>
                  <th className={`${th} text-right`}>Amount</th>
                  {editable && <th className={`${th} print:hidden`} />}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.manualIncome.map((i) => (
                  <tr key={i.id}>
                    <td className={td}>{i.description}</td>
                    <td className={`${td} whitespace-pre-line text-zinc-600`}>{i.notes ?? "—"}</td>
                    <td className={`${td} text-right`}>{eur(i.amount)}</td>
                    {editable && (
                      <td className={`${td} text-right print:hidden`}>
                        <DeleteEntryButton id={i.id} kind="income" label={`${i.description}, ${eur(i.amount)}`} />
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
        title="Expenses"
        total={{ label: "Total", value: totals.expenses, tone: "text-red-700" }}
        action={editable && <AddExpenseForm date={data.date} taxName={taxName} taxRate={editable.taxRate} />}
      >
        {data.expenses.length === 0 ? (
          <Empty>No expenses recorded for this day.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500">
                <tr>
                  <th className={th}>Category</th>
                  <th className={th}>Description</th>
                  <th className={th}>Notes</th>
                  <th className={`${th} text-right`}>{taxName}</th>
                  <th className={`${th} text-right`}>Amount</th>
                  {editable && <th className={`${th} print:hidden`} />}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.expenses.map((e) => (
                  <tr key={e.id}>
                    <td className={td}>
                      <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800">
                        {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
                      </span>
                    </td>
                    <td className={td}>{e.description}</td>
                    <td className={`${td} whitespace-pre-line text-zinc-600`}>{e.notes ?? "—"}</td>
                    <td className={`${td} text-right text-zinc-600`}>{eur(e.tax)}</td>
                    <td className={`${td} text-right`}>{eur(e.amount)}</td>
                    {editable && (
                      <td className={`${td} text-right print:hidden`}>
                        <DeleteEntryButton id={e.id} kind="expense" label={`${e.description}, ${eur(e.amount)}`} />
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
