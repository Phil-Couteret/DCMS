import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/bookings/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, getBookings, getCustomer, getCustomerDiveHistory, type Booking } from "@/lib/api";
import { ACTIVITY_LABELS, formatBookingDate, parseGuestNotes } from "@/lib/bookings";
import { CERT_LABELS, countryLabel, LANGUAGE_LABELS } from "@/lib/customers";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

// emergencyContact is free-form JSON: show an object as label/value pairs and
// anything else as text.
function EmergencyContact({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <>Not given</>;
  if (typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <>Not given</>;
    return (
      <ul className="space-y-0.5">
        {entries.map(([k, v]) => (
          <li key={k}>
            <span className="text-zinc-500">{k}:</span> {typeof v === "string" ? v : JSON.stringify(v)}
          </li>
        ))}
      </ul>
    );
  }
  return <>{typeof value === "string" ? value : JSON.stringify(value)}</>;
}

// The newest guest booking that carried a certification level. Customers
// have no certification records; this is what they said when booking.
function selfDeclaredCert(bookings: Booking[]) {
  const withLevel = bookings
    .map((b) => ({ booking: b, level: parseGuestNotes(b.notes)?.certificationLevel ?? null }))
    .filter((x): x is { booking: Booking; level: string } => x.level !== null)
    .sort((a, b) => b.booking.createdAt.localeCompare(a.booking.createdAt));
  return withLevel[0] ?? null;
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const [historyResult, bookingsResult] = await Promise.allSettled([
    getCustomerDiveHistory(id),
    getBookings({ customerId: id }),
  ]);
  const bookings = bookingsResult.status === "fulfilled" ? bookingsResult.value : [];
  const recentBookings = [...bookings]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);
  const cert = selfDeclaredCert(bookings);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/customers" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All customers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Customer since {dateTime.format(new Date(customer.createdAt))}
          </p>
        </div>
        <Button variant="outline" disabled title="Editing is not available yet">
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100">
              <Row label="First name">{customer.firstName}</Row>
              <Row label="Last name">{customer.lastName}</Row>
              <Row label="Phone">{customer.phone ?? "Not given"}</Row>
              <Row label="Country">{countryLabel(customer.country)}</Row>
              <Row label="Language">{LANGUAGE_LABELS[customer.language] ?? customer.language}</Row>
              <Row label="Birthdate">
                {customer.birthdate ? formatBookingDate(customer.birthdate, "long") : "Not given"}
              </Row>
              <Row label="Emergency contact">
                <EmergencyContact value={customer.emergencyContact} />
              </Row>
              <Row label="Total dives">{customer.totalDives}</Row>
              <Row label="Loyalty points">{customer.loyaltyPoints}</Row>
              <Row label="Last updated">{dateTime.format(new Date(customer.updatedAt))}</Row>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certifications</CardTitle>
            <CardDescription>No certification records are stored for customers yet.</CardDescription>
          </CardHeader>
          <CardContent>
            {cert ? (
              <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
                <p className="text-sm font-medium text-amber-900">
                  {CERT_LABELS[cert.level] ?? cert.level}
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                    Self-declared
                  </span>
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Stated by the customer when booking online on {dateTime.format(new Date(cert.booking.createdAt))}.
                  Not verified: check the certification card before the dive.
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No certification level declared.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <section aria-labelledby="dives" className="space-y-3">
        <h2 id="dives" className="text-lg font-semibold text-zinc-900">Dive history</h2>
        {historyResult.status === "rejected" ? (
          <p role="alert" className="text-sm text-red-700">
            Dive history could not be loaded: {String((historyResult.reason as Error).message)}
          </p>
        ) : historyResult.value.length === 0 ? (
          <p className="text-sm text-zinc-500">No logged dives yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Log</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-right">Max depth</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyResult.value.map((d) => (
                  <TableRow key={d.diveLogId}>
                    <TableCell>{formatBookingDate(d.date)}</TableCell>
                    <TableCell className="font-mono text-xs">{d.logNumber}</TableCell>
                    <TableCell>{d.siteName}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.maxDepth} m</TableCell>
                    <TableCell className="text-right tabular-nums">{d.duration} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section aria-labelledby="bookings" className="space-y-3">
        <h2 id="bookings" className="text-lg font-semibold text-zinc-900">Booking history</h2>
        {bookingsResult.status === "rejected" ? (
          <p role="alert" className="text-sm text-red-700">
            Bookings could not be loaded: {String((bookingsResult.reason as Error).message)}
          </p>
        ) : recentBookings.length === 0 ? (
          <p className="text-sm text-zinc-500">No bookings yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="hover:underline">
                        {formatBookingDate(b.date)}
                      </Link>
                    </TableCell>
                    <TableCell>{ACTIVITY_LABELS[b.activityType] ?? b.activityType}</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
