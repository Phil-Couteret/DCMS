import { ApiError, getClosedDay } from "@/lib/api";
import { reportContext } from "@/lib/daily-report-context";
import { dailyReportHtml } from "@/lib/daily-report-html";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A closed day's report as an HTML file to download. The API call carries
// the signed-in user's token (admins only).
export async function GET(_request: Request, { params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!ISO_DATE.test(date)) return new Response("date must be YYYY-MM-DD", { status: 400 });
  try {
    const html = dailyReportHtml(await getClosedDay(date), await reportContext());
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="daily-report-${date}.html"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 500;
    return new Response(e instanceof Error ? e.message : "The report could not be built", { status });
  }
}
