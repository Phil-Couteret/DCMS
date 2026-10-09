import Link from "next/link";
import { DeleteTankButton, ImportTanksForm, TankForm } from "@/components/equipment/tank-forms";
import { RoutedDialog } from "@/components/routed-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocations, getSettings, getTanks, type LocationRef, type Tank, type TankTestState } from "@/lib/api";
import { formatDay } from "@/lib/equipment";
import type { T } from "@/lib/i18n/core";
import { pageLocation } from "@/lib/current-location";
import { getT } from "@/lib/i18n/server";
import {
  interval,
  matchesTestFilter,
  needsTest,
  TANK_SIZE_LABELS,
  TANK_SIZES,
  TANK_STATUS_LABELS,
  TEST_FILTERS,
  TEST_STATE_LABELS,
  TEST_STATE_STYLES,
  testDueSoon,
} from "@/lib/tanks";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function TestCell({
  last,
  next,
  state,
  retired,
  t,
}: {
  last: string | null;
  next: string | null;
  state: TankTestState;
  retired: boolean;
  t: T;
}) {
  return (
    <TableCell className="whitespace-nowrap">
      <span className="block">{last ? formatDay(last) : <span className="text-zinc-400">—</span>}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
        {next && <>{t("next {date}", { date: formatDay(next) })}</>}
        {!retired && (
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${TEST_STATE_STYLES[state]}`}>
            {t(TEST_STATE_LABELS[state])}
          </span>
        )}
      </span>
    </TableCell>
  );
}

function TankList({ title, tanks, className, t }: { title: string; tanks: Tank[]; className: string; t: T }) {
  return (
    <Alert className={className}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-inherit">
        <ul className="mt-1 space-y-0.5">
          {tanks.slice(0, 8).map((tank) => (
            <li key={tank.id}>
              {tank.serialNumber} ({TANK_SIZE_LABELS[tank.size]}):{" "}
              {(
                [
                  [tank.visualState, tank.nextVisualInspection, "Visual inspection date not recorded", "Visual inspection due {date}"],
                  [tank.hydrostaticState, tank.nextHydrostaticTest, "Hydrostatic test date not recorded", "Hydrostatic test due {date}"],
                ] as const
              )
                .filter(([s]) => s !== "OK")
                .map(([s, due, missing, dueText]) => (s === "NO_RECORD" ? t(missing) : t(dueText, { date: formatDay(due) })))
                .join(" · ")}
            </li>
          ))}
          {tanks.length > 8 && <li>{t("…and {count} more (use the test filter below)", { count: tanks.length - 8 })}</li>}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export async function TanksPanel({ params }: { params: Record<string, string | undefined> }) {
  const size = TANK_SIZES.find((s) => s === params.size);
  const test = TEST_FILTERS.find((f) => f.key === params.test)?.key;
  const t = await getT();
  const show = params.show === "retired" || params.show === "all" ? params.show : "active";
  // The filter's location, else the one chosen at the top ("" in the
  // filter: all of them).
  const location = await pageLocation(params.location);
  // ?tank=new, =import, or a tank's id: the dialog.
  const open = params.tank;

  const listParams = new URLSearchParams({ tab: "tanks" });
  for (const [k, v] of [["size", size], ["test", test], ["location", location], ["show", show === "active" ? undefined : show]] as const) {
    if (v) listParams.set(k, v);
  }
  const listHref = `/dashboard/equipment?${listParams}`;
  const withDialog = (value: string) => {
    const p = new URLSearchParams(listParams);
    p.set("tank", value);
    return `/dashboard/equipment?${p}`;
  };

  let all: Tank[];
  let locations: LocationRef[];
  let intervals: { visual: number; hydrostatic: number };
  try {
    let settings;
    [all, locations, settings] = await Promise.all([getTanks(), getLocations(true), getSettings()]);
    intervals = { visual: settings.visualInspectionIntervalMonths, hydrostatic: settings.hydrostaticTestIntervalMonths };
  } catch (e) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
        {t("Tanks could not be loaded: {reason}", { reason: e instanceof Error ? e.message : t("unknown error") })}
      </p>
    );
  }
  // The alerts cover every tank in use, not only the filtered rows.
  const overdue = all.filter(needsTest);
  const dueSoon = all.filter(testDueSoon);
  const tanks = all.filter(
    (t) =>
      (show === "all" || (show === "retired" ? t.status === "RETIRED" : t.status === "ACTIVE")) &&
      (!size || t.size === size) &&
      (!location || t.locationId === location) &&
      matchesTestFilter(t, test),
  );
  const editing = open && UUID.test(open) ? all.find((t) => t.id === open) : undefined;
  const filtered = Boolean(size || test || location || show !== "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-zinc-600">
          {t(
            "Cylinder tests: a visual inspection every {visual} and a hydrostatic test every {hydrostatic}, counted from the last one (Settings → General).",
            { visual: interval(intervals.visual, t), hydrostatic: interval(intervals.hydrostatic, t) },
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={withDialog("import")} prefetch={false} scroll={false} />}>
            {t("Import CSV")}
          </Button>
          <Button nativeButton={false} render={<Link href={withDialog("new")} prefetch={false} scroll={false} />}>
            {t("Add tank")}
          </Button>
        </div>
      </div>

      {overdue.length > 0 && (
        <TankList
          title={
            overdue.length === 1
              ? t("1 tank is overdue for testing, or has no test date on record")
              : t("{count} tanks are overdue for testing, or have no test date on record", { count: overdue.length })
          }
          tanks={overdue}
          t={t}
          className="border-red-300 bg-red-50 text-red-900"
        />
      )}
      {dueSoon.length > 0 && (
        <TankList
          title={
            dueSoon.length === 1
              ? t("1 tank needs testing within 30 days")
              : t("{count} tanks need testing within 30 days", { count: dueSoon.length })
          }
          tanks={dueSoon}
          t={t}
          className="border-amber-300 bg-amber-50 text-amber-900"
        />
      )}

      <form method="get" action="/dashboard/equipment" className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="tab" value="tanks" />
        <label className="text-sm font-medium text-zinc-700">
          {t("Size")}
          <select name="size" defaultValue={size ?? ""} className={control}>
            <option value="">{t("All sizes")}</option>
            {TANK_SIZES.map((s) => (
              <option key={s} value={s}>
                {TANK_SIZE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          {t("Tests")}
          <select name="test" defaultValue={test ?? ""} className={control}>
            <option value="">{t("All tanks")}</option>
            {TEST_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {t(f.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          {t("Location")}
          <select name="location" defaultValue={location ?? ""} className={control}>
            <option value="">{t("All locations")}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          {t("Show")}
          <select name="show" defaultValue={show} className={control}>
            <option value="active">{t("In use")}</option>
            <option value="retired">{t("Retired")}</option>
            <option value="all">{t("All")}</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">{t("Filter")}</Button>
          {filtered && (
            <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/equipment?tab=tanks" prefetch={false} />}>
              {t("Clear")}
            </Button>
          )}
        </div>
      </form>

      {tanks.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          {all.length === 0 ? t("No tanks yet. Add one, or import a CSV file.") : t("No tanks match these filters.")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Serial number")}</TableHead>
                <TableHead>{t("Size")}</TableHead>
                <TableHead>{t("Location")}</TableHead>
                <TableHead>{t("Visual inspection")}</TableHead>
                <TableHead>{t("Hydrostatic test")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Notes")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tanks.map((tank) => {
                const retired = tank.status === "RETIRED";
                const rowTone = retired ? "" : needsTest(tank) ? "bg-red-50/60" : testDueSoon(tank) ? "bg-amber-50/60" : "";
                return (
                  <TableRow key={tank.id} className={rowTone}>
                    <TableCell className="font-medium">{tank.serialNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">{TANK_SIZE_LABELS[tank.size]}</TableCell>
                    <TableCell>{tank.location?.name ?? <span className="text-zinc-400">—</span>}</TableCell>
                    <TestCell last={tank.visualInspectionDate} next={tank.nextVisualInspection} state={tank.visualState} retired={retired} t={t} />
                    <TestCell last={tank.hydrostaticTestDate} next={tank.nextHydrostaticTest} state={tank.hydrostaticState} retired={retired} t={t} />
                    <TableCell className={retired ? "text-zinc-500" : ""}>{t(TANK_STATUS_LABELS[tank.status])}</TableCell>
                    <TableCell className="max-w-56 truncate text-zinc-600" title={tank.notes ?? undefined}>
                      {tank.notes ?? ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start justify-end gap-1">
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={withDialog(tank.id)} prefetch={false} scroll={false} />}>
                          {t("Edit")}
                        </Button>
                        <DeleteTankButton id={tank.id} serialNumber={tank.serialNumber} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {(open === "new" || editing) && (
        <RoutedDialog wide closeHref={listHref} title={editing ? t("Edit tank {serial}", { serial: editing.serialNumber }) : t("Add tank")}>
          <TankForm tank={editing ?? null} locations={locations} cancelHref={listHref} intervals={intervals} />
        </RoutedDialog>
      )}
      {open === "import" && (
        <RoutedDialog wide closeHref={listHref} title={t("Import tanks from CSV")}>
          <ImportTanksForm locations={locations} closeHref={listHref} />
        </RoutedDialog>
      )}
    </div>
  );
}
