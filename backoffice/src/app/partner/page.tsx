import Link from "next/link";
import { AddCustomerForm, CreateBookingForm } from "@/components/portal/forms";
import { PartnerInvoiceBadge } from "@/components/partners/status-badge";
import { getPortalBookings, getPortalCustomers, getPortalInvoices, getPortalMe } from "@/lib/api";
import { money, formatDay } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";
import { countryLabel } from "@/lib/customers";
import { outstanding, percent } from "@/lib/partners";
import { SLOT_NAMES } from "@/lib/trips";
import { centerLocale } from "@/lib/center";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "bookings", label: "Bookings" },
  { key: "customers", label: "Customers" },
  { key: "invoices", label: "Invoices" },
] as const;

const th = "px-4 py-2 font-medium";
const td = "px-4 py-2";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  CONFIRMED: "bg-blue-100 text-blue-900",
  COMPLETED: "bg-green-100 text-green-900",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  NO_SHOW: "bg-red-100 text-red-900",
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function LoadError({ what, reason }: { what: string; reason: unknown }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {what} could not be loaded: {reason instanceof Error ? reason.message : "unknown error"}
    </p>
  );
}

function Stat({ label, value, tone = "text-zinc-900" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white p-10 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">{children}</div>;
}

async function Overview() {
  const { currency } = await centerLocale();
  let me;
  try {
    me = await getPortalMe();
  } catch (e) {
    return <LoadError what="Your account" reason={e} />;
  }
  const { stats, partner } = me;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bookings" value={String(stats.bookings)} />
        <Stat label="Customers" value={String(stats.customers)} />
        <Stat label="Invoiced" value={money(stats.invoiced, currency)} />
        <Stat label="Outstanding" value={money(stats.outstanding, currency)} tone={Number(stats.outstanding) > 0 ? "text-red-700" : "text-zinc-900"} />
      </div>
      <section className="space-y-2 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900">Commission</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-zinc-500">Your rate</dt>
          <dd className="font-medium">{percent(partner.commissionRate)}</dd>
          <dt className="text-zinc-500">Earned on invoices</dt>
          <dd className="font-medium">{money(stats.commissionEarned, currency)}</dd>
        </dl>
        <p className="text-sm text-zinc-500">
          Your bookings are valued at the dive center&apos;s prices. Each invoice deducts your commission and adds tax.
        </p>
      </section>
      <section className="space-y-1 rounded-xl bg-white p-5 text-sm ring-1 ring-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-900">Your account</h2>
        <p>
          {partner.companyName} · {partner.contactEmail}
          {partner.contactPhone && ` · ${partner.contactPhone}`}
        </p>
        <p className="text-zinc-500">
          API key <code className="font-mono">{partner.apiKey}</code>. Ask the dive center for a new secret if yours is lost.
        </p>
      </section>
    </div>
  );
}

async function BookingsTab({ today }: { today: string }) {
  const { currency } = await centerLocale();
  let bookings, customers;
  try {
    [bookings, customers] = await Promise.all([getPortalBookings(), getPortalCustomers()]);
  } catch (e) {
    return <LoadError what="Bookings" reason={e} />;
  }
  return (
    <div className="space-y-4">
      <CreateBookingForm customers={customers} today={today} />
      {bookings.length === 0 ? (
        <Empty>No bookings yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Customer</th>
                <th className={th}>Activity</th>
                <th className={`${th} text-right`}>Divers</th>
                <th className={`${th} text-right`}>Value</th>
                <th className={th}>Status</th>
                <th className={th}>Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className={td}>
                    {formatDay(b.date)}
                    <span className="block text-xs text-zinc-500">{SLOT_NAMES[b.timeSlot]}</span>
                  </td>
                  <td className={td}>
                    {b.customer.firstName} {b.customer.lastName}
                  </td>
                  <td className={td}>
                    {b.activityName}
                    {b.notes && <span className="block max-w-xs truncate text-xs text-zinc-500">{b.notes}</span>}
                  </td>
                  <td className={`${td} text-right`}>{b.participantCount}</td>
                  <td className={`${td} text-right`}>{b.value ? money(b.value, currency) : "—"}</td>
                  <td className={td}>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[b.status]}`}>{STATUS_LABELS[b.status]}</span>
                  </td>
                  <td className={td}>
                    {b.partnerInvoice ? (
                      <Link href={`/partner/invoices/${b.partnerInvoice.id}`} prefetch={false} className="font-mono text-[#0077b6] hover:underline">
                        {b.partnerInvoice.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function CustomersTab() {
  let customers;
  try {
    customers = await getPortalCustomers();
  } catch (e) {
    return <LoadError what="Customers" reason={e} />;
  }
  return (
    <div className="space-y-4">
      <AddCustomerForm />
      {customers.length === 0 ? (
        <Empty>No customers yet. Add one, or create a booking for a new customer.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Phone</th>
                <th className={th}>Nationality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className={`${td} font-medium`}>
                    {c.firstName} {c.lastName}
                  </td>
                  <td className={td}>{c.email}</td>
                  <td className={td}>{c.phone ?? "—"}</td>
                  <td className={td}>{countryLabel(c.country)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function InvoicesTab({ today }: { today: string }) {
  const { currency } = await centerLocale();
  let invoices;
  try {
    invoices = await getPortalInvoices();
  } catch (e) {
    return <LoadError what="Invoices" reason={e} />;
  }
  if (invoices.length === 0) return <Empty>No invoices yet. The dive center invoices your confirmed bookings periodically.</Empty>;
  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs text-zinc-500">
          <tr>
            <th className={th}>Invoice</th>
            <th className={th}>Issued</th>
            <th className={th}>Due</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={`${th} text-right`}>Paid</th>
            <th className={`${th} text-right`}>Outstanding</th>
            <th className={th}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {invoices.map((i) => {
            const due = outstanding(i);
            return (
              <tr key={i.id}>
                <td className={td}>
                  <Link href={`/partner/invoices/${i.id}`} prefetch={false} className="font-mono font-medium text-[#0077b6] hover:underline">
                    {i.invoiceNumber}
                  </Link>
                </td>
                <td className={td}>{formatDay(i.createdAt)}</td>
                <td className={td}>{formatDay(i.dueDate)}</td>
                <td className={`${td} text-right font-medium`}>{money(i.total, currency)}</td>
                <td className={`${td} text-right`}>{money(i.paidAmount, currency)}</td>
                <td className={`${td} text-right ${due > 0 ? "font-medium text-red-700" : ""}`}>{money(due, currency)}</td>
                <td className={td}>
                  <PartnerInvoiceBadge invoice={i} today={today} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function PartnerPortalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { timeZone } = await centerLocale();
  const requested = one((await searchParams).tab);
  const tab = TABS.find((t) => t.key === requested)?.key ?? "overview";
  const today = centerNow(timeZone).isoDate;
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <nav aria-label="Portal sections" className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/partner?tab=${t.key}`}
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
      {tab === "overview" && <Overview />}
      {tab === "bookings" && <BookingsTab today={today} />}
      {tab === "customers" && <CustomersTab />}
      {tab === "invoices" && <InvoicesTab today={today} />}
    </main>
  );
}
