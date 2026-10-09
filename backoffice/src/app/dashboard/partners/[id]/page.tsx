import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CreateInvoiceButton,
  DeletePartnerButton,
  PartnerForm,
  RegenerateCredentials,
} from "@/components/partners/partner-forms";
import { PartnerInvoiceBadge } from "@/components/partners/status-badge";
import { Button } from "@/components/ui/button";
import { ApiError, getPartner, getPartnerInvoicePreview, getPartnerInvoices } from "@/lib/api";
import { money, formatDay } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";
import { outstanding, percent } from "@/lib/partners";
import { SLOT_NAMES } from "@/lib/trips";
import { centerLocale } from "@/lib/center";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const control =
  "mt-1 block rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const th = "px-3 py-2 font-medium";
const td = "px-3 py-2";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// From the first of last month to today: everything recent not yet invoiced.
function defaultPeriod(today: string) {
  const [y, m] = today.split("-").map(Number);
  const prev = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
  return { from: prev, to: today };
}

async function InvoicePreview({ partnerId, from, to }: { partnerId: string; from: string; to: string }) {
  const t = await getT();
  const { currency } = await centerLocale();
  let p;
  try {
    p = await getPartnerInvoicePreview(partnerId, from, to);
  } catch (e) {
    return (
      <p role="alert" className="text-sm text-red-700">
        {e instanceof Error ? e.message : t("The bookings could not be loaded")}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {p.pendingBookings > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {p.pendingBookings === 1
            ? t("1 pending booking in this period is not included. Confirm it to invoice it.")
            : t("{count} pending bookings in this period are not included. Confirm them to invoice them.", { count: p.pendingBookings })}
        </p>
      )}
      {p.bookings.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("No confirmed bookings left to invoice in this period.")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className={th}>{t("Date")}</th>
                  <th className={th}>{t("Customer")}</th>
                  <th className={th}>{t("Activity")}</th>
                  <th className={`${th} text-right`}>{t("Divers")}</th>
                  <th className={`${th} text-right`}>{t("Price")}</th>
                  <th className={`${th} text-right`}>{t("Value")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {p.bookings.map((b) => (
                  <tr key={b.id}>
                    <td className={td}>
                      <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="hover:underline">
                        {formatDay(b.date)}
                      </Link>
                      <span className="block text-xs text-zinc-500">{t(SLOT_NAMES[b.timeSlot])}</span>
                    </td>
                    <td className={td}>{b.customerName}</td>
                    <td className={td}>{b.activityName}</td>
                    <td className={`${td} text-right`}>{b.participantCount}</td>
                    <td className={`${td} text-right`}>{b.unitPrice ? money(b.unitPrice, currency) : <span className="text-red-700">{t("No price")}</span>}</td>
                    <td className={`${td} text-right`}>{b.total ? money(b.total, currency) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-sm">
              <dt className="text-zinc-500">{t("Catalogue value")}</dt>
              <dd className="text-right">{money(p.gross, currency)}</dd>
              <dt className="text-zinc-500">{t("Commission ({rate})", { rate: percent(p.commissionRate) })}</dt>
              <dd className="text-right">−{money(p.commission, currency)}</dd>
              <dt className="text-zinc-500">{t("Due before {tax}", { tax: p.taxName })}</dt>
              <dd className="text-right">{money(p.subtotal, currency)}</dd>
              <dt className="text-zinc-500">
                {p.taxName} ({percent(p.taxRate)})
              </dt>
              <dd className="text-right">{money(p.tax, currency)}</dd>
              <dt className="font-semibold text-zinc-900">{t("Total")}</dt>
              <dd className="text-right font-semibold text-zinc-900">{money(p.total, currency)}</dd>
            </dl>
            {p.unpriced.length > 0 ? (
              <p className="text-sm text-red-700">{t("No price is set for {activities}.", { activities: p.unpriced.join(", ") })}</p>
            ) : (
              <CreateInvoiceButton partnerId={partnerId} from={from} to={to} total={p.total} currency={currency} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default async function PartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getT();
  const { timeZone, currency } = await centerLocale();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const query = await searchParams;
  const today = centerNow(timeZone).isoDate;
  const period = defaultPeriod(today);
  const rawFrom = one(query.from);
  const rawTo = one(query.to);
  const from = rawFrom && ISO_DATE.test(rawFrom) ? rawFrom : period.from;
  const to = rawTo && ISO_DATE.test(rawTo) ? rawTo : period.to;

  let partner, invoices;
  try {
    [partner, invoices] = await Promise.all([getPartner(id), getPartnerInvoices({ partnerId: id })]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const { bookings, customers } = partner._count;
  const hasHistory = bookings + customers + partner._count.invoices > 0;

  return (
    <main className="max-w-5xl space-y-6 p-6 md:p-8">
      <Link href="/dashboard/partners" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        {t("← All partners")}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{partner.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {partner.companyName} · {t("{rate} commission", { rate: percent(partner.commissionRate) })} ·{" "}
            {bookings === 1 ? t("1 booking") : t("{count} bookings", { count: bookings })} ·{" "}
            {customers === 1 ? t("1 customer registered") : t("{count} customers registered", { count: customers })}
          </p>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${partner.isActive ? "bg-green-100 text-green-900" : "bg-zinc-200 text-zinc-700"}`}>
          {partner.isActive ? t("Active") : t("Inactive")}
        </span>
      </div>

      <Panel title={t("Invoice bookings")} description={t("Confirmed and completed bookings not yet on an invoice, valued at catalogue prices.")}>
        <form method="get" className="flex flex-wrap items-end gap-2">
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
        <InvoicePreview partnerId={id} from={from} to={to} />
      </Panel>

      <Panel title={t("Invoices")}>
        {invoices.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("No invoices yet.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500">
                <tr>
                  <th className={th}>{t("Invoice")}</th>
                  <th className={th}>{t("Period")}</th>
                  <th className={th}>{t("Due")}</th>
                  <th className={`${th} text-right`}>{t("Total")}</th>
                  <th className={`${th} text-right`}>{t("Outstanding")}</th>
                  <th className={th}>{t("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td className={td}>
                      <Link href={`/dashboard/partners/invoices/${i.id}`} prefetch={false} className="font-mono font-medium text-[#0077b6] hover:underline">
                        {i.invoiceNumber}
                      </Link>
                    </td>
                    <td className={td}>
                      {formatDay(i.periodFrom)} – {formatDay(i.periodTo)}
                    </td>
                    <td className={td}>{formatDay(i.dueDate)}</td>
                    <td className={`${td} text-right`}>{money(i.total, currency)}</td>
                    <td className={`${td} text-right`}>{money(outstanding(i), currency)}</td>
                    <td className={td}>
                      <PartnerInvoiceBadge invoice={i} today={today} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={t("Details")}>
        <PartnerForm partner={partner} />
      </Panel>

      <Panel title={t("Portal access")} description={t("The partner signs in at /partner/login with their contact email or API key, and the API secret.")}>
        <div>
          <p className="text-xs font-medium text-zinc-600">{t("API key")}</p>
          <code className="mt-1 block truncate rounded bg-zinc-50 px-2 py-1.5 font-mono text-sm ring-1 ring-zinc-200">{partner.apiKey}</code>
        </div>
        <p className="text-sm text-zinc-500">{t("The secret is stored only as a one-way hash, so it cannot be shown again. If it is lost, create a new key and secret.")}</p>
        <RegenerateCredentials partnerId={partner.id} email={partner.contactEmail} />
      </Panel>

      <Panel
        title={t("Remove partner")}
        description={
          hasHistory
            ? t("This partner has bookings, customers or invoices, so it is kept for the records. Untick Active above to stop its access.")
            : t("This partner has no bookings, customers or invoices yet.")
        }
      >
        {!hasHistory && <DeletePartnerButton partnerId={partner.id} name={partner.name} />}
      </Panel>
    </main>
  );
}
