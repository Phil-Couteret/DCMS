import { ApiError, getTaxDeclaration } from "@/lib/api";
import { declarationCsv, declarationFilename, parsePeriod } from "@/lib/declaration";

// The quarterly declaration as a CSV download (admins: the proxy and the API
// both check).
export async function GET(request: Request) {
  const period = parsePeriod(new URL(request.url).searchParams);
  if (!period) return new Response("Choose a year and quarter", { status: 400 });
  try {
    const d = await getTaxDeclaration(period.year, period.quarter);
    return new Response(declarationCsv(d), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${declarationFilename(d)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const status = e instanceof ApiError && [401, 403].includes(e.status) ? e.status : 502;
    return new Response("The declaration could not be loaded", { status });
  }
}
