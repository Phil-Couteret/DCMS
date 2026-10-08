import { centerLocale } from "@/lib/center";
import type { PartnerInvoiceDetail } from "@/lib/api";
import { money, formatDay } from "@/lib/billing";
import { outstanding, percent } from "@/lib/partners";

const th = "px-3 py-2 font-medium";
const td = "px-3 py-2";

// A partner invoice as both staff and the partner see it.
export async function PartnerInvoiceDocument({ invoice, centerName }: { invoice: PartnerInvoiceDetail; centerName?: string }) {
  const { currency } = await centerLocale();
  const due = outstanding(invoice);
  return (
    <div className="space-y-5 rounded-xl bg-white p-6 ring-1 ring-zinc-200 print:ring-0">
      <div className="flex flex-wrap justify-between gap-4 text-sm">
        <div>
          {centerName && <p className="font-semibold text-zinc-900">{centerName}</p>}
          <p className="text-zinc-500">Billed to</p>
          <p className="font-medium text-zinc-900">{invoice.partner.companyName}</p>
          <p className="text-zinc-600">{invoice.partner.contactEmail}</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right">
          <dt className="text-zinc-500">Invoice</dt>
          <dd className="font-mono font-medium">{invoice.invoiceNumber}</dd>
          <dt className="text-zinc-500">Issued</dt>
          <dd>{formatDay(invoice.createdAt)}</dd>
          <dt className="text-zinc-500">Due</dt>
          <dd>{formatDay(invoice.dueDate)}</dd>
          <dt className="text-zinc-500">Bookings</dt>
          <dd>
            {formatDay(invoice.periodFrom)} – {formatDay(invoice.periodTo)}
          </dd>
        </dl>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-xs text-zinc-500">
            <tr>
              <th className={th}>Booking</th>
              <th className={`${th} text-right`}>Divers</th>
              <th className={`${th} text-right`}>Price</th>
              <th className={`${th} text-right`}>Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td className={td}>{l.description}</td>
                <td className={`${td} text-right`}>{l.quantity}</td>
                <td className={`${td} text-right`}>{money(l.unitPrice, currency)}</td>
                <td className={`${td} text-right`}>{money(l.total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
        <dt className="text-zinc-500">Catalogue value</dt>
        <dd className="text-right">{money(invoice.gross, currency)}</dd>
        <dt className="text-zinc-500">Your commission ({percent(invoice.commissionRate)})</dt>
        <dd className="text-right">−{money(invoice.commission, currency)}</dd>
        <dt className="text-zinc-500">Due before {invoice.taxName}</dt>
        <dd className="text-right">{money(invoice.subtotal, currency)}</dd>
        <dt className="text-zinc-500">
          {invoice.taxName} ({percent(invoice.taxRate)})
        </dt>
        <dd className="text-right">{money(invoice.tax, currency)}</dd>
        <dt className="border-t border-zinc-200 pt-1 font-semibold text-zinc-900">Total due</dt>
        <dd className="border-t border-zinc-200 pt-1 text-right font-semibold text-zinc-900">{money(invoice.total, currency)}</dd>
        {invoice.status !== "CANCELLED" && (
          <>
            <dt className="text-zinc-500">Paid</dt>
            <dd className="text-right">{money(invoice.paidAmount, currency)}</dd>
            <dt className="font-medium text-zinc-900">Outstanding</dt>
            <dd className={`text-right font-medium ${due > 0 ? "text-red-700" : "text-zinc-900"}`}>{money(due, currency)}</dd>
          </>
        )}
      </dl>
      <p className="text-xs text-zinc-500">
        The amount you pay the center: the bookings at catalogue price, less your commission, plus {invoice.taxName}.
      </p>
    </div>
  );
}
