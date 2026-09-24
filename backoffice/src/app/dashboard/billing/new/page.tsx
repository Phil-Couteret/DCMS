import Link from "next/link";
import { NewInvoiceForm } from "@/components/billing/billing-forms";
import { Card, CardContent } from "@/components/ui/card";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const booking = (await searchParams).booking;
  const bookingId = typeof booking === "string" && UUID.test(booking) ? booking : undefined;
  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/billing" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All invoices
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">New invoice</h1>
      <Card className="max-w-xl">
        <CardContent>
          <NewInvoiceForm bookingId={bookingId} />
        </CardContent>
      </Card>
    </main>
  );
}
