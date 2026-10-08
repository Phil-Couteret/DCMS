import Link from "next/link";
import { notFound } from "next/navigation";
import { DailyReport } from "@/components/financial/daily-report";
import { PrintButton } from "@/components/financial/forms";
import { ApiError, getClosedDay, getSettings } from "@/lib/api";
import { formatDateTime } from "@/lib/billing";
import { financialHref } from "@/lib/financial";
import { formatDayLabel } from "@/lib/trips";
import { centerLocale } from "@/lib/center";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The report as stored when the day was closed, not today's figures.
export default async function ClosedDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { timeZone } = await centerLocale();
  const { date } = await params;
  if (!ISO_DATE.test(date)) notFound();

  let day;
  try {
    day = await getClosedDay(date);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return (
      <main className="p-6 md:p-8">
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          The report could not be loaded: {e instanceof Error ? e.message : "unknown error"}
        </p>
      </main>
    );
  }
  const center = await getSettings().catch(() => null);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={financialHref({ tab: "closed" })} prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900 print:hidden">
            ← Closed days
          </Link>
          {center?.name && <p className="hidden text-sm font-medium print:block">{center.name}</p>}
          <h1 className="text-2xl font-semibold text-zinc-900">Daily financial report</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatDayLabel(date, "long")} · closed {formatDateTime(timeZone, day.closedAt)} by {day.closedBy}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <PrintButton />
          <Link
            href={financialHref({ tab: "today", date })}
            prefetch={false}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#0077b6] hover:underline"
          >
            Current figures
          </Link>
        </div>
      </div>
      <DailyReport data={day.summary} />
    </main>
  );
}
