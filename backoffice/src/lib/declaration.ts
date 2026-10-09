import type { TaxDeclaration } from "@/lib/api";

// The quarterly declaration as a CSV file (Financial → Quarterly declaration →
// Download CSV): one row per sale (issued invoice) and purchase (expense).

export function declarationQuery(year: number, quarter: number) {
  return new URLSearchParams({ year: String(year), quarter: String(quarter) }).toString();
}

export function declarationFilename(d: Pick<TaxDeclaration, "taxName" | "year" | "quarter">) {
  const tax = d.taxName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "tax";
  return `${tax}-declaration-${d.year}-Q${d.quarter}.csv`;
}

// RFC 4180: quoted when needed, quotes doubled. A leading = + - @ would be
// read as a formula by a spreadsheet, so such text gets a leading quote.
function cell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) && !/^-?\d/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function declarationCsv(d: TaxDeclaration) {
  const rows = [
    ["date", "description", "net amount", "tax rate", "tax amount", "total"],
    ...d.entries.map((e) => [e.date, `${e.kind === "SALE" ? "Sale" : "Purchase"}: ${e.description}`, e.net, e.taxRate, e.tax, e.total]),
  ];
  // A byte order mark so spreadsheets read accents as UTF-8.
  return "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

// Year and quarter from a request's query, or null.
export function parsePeriod(params: URLSearchParams) {
  const year = Number(params.get("year"));
  const quarter = Number(params.get("quarter"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || ![1, 2, 3, 4].includes(quarter)) return null;
  return { year, quarter };
}
