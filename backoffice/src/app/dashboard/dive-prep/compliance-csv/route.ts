import type { NextRequest } from "next/server";
import { ApiError, getComplianceReport } from "@/lib/api";
import { complianceCsv } from "@/lib/dive-prep";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The day's compliance report as a CSV download. The API call carries the
// signed-in user's token; without a session it fails with 401.
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  const location = request.nextUrl.searchParams.get("location") ?? undefined;
  if (!ISO_DATE.test(date)) return new Response("date must be YYYY-MM-DD", { status: 400 });
  if (location !== undefined && !UUID.test(location)) return new Response("location must be a location id", { status: 400 });
  try {
    const report = await getComplianceReport(date, location);
    return new Response(complianceCsv(date, report.trips), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="compliance_report_${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return new Response(e instanceof Error ? e.message : "The report could not be built", { status });
  }
}
