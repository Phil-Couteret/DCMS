import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/financial/forms";
import { PartnerInvoiceDocument } from "@/components/partners/invoice-document";
import { CancelPartnerInvoiceButton, PartnerPaymentForm } from "@/components/partners/partner-forms";
import { PartnerInvoiceBadge } from "@/components/partners/status-badge";
import { ApiError, getPartnerInvoice, getSettings } from "@/lib/api";
import { formatDateTime } from "@/lib/billing";
import { centerNow } from "@/lib/center-time";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PartnerInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  let invoice;
  try {
    invoice = await getPartnerInvoice(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const center = await getSettings().catch(() => null);
  const today = centerNow().isoDate;
  const open = invoice.status !== "CANCELLED";

  return (
    <main className="max-w-4xl space-y-6 p-6 md:p-8">
      <Link
        href={`/dashboard/partners/${invoice.partnerId}`}
        prefetch={false}
        className="text-sm text-zinc-600 hover:text-zinc-900 print:hidden"
      >
        ← {invoice.partner.name}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-zinc-900">{invoice.invoiceNumber}</h1>
          <PartnerInvoiceBadge invoice={invoice} today={today} />
        </div>
        <div className="flex items-start gap-2">
          <PrintButton />
          {open && Number(invoice.paidAmount) === 0 && (
            <CancelPartnerInvoiceButton invoiceId={invoice.id} number={invoice.invoiceNumber} />
          )}
        </div>
      </div>

      <PartnerInvoiceDocument invoice={invoice} centerName={center?.name || undefined} />

      {open && (
        <section className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-zinc-200 print:hidden">
          <h2 className="text-lg font-semibold text-zinc-900">Payment</h2>
          {invoice.paidAt && <p className="text-sm text-green-700">Paid in full on {formatDateTime(invoice.paidAt)}.</p>}
          <PartnerPaymentForm invoiceId={invoice.id} paidAmount={invoice.paidAmount} total={invoice.total} />
        </section>
      )}
      <p className="text-xs text-zinc-500 print:hidden">
        Created by {invoice.createdBy ?? "unknown"} on {formatDateTime(invoice.createdAt)}.
        {open && Number(invoice.paidAmount) > 0 && " To cancel it, set the amount paid back to 0 first."}
      </p>
    </main>
  );
}
