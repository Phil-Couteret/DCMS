import Link from "next/link";
import { ConditionBadge, EquipmentStatusBadge } from "@/components/equipment/badges";
import { EquipmentStatusActions } from "@/components/equipment/status-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEquipment, type Equipment } from "@/lib/api";
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  formatDay,
  isOverdue,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/equipment";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const type = EQUIPMENT_TYPES.find((t) => t === one(params.type)?.toLowerCase());
  const size = one(params.size) || undefined;
  const status = EQUIPMENT_STATUSES.find((s) => s === one(params.status));
  const filtered = Boolean(type || size || status);

  let all: Equipment[] | null = null;
  let loadError: string | null = null;
  try {
    all = await getEquipment();
  } catch (e) {
    loadError = (e as Error).message;
  }

  // Filtered here rather than by the API: type and size are free text there
  // and matched exactly, so "BCD" would never match "bcd".
  const items = (all ?? []).filter(
    (i) =>
      (!type || i.type.toLowerCase() === type) &&
      (!size || (i.size ?? "").toLowerCase() === size.toLowerCase()) &&
      (!status || i.status === status),
  );
  const sizes = [...new Set((all ?? []).map((i) => i.size).filter((s): s is string => Boolean(s)))].sort();
  // The banner covers the whole inventory, not only the filtered rows.
  const overdue = (all ?? []).filter(isOverdue);

  return (
    <main className="space-y-6 p-6 md:p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Equipment</h1>

      {overdue.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTitle>
            {overdue.length} item{overdue.length === 1 ? " is" : "s are"} overdue for maintenance
          </AlertTitle>
          <AlertDescription className="text-amber-900">
            <ul className="mt-1 space-y-0.5">
              {overdue.map((i) => (
                <li key={i.id}>
                  <Link href={`/dashboard/equipment/${i.id}`} prefetch={false} className="underline">
                    {typeLabel(i.type)} · {i.brand}
                    {i.serialNumber ? ` · ${i.serialNumber}` : ""}
                  </Link>{" "}
                  — due {formatDay(i.nextMaintenance)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,14rem))_auto]">
        <label className="block text-sm font-medium text-zinc-700">
          Type
          <select name="type" defaultValue={type ?? ""} className={control}>
            <option value="">All types</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Size
          <select name="size" defaultValue={size ?? ""} className={control}>
            <option value="">All sizes</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Status
          <select name="status" defaultValue={status ?? ""} className={control}>
            <option value="">All statuses</option>
            {EQUIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Filter</Button>
          {filtered && (
            <Link href="/dashboard/equipment" prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              Clear
            </Link>
          )}
        </div>
      </form>

      {loadError ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          Equipment could not be loaded: {loadError}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">No equipment found</p>
          <p className="mt-1 text-sm text-zinc-500">
            {filtered ? "No item matches these filters." : "There is no equipment yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Last Maintenance</TableHead>
                <TableHead>Next Maintenance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/equipment/${i.id}`} prefetch={false} className="hover:underline">
                      {typeLabel(i.type)}
                    </Link>
                  </TableCell>
                  <TableCell>{i.brand}</TableCell>
                  <TableCell>{i.model ?? "—"}</TableCell>
                  <TableCell>{i.size ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{i.serialNumber ?? "—"}</TableCell>
                  <TableCell>
                    <EquipmentStatusBadge status={i.status} />
                  </TableCell>
                  <TableCell>
                    <ConditionBadge condition={i.condition} />
                  </TableCell>
                  <TableCell>{formatDay(i.lastMaintenance)}</TableCell>
                  <TableCell className={isOverdue(i) ? "font-semibold text-red-700" : undefined}>
                    {formatDay(i.nextMaintenance)}
                    {isOverdue(i) && <span className="ml-1 text-xs">(overdue)</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <EquipmentStatusActions equipmentId={i.id} status={i.status} />
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
