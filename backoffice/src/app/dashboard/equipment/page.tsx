import { centerLocale } from "@/lib/center";
import { centerNow } from "@/lib/center-time";
import Link from "next/link";
import { ConditionBadge, EquipmentStatusBadge } from "@/components/equipment/badges";
import { DeleteEquipmentButton, EquipmentForm, ImportEquipmentForm } from "@/components/equipment/equipment-form";
import { EquipmentStatusActions } from "@/components/equipment/status-actions";
import { RoutedDialog } from "@/components/routed-panel";
import { TanksPanel } from "./tanks-panel";
import { getT } from "@/lib/i18n/server";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEquipment, type Equipment } from "@/lib/api";
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_TYPES,
  formatDay,
  isDueSoon,
  isOverdue,
  matchesSearch,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/equipment";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

async function EquipmentTabs({ current }: { current: "equipment" | "tanks" }) {
  const t = await getT();
  const tabs = [
    { key: "equipment", label: "Equipment", href: "/dashboard/equipment" },
    { key: "tanks", label: "Tanks", href: "/dashboard/equipment?tab=tanks" },
  ] as const;
  return (
    <nav aria-label={t("Equipment sections")} className="flex gap-1 border-b border-zinc-200">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          prefetch={false}
          aria-current={tab.key === current ? "page" : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
            tab.key === current ? "border-[#0096c7] text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {t(tab.label)}
        </Link>
      ))}
    </nav>
  );
}

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const t = await getT();
  if (one(params.tab) === "tanks") {
    const flat = Object.fromEntries(Object.keys(params).map((k) => [k, one(params[k])]));
    return (
      <main className="space-y-6 p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Equipment")}</h1>
        <EquipmentTabs current="tanks" />
        <TanksPanel params={flat} />
      </main>
    );
  }
  const { timeZone } = await centerLocale();
  const today = centerNow(timeZone).isoDate;
  const type = EQUIPMENT_TYPES.find((x) => x === one(params.type)?.toLowerCase());
  const size = one(params.size) || undefined;
  const status = EQUIPMENT_STATUSES.find((s) => s === one(params.status));
  const q = (one(params.q) ?? "").trim();
  const filtered = Boolean(type || size || status || q);
  // The add/edit dialog: ?equipment=new, or an item's id.
  const open = one(params.equipment);
  // The list with its filters, without the dialog.
  const listParams = new URLSearchParams();
  for (const [k, v] of [["q", q], ["type", type], ["size", size], ["status", status]] as const) if (v) listParams.set(k, v);
  const listHref = `/dashboard/equipment${listParams.size > 0 ? `?${listParams}` : ""}`;
  const withDialog = (value: string) => {
    const p = new URLSearchParams(listParams);
    p.set("equipment", value);
    return `/dashboard/equipment?${p}`;
  };

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
      (!status || i.status === status) &&
      matchesSearch(i, q),
  );
  const sizes = [...new Set((all ?? []).map((i) => i.size).filter((s): s is string => Boolean(s)))].sort();
  // The banner covers the whole inventory, not only the filtered rows.
  const overdue = (all ?? []).filter((i) => isOverdue(i, today));
  const dueSoon = (all ?? []).filter((i) => isDueSoon(i, today));
  const editing = open && open !== "new" && open !== "import" ? all?.find((i) => i.id === open) : undefined;
  // The KPI cards count the inventory in service.
  const inService = (all ?? []).filter((i) => i.status !== "DECOMMISSIONED");

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Equipment")}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={withDialog("import")} prefetch={false} scroll={false} />}>
            {t("Import CSV")}
          </Button>
          <Button nativeButton={false} render={<Link href={withDialog("new")} prefetch={false} scroll={false} />}>
            {t("New equipment")}
          </Button>
        </div>
      </div>
      <EquipmentTabs current="equipment" />

      {all && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              [t("Total items"), inService.length, t("Decommissioned items left out"), "text-zinc-900"],
              [t("Available"), inService.filter((i) => i.status === "AVAILABLE").length, t("Ready to rent"), "text-green-700"],
              [t("In maintenance"), inService.filter((i) => i.status === "MAINTENANCE").length, t("Out of service for now"), "text-amber-700"],
              [t("Overdue maintenance"), overdue.length, t("Past their next maintenance date"), overdue.length > 0 ? "text-red-700" : "text-zinc-900"],
            ] as const
          ).map(([name, value, hint, tone]) => (
            <div key={name} className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
              <p className="text-xs font-medium text-zinc-500">{name}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
            </div>
          ))}
        </div>
      )}

      {overdue.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTitle>
            {overdue.length === 1
              ? t("1 item is overdue for maintenance")
              : t("{count} items are overdue for maintenance", { count: overdue.length })}
          </AlertTitle>
          <AlertDescription className="text-amber-900">
            <ul className="mt-1 space-y-0.5">
              {overdue.map((i) => (
                <li key={i.id}>
                  <Link href={`/dashboard/equipment/${i.id}`} prefetch={false} className="underline">
                    {t(typeLabel(i.type))} · {i.brand}
                    {i.serialNumber ? ` · ${i.serialNumber}` : ""}
                  </Link>{" "}
                  — {t("due {date}", { date: formatDay(i.nextMaintenance) })}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {dueSoon.length > 0 && (
        <Alert className="border-sky-300 bg-sky-50 text-sky-900">
          <AlertTitle>
            {dueSoon.length === 1
              ? t("1 item is due for maintenance within 3 months")
              : t("{count} items are due for maintenance within 3 months", { count: dueSoon.length })}
          </AlertTitle>
          <AlertDescription className="text-sky-900">
            <ul className="mt-1 space-y-0.5">
              {dueSoon.map((i) => (
                <li key={i.id}>
                  <Link href={`/dashboard/equipment/${i.id}`} prefetch={false} className="underline">
                    {t(typeLabel(i.type))} · {i.brand}
                    {i.serialNumber ? ` · ${i.serialNumber}` : ""}
                  </Link>{" "}
                  — {t("due {date}", { date: formatDay(i.nextMaintenance) })}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-[minmax(0,18rem)_repeat(3,minmax(0,12rem))_auto]">
        <label className="block text-sm font-medium text-zinc-700">
          {t("Search")}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("Brand, model, size, serial…")}
            className={control}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Type")}
          <select name="type" defaultValue={type ?? ""} className={control}>
            <option value="">{t("All types")}</option>
            {EQUIPMENT_TYPES.map((x) => (
              <option key={x} value={x}>
                {t(typeLabel(x))}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Size")}
          <select name="size" defaultValue={size ?? ""} className={control}>
            <option value="">{t("All sizes")}</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Status")}
          <select name="status" defaultValue={status ?? ""} className={control}>
            <option value="">{t("All statuses")}</option>
            {EQUIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_LABELS[s])}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">{t("Filter")}</Button>
          {filtered && (
            <Link href="/dashboard/equipment" prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              {t("Clear")}
            </Link>
          )}
        </div>
      </form>

      {loadError ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {t("Equipment could not be loaded: {reason}", { reason: loadError })}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">{t("No equipment found")}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {filtered ? t("No item matches these filters.") : t("There is no equipment yet.")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Type")}</TableHead>
                <TableHead>{t("Brand")}</TableHead>
                <TableHead>{t("Model")}</TableHead>
                <TableHead>{t("Size")}</TableHead>
                <TableHead>{t("Serial")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Condition")}</TableHead>
                <TableHead>{t("Last Maintenance")}</TableHead>
                <TableHead>{t("Next Maintenance")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/equipment/${i.id}`} prefetch={false} className="hover:underline">
                      {t(typeLabel(i.type))}
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
                  <TableCell className={isOverdue(i, today) ? "font-semibold text-red-700" : undefined}>
                    {formatDay(i.nextMaintenance)}
                    {isOverdue(i, today) && <span className="ml-1 text-xs">{t("(overdue)")}</span>}
                    {isDueSoon(i, today) && <span className="ml-1 text-xs text-sky-800">{t("(due soon)")}</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start justify-end gap-1">
                      <EquipmentStatusActions equipmentId={i.id} status={i.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={withDialog(i.id)} prefetch={false} scroll={false} />}
                      >
                        {t("Edit")}
                      </Button>
                      <DeleteEquipmentButton item={i} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {open === "import" && (
        <RoutedDialog wide closeHref={listHref} title={t("Import equipment from CSV")}>
          <ImportEquipmentForm closeHref={listHref} />
        </RoutedDialog>
      )}
      {open && (open === "new" || editing) && (
        <RoutedDialog wide closeHref={listHref} title={editing ? t("Edit {name}", { name: `${t(typeLabel(editing.type))} · ${editing.brand}` }) : t("New equipment")}>
          <EquipmentForm item={editing ?? null} cancelHref={listHref} />
        </RoutedDialog>
      )}
    </main>
  );
}
