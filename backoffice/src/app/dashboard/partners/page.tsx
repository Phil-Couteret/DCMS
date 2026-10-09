import Link from "next/link";
import { PartnerInvoiceBadge } from "@/components/partners/status-badge";
import { Button } from "@/components/ui/button";
import { getPartnerInvoices, getPartners } from "@/lib/api";
import { money, formatDay } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";
import { displayStatus, outstanding, PARTNER_INVOICE_LABELS, PARTNER_INVOICE_STATUSES, percent } from "@/lib/partners";
import { centerLocale } from "@/lib/center";
import type { T } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "partners", label: "Partners" },
  { key: "invoices", label: "Partner invoices" },
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const control =
  "mt-1 block rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const th = "px-4 py-2 font-medium";
const td = "px-4 py-2";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// message: a translated sentence with an {error} placeholder.
function LoadError({ message, reason, t }: { message: string; reason: unknown; t: T }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {message.replace("{error}", reason instanceof Error ? reason.message : t("unknown error"))}
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

async function PartnersTab() {
  const t = await getT();
  const { currency } = await centerLocale();
  let partners;
  try {
    partners = await getPartners();
  } catch (e) {
    return <LoadError message={t("Partners could not be loaded: {error}")} reason={e} t={t} />;
  }
  const active = partners.filter((p) => p.isActive);
  const avg = partners.length > 0 ? partners.reduce((s, p) => s + Number(p.commissionRate), 0) / partners.length : 0;
  const owed = partners.reduce((s, p) => s + Number(p.outstanding), 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Partners")} value={String(partners.length)} />
        <Stat label={t("Active")} value={String(active.length)} />
        <Stat label={t("Average commission")} value={`${avg.toFixed(1)}%`} />
        <Stat label={t("Owed by partners")} value={money(owed, currency)} tone={owed > 0 ? "text-red-700" : "text-zinc-900"} />
      </div>
      {partners.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">{t("No partners yet")}</p>
          <p className="mt-1 text-sm text-zinc-500">{t("Add the agencies and resellers that sell your activities.")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className={th}>{t("Partner")}</th>
                <th className={th}>{t("Contact")}</th>
                <th className={`${th} text-right`}>{t("Commission")}</th>
                <th className={`${th} text-right`}>{t("Bookings")}</th>
                <th className={`${th} text-right`}>{t("Owed")}</th>
                <th className={th}>{t("Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {partners.map((p) => (
                <tr key={p.id}>
                  <td className={td}>
                    <Link href={`/dashboard/partners/${p.id}`} prefetch={false} className="font-medium text-[#0077b6] hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-zinc-500">{p.companyName}</span>
                  </td>
                  <td className={td}>
                    {p.contactEmail}
                    {p.contactPhone && <span className="block text-xs text-zinc-500">{p.contactPhone}</span>}
                  </td>
                  <td className={`${td} text-right`}>{percent(p.commissionRate)}</td>
                  <td className={`${td} text-right`}>{p._count.bookings}</td>
                  <td className={`${td} text-right ${Number(p.outstanding) > 0 ? "font-medium text-red-700" : ""}`}>{money(p.outstanding, currency)}</td>
                  <td className={td}>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${p.isActive ? "bg-green-100 text-green-900" : "bg-zinc-200 text-zinc-700"}`}
                    >
                      {p.isActive ? t("Active") : t("Inactive")}
                    </span>
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

async function InvoicesTab({ partnerId, status }: { partnerId?: string; status?: string }) {
  const t = await getT();
  const { timeZone, currency } = await centerLocale();
  const today = centerNow(timeZone).isoDate;
  let invoices, partners;
  try {
    [invoices, partners] = await Promise.all([
      // Overdue is not stored: fetch the open ones and filter here.
      getPartnerInvoices({ partnerId, status: status === "OVERDUE" ? undefined : status }),
      getPartners(),
    ]);
  } catch (e) {
    return <LoadError message={t("Partner invoices could not be loaded: {error}")} reason={e} t={t} />;
  }
  if (status === "OVERDUE") invoices = invoices.filter((i) => displayStatus(i, today) === "OVERDUE");
  const live = invoices.filter((i) => i.status !== "CANCELLED");
  const owed = live.reduce((s, i) => s + outstanding(i), 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("Invoices")} value={String(live.length)} />
        <Stat label={t("Unpaid")} value={String(live.filter((i) => i.status !== "PAID").length)} tone="text-amber-700" />
        <Stat label={t("Invoiced")} value={money(live.reduce((s, i) => s + Number(i.total), 0), currency)} />
        <Stat label={t("Outstanding")} value={money(owed, currency)} tone={owed > 0 ? "text-red-700" : "text-zinc-900"} />
      </div>
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200">
        <input type="hidden" name="tab" value="invoices" />
        <label className="block text-sm font-medium text-zinc-700">
          {t("Partner")}
          <select name="partnerId" defaultValue={partnerId ?? ""} className={`${control} w-56`}>
            <option value="">{t("All partners")}</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Status")}
          <select name="status" defaultValue={status ?? ""} className={`${control} w-48`}>
            <option value="">{t("All statuses")}</option>
            {[...PARTNER_INVOICE_STATUSES, "OVERDUE" as const].map((s) => (
              <option key={s} value={s}>
                {t(PARTNER_INVOICE_LABELS[s])}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">{t("Filter")}</Button>
      </form>
      {invoices.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">{t("No partner invoices")}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {partnerId || status ? t("None match these filters.") : t("Create one from a partner's page for a period of their bookings.")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className={th}>{t("Invoice")}</th>
                <th className={th}>{t("Partner")}</th>
                <th className={th}>{t("Period")}</th>
                <th className={th}>{t("Due")}</th>
                <th className={`${th} text-right`}>{t("Total")}</th>
                <th className={`${th} text-right`}>{t("Paid")}</th>
                <th className={`${th} text-right`}>{t("Outstanding")}</th>
                <th className={th}>{t("Status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoices.map((i) => {
                const due = outstanding(i);
                const late = displayStatus(i, today) === "OVERDUE";
                return (
                  <tr key={i.id}>
                    <td className={td}>
                      <Link href={`/dashboard/partners/invoices/${i.id}`} prefetch={false} className="font-mono font-medium text-[#0077b6] hover:underline">
                        {i.invoiceNumber}
                      </Link>
                    </td>
                    <td className={td}>{i.partner.name}</td>
                    <td className={td}>
                      {formatDay(i.periodFrom)} – {formatDay(i.periodTo)}
                    </td>
                    <td className={`${td} ${late ? "font-medium text-red-700" : ""}`}>{formatDay(i.dueDate)}</td>
                    <td className={`${td} text-right`}>{money(i.total, currency)}</td>
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
      )}
    </div>
  );
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getT();
  const params = await searchParams;
  const tab = TABS.find((x) => x.key === one(params.tab))?.key ?? "partners";
  const partnerId = one(params.partnerId);
  const status = one(params.status);
  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t("Partners")}</h1>
          <p className="mt-1 text-sm text-zinc-500">{t("Agencies selling your activities, their portal access and what they owe.")}</p>
        </div>
        <Button nativeButton={false} render={<Link href="/dashboard/partners/new" prefetch={false} />}>
          {t("Add partner")}
        </Button>
      </div>
      <nav aria-label={t("Partner sections")} className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={`/dashboard/partners?tab=${x.key}`}
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
      {tab === "partners" ? (
        <PartnersTab />
      ) : (
        <InvoicesTab
          partnerId={partnerId && UUID.test(partnerId) ? partnerId : undefined}
          status={[...PARTNER_INVOICE_STATUSES, "OVERDUE"].find((s) => s === status)}
        />
      )}
    </main>
  );
}
