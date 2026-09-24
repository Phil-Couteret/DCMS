import Link from "next/link";
import { NewLogForm } from "@/components/dive-logs/new-log-form";
import { Card, CardContent } from "@/components/ui/card";
import { getDiveSites, getStaff } from "@/lib/api";
import { centerNow } from "@/lib/center-time";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewDiveLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = (await searchParams).booking;
  const bookingId = typeof booking === "string" && UUID.test(booking) ? booking : undefined;
  const [sites, guides] = await Promise.all([getDiveSites(), getStaff({ type: "GUIDE", status: "ACTIVE" })]);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/dive-logs" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All dive logs
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">New dive log</h1>
      <Card className="max-w-3xl">
        <CardContent>
          <NewLogForm
            sites={sites.map((s) => ({ id: s.id, name: s.nameEn }))}
            guides={guides.map((g) => ({ id: g.id, name: `${g.firstName} ${g.lastName}` }))}
            today={centerNow().isoDate}
            bookingId={bookingId}
          />
        </CardContent>
      </Card>
    </main>
  );
}
