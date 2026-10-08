import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/financial/forms";
import { PartnerInvoiceDocument } from "@/components/partners/invoice-document";
import { PartnerInvoiceBadge } from "@/components/partners/status-badge";
import { ApiError, getPortalInvoice } from "@/lib/api";
import { centerNow } from "@/lib/center-time";
import { centerLocale } from "@/lib/center";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { timeZone } = await centerLocale();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  let invoice;
  try {
    invoice = await getPortalInvoice(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
      <Link href="/partner?tab=invoices" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900 print:hidden">
        ← All invoices
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-zinc-900">{invoice.invoiceNumber}</h1>
          <PartnerInvoiceBadge invoice={invoice} today={centerNow(timeZone).isoDate} />
        </div>
        <PrintButton />
      </div>
      <PartnerInvoiceDocument invoice={invoice} />
    </main>
  );
}
