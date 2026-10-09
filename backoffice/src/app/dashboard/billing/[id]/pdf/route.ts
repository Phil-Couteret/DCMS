import { ApiError, getInvoice, getSettings } from "@/lib/api";
import { centerLocale } from "@/lib/center";
import { invoiceFilename, renderInvoicePdf } from "@/lib/invoice-pdf";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The invoice as a PDF: inline (Print opens it), or ?download=1 to save it.
// The proxy has already required a staff session; the API checks the rest.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  try {
    const [invoice, center, { timeZone }] = await Promise.all([getInvoice(id), getSettings(), centerLocale()]);
    const pdf = await renderInvoicePdf({ invoice, center, timeZone });
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoiceFilename(invoice.invoiceNumber)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return new Response(status === 404 ? "Not found" : "The invoice could not be rendered", { status });
  }
}
