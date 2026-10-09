import { Document, Image, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CenterSettings, InvoiceDetail, InvoiceStatus } from "@/lib/api";

// The customer invoice as a PDF (Print, Download PDF and Email on the invoice
// page). Server-side only. Built-in Helvetica: no fonts are fetched.

const STATUS_TEXT: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Awaiting payment",
  PARTIAL: "Partly paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

const ink = "#18181b";
const muted = "#71717a";
const rule = "#e4e4e7";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: ink },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 110, height: 55, objectFit: "contain", marginBottom: 8 },
  center: { maxWidth: 260 },
  centerName: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  small: { color: muted, marginTop: 2 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", textAlign: "right" },
  meta: { marginTop: 6, alignItems: "flex-end" },
  metaRow: { flexDirection: "row", marginTop: 2 },
  metaLabel: { color: muted, width: 70, textAlign: "right", marginRight: 6 },
  metaValue: { fontFamily: "Helvetica-Bold", minWidth: 80, textAlign: "right" },
  billTo: { marginTop: 28, padding: 10, backgroundColor: "#f4f4f5", borderRadius: 4, width: 260 },
  label: { fontSize: 8, color: muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  table: { marginTop: 24 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: ink, paddingBottom: 5, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: rule, paddingVertical: 6 },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 40, textAlign: "right" },
  cUnit: { width: 80, textAlign: "right" },
  cTotal: { width: 85, textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: { borderTopWidth: 1, borderTopColor: ink, marginTop: 4, paddingTop: 6, fontSize: 12, fontFamily: "Helvetica-Bold" },
  status: { marginTop: 24, padding: 10, borderWidth: 1, borderColor: rule, borderRadius: 4 },
  statusLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, textAlign: "center", color: muted, fontSize: 8.5 },
});

export interface InvoicePdfInput {
  invoice: InvoiceDetail;
  center: Pick<CenterSettings, "name" | "legalName" | "address" | "phone" | "email" | "website" | "taxName" | "logoUrl">;
  timeZone: string;
}

function money(value: string | number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value));
}

function day(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

type Logo = { data: Buffer; format: "png" | "jpg" };

// The center's logo for the PDF: PNG or JPEG only (what the PDF library
// embeds), at most 1 MB, fetched within 3 s. Anything else: no logo.
async function fetchLogo(url: string | null): Promise<Logo | null> {
  if (!url?.startsWith("https://")) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    const format: Logo["format"] | null = type.includes("png") ? "png" : type.includes("jpeg") || type.includes("jpg") ? "jpg" : null;
    if (!res.ok || !format) return null;
    const data = Buffer.from(await res.arrayBuffer());
    return data.length <= 1_000_000 ? { data, format } : null;
  } catch {
    return null;
  }
}

function InvoiceDocument({ invoice, center, timeZone, logo }: InvoicePdfInput & { logo: Logo | null }) {
  const c = invoice.currency;
  const customer = invoice.customer;
  const contact = [center.phone, center.email, center.website].filter(Boolean).join("  ·  ");
  const name = center.name || "Dive Center";
  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={name} creator="DCMS">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.center}>
            {logo && <Image src={logo} style={s.logo} />}
            <Text style={s.centerName}>{name}</Text>
            {center.legalName && <Text style={s.small}>{center.legalName}</Text>}
            {center.address && <Text style={s.small}>{center.address}</Text>}
            {contact && <Text style={s.small}>{contact}</Text>}
          </View>
          <View>
            <Text style={s.title}>INVOICE</Text>
            <View style={s.meta}>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Number</Text>
                <Text style={s.metaValue}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Date</Text>
                <Text style={s.metaValue}>{day(invoice.createdAt, timeZone)}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Due</Text>
                <Text style={s.metaValue}>{day(invoice.dueDate, timeZone)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.billTo}>
          <Text style={s.label}>Bill to</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            {customer.firstName} {customer.lastName}
          </Text>
          {customer.user?.email && <Text style={s.small}>{customer.user.email}</Text>}
          {customer.phone && <Text style={s.small}>{customer.phone}</Text>}
          {customer.country && <Text style={s.small}>{customer.country}</Text>}
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={s.cDesc}>Description</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cUnit}>Unit price</Text>
            <Text style={s.cTotal}>Total</Text>
          </View>
          {invoice.items.map((item) => (
            <View key={item.id} style={s.tr} wrap={false}>
              <Text style={s.cDesc}>{item.description}</Text>
              <Text style={s.cQty}>{item.quantity}</Text>
              <Text style={s.cUnit}>{money(item.unitPrice, c)}</Text>
              <Text style={s.cTotal}>{money(item.total, c)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(invoice.subtotal, c)}</Text>
          </View>
          {Number(invoice.discount) > 0 && (
            <View style={s.totalRow}>
              <Text>Discount</Text>
              {/* ASCII "-": the built-in Helvetica has no "−" (U+2212) glyph. */}
              <Text>-{money(invoice.discount, c)}</Text>
            </View>
          )}
          <View style={s.totalRow}>
            <Text>{center.taxName || "Tax"}</Text>
            <Text>{money(invoice.tax, c)}</Text>
          </View>
          <View style={[s.totalRow, s.grand]}>
            <Text>Total</Text>
            <Text>{money(invoice.total, c)}</Text>
          </View>
        </View>

        <View style={s.status} wrap={false}>
          <Text style={s.label}>Payment status</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{STATUS_TEXT[invoice.status]}</Text>
          <View style={s.statusLine}>
            <Text style={{ color: muted }}>Paid</Text>
            <Text>{money(invoice.amountPaid, c)}</Text>
          </View>
          <View style={s.statusLine}>
            <Text style={{ color: muted }}>Balance due</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(invoice.balance, c)}</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          Thank you for diving with {name}!
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const logo = await fetchLogo(input.center.logoUrl);
  return renderToBuffer(<InvoiceDocument {...input} logo={logo} />);
}

// "INV-2026-0001.pdf"
export function invoiceFilename(invoiceNumber: string) {
  return `${invoiceNumber.replace(/[^A-Za-z0-9._-]/g, "_")}.pdf`;
}
