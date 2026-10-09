import { InvoiceActions } from "@/components/billing/invoice-actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddPaymentForm, RefundForm } from "@/components/billing/billing-forms";
import { CancelInvoiceButton, MarkSentButton } from "@/components/billing/invoice-buttons";
import { InvoiceStatusBadge } from "@/components/billing/invoice-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, getInvoice, getSettings, type InvoiceStatus, type Payment } from "@/lib/api";
import { money, formatDateTime, formatDay, METHOD_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/billing";
import { activityWithDives } from "@/lib/bookings";
import { centerLocale } from "@/lib/center";
import type { T } from "@/lib/i18n/core";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STEPS: { key: InvoiceStatus; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "PARTIAL", label: "Partially paid" },
  { key: "PAID", label: "Paid" },
];

function Progress({ status, t }: { status: InvoiceStatus; t: T }) {
  if (status === "CANCELLED") {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-900 ring-1 ring-red-200">
        {t("This invoice was cancelled. Its number is kept on record.")}
      </p>
    );
  }
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label={t("Invoice status")}>
      {STEPS.map((s, i) => {
        // A fully paid invoice may skip "Partially paid"; show it as passed.
        const done = i < current;
        const here = i === current;
        return (
          <li key={s.key} className="flex items-center gap-2" aria-current={here ? "step" : undefined}>
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                here ? "bg-zinc-900 text-white" : done ? "bg-zinc-200 text-zinc-700" : "bg-white text-zinc-400 ring-1 ring-zinc-200"
              }`}
            >
              {t(s.label)}
            </span>
            {i < STEPS.length - 1 && <span className="text-zinc-300">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

function refundable(p: Payment) {
  const refunded = p.refunds.reduce((sum, r) => sum + Math.round(Number(r.amount) * 100), 0);
  return ((Math.round(Number(p.amount) * 100) - refunded) / 100).toFixed(2);
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const { timeZone } = await centerLocale();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let invoice;
  try {
    invoice = await getInvoice(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const c = invoice.currency;
  // The tax name comes from the center settings; the page still loads if they do not.
  const taxName = (await getSettings().catch(() => null))?.taxName ?? t("Tax");
  const hasSucceeded = invoice.payments.some((p) => p.status === "SUCCEEDED");
  const cancellable = (invoice.status === "DRAFT" || invoice.status === "SENT") && !hasSucceeded;
  const canPay = invoice.status !== "PAID" && invoice.status !== "CANCELLED" && Number(invoice.balance) > 0;

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/billing" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        {t("← All invoices")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold text-zinc-900">{invoice.invoiceNumber}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            <Link href={`/dashboard/customers/${invoice.customer.id}`} prefetch={false} className="hover:underline">
              {invoice.customer.firstName} {invoice.customer.lastName}
            </Link>{" "}
            · {t("Issued {date}", { date: formatDay(invoice.createdAt) })} · {t("Due {date}", { date: formatDay(invoice.dueDate) })} ·{" "}
            {invoice.bookingId ? (
              <Link href={`/dashboard/bookings/${invoice.bookingId}`} prefetch={false} className="hover:underline">
                {t("Booking")}
              </Link>
            ) : (
              t("Stay bill")
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <InvoiceActions invoiceId={invoice.id} customerEmail={invoice.customer.user?.email ?? null} />
          {invoice.status === "DRAFT" && <MarkSentButton invoiceId={invoice.id} />}
          {cancellable && <CancelInvoiceButton invoiceId={invoice.id} size="default" />}
        </div>
      </div>

      <Progress status={invoice.status} t={t} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("Line items")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Description")}</TableHead>
                  <TableHead className="text-right">{t("Qty")}</TableHead>
                  <TableHead className="text-right">{t("Unit price")}</TableHead>
                  <TableHead className="text-right">{t("Total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.description} <span className="ml-1 text-xs capitalize text-zinc-500">{item.type}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(item.unitPrice, c)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(item.total, c)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right">{t("Subtotal")}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(invoice.subtotal, c)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Totals")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t("Subtotal")}</dt>
                <dd className="tabular-nums">{money(invoice.subtotal, c)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{taxName}</dt>
                <dd className="tabular-nums">{money(invoice.tax, c)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">{t("Discount")}</dt>
                <dd className="tabular-nums">{Number(invoice.discount) > 0 ? `−${money(invoice.discount, c)}` : money(0, c)}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
                <dt>{t("Total")}</dt>
                <dd className="tabular-nums">{money(invoice.total, c)}</dd>
              </div>
              <div className="flex justify-between pt-2">
                <dt className="text-zinc-500">{t("Paid (after refunds)")}</dt>
                <dd className="tabular-nums">{money(invoice.amountPaid, c)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>{t("Balance")}</dt>
                <dd className="tabular-nums">{money(invoice.balance, c)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {invoice.partnerSplit.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Who pays")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt>
                  {t("Paid by the customer")}
                  <span className="block text-xs text-zinc-500">{t("This invoice")}</span>
                </dt>
                <dd className="tabular-nums font-medium">{money(invoice.total, c)}</dd>
              </div>
              {invoice.partnerSplit.map((s) => (
                <div key={s.partner.id} className="flex justify-between gap-4">
                  <dt>
                    {t("Paid by {partner}", { partner: s.partner.name })}
                    <span className="block text-xs text-zinc-500">
                      {t("The activities of its bookings, before its commission and {tax}, on its partner invoice", { tax: taxName })}
                    </span>
                  </dt>
                  <dd className="tabular-nums font-medium">{money(s.total, c)}</dd>
                </div>
              ))}
            </dl>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead>{t("Activity")}</TableHead>
                  <TableHead>{t("Partner")}</TableHead>
                  <TableHead>{t("Partner invoice")}</TableHead>
                  <TableHead className="text-right">{t("Amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.partnerSplit.flatMap((s) =>
                  s.bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap">{formatDay(b.date)}</TableCell>
                      <TableCell>{activityWithDives(b.activityType, b.numberOfDives, t)}</TableCell>
                      <TableCell>{s.partner.name}</TableCell>
                      <TableCell>
                        {b.partnerInvoice ? (
                          <Link href={`/dashboard/partners/invoices/${b.partnerInvoice.id}`} prefetch={false} className="font-mono text-xs hover:underline">
                            {b.partnerInvoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-xs text-zinc-500">{t("Not invoiced yet")}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{b.total === null ? t("No price set") : money(b.total, c)}</TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("Payments")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("No payments yet.")}</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {invoice.payments.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-semibold tabular-nums">{money(p.amount, p.currency)}</span>
                      <span>{t(METHOD_LABELS[p.method])}</span>
                      <Badge className={PAYMENT_STATUS_STYLES[p.status]}>{t(p.status.toLowerCase())}</Badge>
                      <span className="text-zinc-500">{p.paidAt ? t("Paid {date}", { date: formatDateTime(timeZone, p.paidAt) }) : t("Not paid yet")}</span>
                      {p.stripePaymentId && <span className="font-mono text-xs text-zinc-500">{p.stripePaymentId}</span>}
                    </div>
                    {p.status === "SUCCEEDED" && Number(refundable(p)) > 0 && (
                      <RefundForm invoiceId={invoice.id} paymentId={p.id} refundable={refundable(p)} currency={invoice.currency} />
                    )}
                  </div>
                  {p.refunds.length > 0 && (
                    <ul className="mt-2 space-y-1 border-l-2 border-zinc-200 pl-4 text-sm text-zinc-600">
                      {p.refunds.map((r) => (
                        <li key={r.id}>
                          {t("Refund")} <span className="font-medium tabular-nums">−{money(r.amount, p.currency)}</span> · {r.reason} ·{" "}
                          {formatDateTime(timeZone, r.processedAt)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canPay && <AddPaymentForm invoiceId={invoice.id} balance={Number(invoice.balance).toFixed(2)} currency={invoice.currency} />}
        </CardContent>
      </Card>
    </main>
  );
}
