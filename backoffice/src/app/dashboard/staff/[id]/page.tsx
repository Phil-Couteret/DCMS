import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityForm, StatusToggle } from "@/components/staff/staff-forms";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, getStaffMember } from "@/lib/api";
import { centerNow } from "@/lib/center-time";
import { formatDay, nextDays, TYPE_LABELS } from "@/lib/staff";

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

export default async function StaffMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let member;
  try {
    member = await getStaffMember(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const today = centerNow().isoDate;
  const byDay = new Map(member.availability.map((a) => [a.date.slice(0, 10), a]));
  const week = nextDays(today, 7);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/staff" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All staff
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {member.firstName} {member.lastName}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
            {TYPE_LABELS[member.type]} <StaffStatusBadge status={member.status} />
          </div>
        </div>
        <StatusToggle staffId={member.id} status={member.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100">
              <Row label="First name">{member.firstName}</Row>
              <Row label="Last name">{member.lastName}</Row>
              <Row label="Phone">
                {member.phone ? (
                  <a href={`tel:${member.phone.replace(/\s+/g, "")}`} className="hover:underline">
                    {member.phone}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Type">{TYPE_LABELS[member.type]}</Row>
              <Row label="Status">
                <StaffStatusBadge status={member.status} />
              </Row>
              <Row label="Hire date">{formatDay(member.hireDate)}</Row>
              <Row label="User account">
                <span className="break-all font-mono text-xs">{member.userId}</span>
              </Row>
              <Row label="Last updated">{formatDay(member.updatedAt)}</Row>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next 7 days</CardTitle>
            <CardDescription>
              Availability as entered. Bookings are not assigned to staff, so no trips are shown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-zinc-100">
              {week.map((day) => {
                const entry = byDay.get(day);
                return (
                  <li key={day} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                    <span className="text-zinc-900">
                      {formatDay(`${day}T00:00:00Z`, "weekday")}
                      {day === today && <span className="ml-1 text-xs text-zinc-500">(today)</span>}
                    </span>
                    {entry ? (
                      <span className="text-right">
                        <span className={entry.available ? "font-medium text-green-700" : "font-medium text-red-700"}>
                          {entry.available ? "Available" : "Unavailable"}
                        </span>
                        {entry.reason && <span className="block text-xs text-zinc-500">{entry.reason}</span>}
                      </span>
                    ) : (
                      <span className="text-zinc-400">Not set</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Set availability</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityForm staffId={member.id} today={today} />
        </CardContent>
      </Card>

      <section aria-labelledby="qualifications" className="space-y-3">
        <h2 id="qualifications" className="text-lg font-semibold text-zinc-900">Qualifications</h2>
        {member.qualifications.length === 0 ? (
          <p className="text-sm text-zinc-500">No qualifications recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.qualifications.map((q) => {
                  const expired = q.expiryDate !== null && q.expiryDate.slice(0, 10) < today;
                  return (
                    <TableRow key={q.id} className={expired ? "bg-red-50" : undefined}>
                      <TableCell className={expired ? "font-medium text-red-800" : "font-medium"}>{q.type}</TableCell>
                      <TableCell>{q.agency}</TableCell>
                      <TableCell className="font-mono text-xs">{q.number}</TableCell>
                      <TableCell>{formatDay(q.issueDate)}</TableCell>
                      <TableCell className={expired ? "font-semibold text-red-700" : undefined}>
                        {q.expiryDate ? formatDay(q.expiryDate) : "No expiry"}
                        {expired && <span className="ml-1 text-xs">(expired)</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
