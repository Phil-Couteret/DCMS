import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDiveLogs, getDiveSites, getStaff } from "@/lib/api";
import { formatDay } from "@/lib/dive-logs";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export default async function DiveLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const date = ISO_DATE.test(one(params.date) ?? "") ? one(params.date) : undefined;
  const siteId = UUID.test(one(params.siteId) ?? "") ? one(params.siteId) : undefined;
  const guideId = UUID.test(one(params.guideId) ?? "") ? one(params.guideId) : undefined;
  const filtered = Boolean(date || siteId || guideId);

  const [logsResult, sitesResult, guidesResult] = await Promise.allSettled([
    getDiveLogs({ date, siteId, guideId }),
    getDiveSites(),
    getStaff({ type: "GUIDE" }),
  ]);
  const sites = sitesResult.status === "fulfilled" ? sitesResult.value : [];
  const guides = guidesResult.status === "fulfilled" ? guidesResult.value : [];

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Dive Logs</h1>
        <Button nativeButton={false} render={<Link href="/dashboard/dive-logs/new" prefetch={false} />}>
          New Log
        </Button>
      </div>

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,14rem))_auto]">
        <label className="block text-sm font-medium text-zinc-700">
          Date
          <input type="date" name="date" defaultValue={date ?? ""} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Site
          <select name="siteId" defaultValue={siteId ?? ""} className={control}>
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Guide
          <select name="guideId" defaultValue={guideId ?? ""} className={control}>
            <option value="">All guides</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.firstName} {g.lastName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Filter</Button>
          {filtered && (
            <Link href="/dashboard/dive-logs" prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              Clear
            </Link>
          )}
        </div>
      </form>

      {logsResult.status === "rejected" ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          Dive logs could not be loaded: {String((logsResult.reason as Error).message)}
        </p>
      ) : logsResult.value.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">No dive logs found</p>
          <p className="mt-1 text-sm text-zinc-500">
            {filtered ? "No log matches these filters." : "No dives have been logged yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Guide</TableHead>
                <TableHead className="text-right">Max Depth</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Participants</TableHead>
                <TableHead className="text-right">Signatures</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsResult.value.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.logNumber}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDay(l.date)}</TableCell>
                  <TableCell>{l.site.nameEn}</TableCell>
                  <TableCell>{l.guide ? `${l.guide.firstName} ${l.guide.lastName}` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{l.maxDepth} m</TableCell>
                  <TableCell className="text-right tabular-nums">{l.duration} min</TableCell>
                  <TableCell className="text-right tabular-nums">{l._count.participants}</TableCell>
                  <TableCell className="text-right tabular-nums">{l._count.signatures}</TableCell>
                  <TableCell>
                    {l.incident ? <Badge className="bg-red-100 text-red-900">Incident</Badge> : <span className="text-zinc-400">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/dive-logs/${l.id}`} prefetch={false} />}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
