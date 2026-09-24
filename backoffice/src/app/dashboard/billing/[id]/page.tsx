import Link from "next/link";
import { notFound } from "next/navigation";
import { AddPaymentForm, RefundForm } from "@/components/billing/billing-forms";
import { CancelInvoiceButton, MarkSentButton } from "@/components/billing/invoice-buttons";
import { InvoiceStatusBadge } from "@/components/billing/invoice-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, getInvoice, type InvoiceStatus, type Payment } from "@/lib/api";
import { eur, formatDateTime, formatDay, METHOD_LABELS, PAYMENT_STATUS_STYLES } from "@/lib/billing";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STEPS: { key: InvoiceStatus; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "PARTIAL", label: "Partially paid" },
  { key: "PAID", label: "Paid" },
];

function Progress({ status }: { status: InvoiceStatus }) {
  if (status === "CANCELLED") {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-900 ring-1 ring-red-200">
        This invoice was cancelled. Its number is kept on record.
      </p>
    );
  }
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Invoice status">
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
              {s.label}
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
  const hasSucceeded = invoice.payments.some((p) => p.status === "SUCCEEDED");
  const cancellable = (invoice.status === "DRAFT" || invoice.status === "SENT") && !hasSucceeded;
  const canPay = invoice.status !== "PAID" && invoice.status !== "CANCELLED" && Number(invoice.balance) > 0;

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/billing" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All invoices
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
            · Issued {formatDay(invoice.createdAt)} · Due {formatDay(invoice.dueDate)} ·{" "}
            <Link href={`/dashboard/bookings/${invoice.bookingId}`} prefetch={false} className="hover:underline">
              Booking
            </Link>
          </p>
        </div>
        <div className="flex items-start gap-2">
          {invoice.status === "DRAFT" && <MarkSentButton invoiceId={invoice.id} />}
          {cancellable && <CancelInvoiceButton invoiceId={invoice.id} size="default" />}
        </div>
      </div>

      <Progress status={invoice.status} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.description} <span className="ml-1 text-xs capitalize text-zinc-500">{item.type}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{eur(item.unitPrice, c)}</TableCell>
                    <TableCell className="text-right tabular-nums">{eur(item.total, c)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right">Subtotal</TableCell>
                  <TableCell className="text-right tabular-nums">{eur(invoice.subtotal, c)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd className="tabular-nums">{eur(invoice.subtotal, c)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">IGIC</dt>
                <dd className="tabular-nums">{eur(invoice.tax, c)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Discount</dt>
                <dd className="tabular-nums">{Number(invoice.discount) > 0 ? `−${eur(invoice.discount, c)}` : eur(0, c)}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{eur(invoice.total, c)}</dd>
              </div>
              <div className="flex justify-between pt-2">
                <dt className="text-zinc-500">Paid (after refunds)</dt>
                <dd className="tabular-nums">{eur(invoice.amountPaid, c)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>Balance</dt>
                <dd className="tabular-nums">{eur(invoice.balance, c)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-zinc-500">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {invoice.payments.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-semibold tabular-nums">{eur(p.amount, p.currency)}</span>
                      <span>{METHOD_LABELS[p.method]}</span>
                      <Badge className={PAYMENT_STATUS_STYLES[p.status]}>{p.status.toLowerCase()}</Badge>
                      <span className="text-zinc-500">{p.paidAt ? `Paid ${formatDateTime(p.paidAt)}` : "Not paid yet"}</span>
                      {p.stripePaymentId && <span className="font-mono text-xs text-zinc-500">{p.stripePaymentId}</span>}
                    </div>
                    {p.status === "SUCCEEDED" && Number(refundable(p)) > 0 && (
                      <RefundForm invoiceId={invoice.id} paymentId={p.id} refundable={refundable(p)} />
                    )}
                  </div>
                  {p.refunds.length > 0 && (
                    <ul className="mt-2 space-y-1 border-l-2 border-zinc-200 pl-4 text-sm text-zinc-600">
                      {p.refunds.map((r) => (
                        <li key={r.id}>
                          Refund <span className="font-medium tabular-nums">−{eur(r.amount, p.currency)}</span> · {r.reason} ·{" "}
                          {formatDateTime(r.processedAt)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canPay && <AddPaymentForm invoiceId={invoice.id} balance={Number(invoice.balance).toFixed(2)} />}
        </CardContent>
      </Card>
    </main>
  );
}
