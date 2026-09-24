import Link from "next/link";
import { notFound } from "next/navigation";
import { ConditionBadge, EquipmentStatusBadge } from "@/components/equipment/badges";
import { LogMaintenanceForm, ScheduleForm } from "@/components/equipment/maintenance-forms";
import { EquipmentStatusActions } from "@/components/equipment/status-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, getEquipmentItem, getMaintenanceLogs } from "@/lib/api";
import { centerNow } from "@/lib/center-time";
import { formatDay, formatEur, isOverdue, typeLabel } from "@/lib/equipment";

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

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let item;
  try {
    item = await getEquipmentItem(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const logs = await getMaintenanceLogs(id).then(
    (value) => ({ ok: true as const, value }),
    (e: Error) => ({ ok: false as const, error: e.message }),
  );
  const overdue = isOverdue(item);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/equipment" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← All equipment
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {typeLabel(item.type)} · {item.brand}
            {item.model ? ` ${item.model}` : ""}
          </h1>
          <div className="mt-2 flex gap-2">
            <EquipmentStatusBadge status={item.status} />
            <ConditionBadge condition={item.condition} />
          </div>
        </div>
        <EquipmentStatusActions equipmentId={item.id} status={item.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100">
              <Row label="Type">{typeLabel(item.type)}</Row>
              <Row label="Brand">{item.brand}</Row>
              <Row label="Model">{item.model ?? "—"}</Row>
              <Row label="Size">{item.size ?? "—"}</Row>
              <Row label="Serial number">
                <span className="font-mono text-xs">{item.serialNumber ?? "—"}</span>
              </Row>
              <Row label="Purchased">
                {formatDay(item.purchaseDate)} · {formatEur(item.purchaseCost)}
              </Row>
              <Row label="Last maintenance">{formatDay(item.lastMaintenance)}</Row>
              <Row label="Next maintenance">
                <span className={overdue ? "font-semibold text-red-700" : undefined}>
                  {item.nextMaintenance ? formatDay(item.nextMaintenance) : "Not scheduled"}
                  {overdue && " (overdue)"}
                </span>
              </Row>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Schedule next maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleForm equipmentId={item.id} current={item.nextMaintenance} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Log maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <LogMaintenanceForm equipmentId={item.id} today={centerNow().isoDate} />
            </CardContent>
          </Card>
        </div>
      </div>

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="text-lg font-semibold text-zinc-900">Maintenance history</h2>
        {!logs.ok ? (
          <p role="alert" className="text-sm text-red-700">History could not be loaded: {logs.error}</p>
        ) : logs.value.length === 0 ? (
          <p className="text-sm text-zinc-500">No maintenance logged yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.value.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">{formatDay(l.date)}</TableCell>
                    <TableCell className="capitalize">{l.type}</TableCell>
                    <TableCell>{l.technician}</TableCell>
                    <TableCell className="max-w-md whitespace-pre-wrap">{l.notes ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatEur(l.cost)}</TableCell>
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
