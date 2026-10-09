import Link from "next/link";
import { DeleteTankButton, ImportTanksForm, TankForm } from "@/components/equipment/tank-forms";
import { RoutedDialog } from "@/components/routed-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocations, getTanks, type LocationRef, type Tank, type TankTestState } from "@/lib/api";
import { formatDay } from "@/lib/equipment";
import {
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

function TestCell({ last, next, state, retired }: { last: string | null; next: string | null; state: TankTestState; retired: boolean }) {
  return (
    <TableCell className="whitespace-nowrap">
      <span className="block">{last ? formatDay(last) : <span className="text-zinc-400">—</span>}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
        {next && <>next {formatDay(next)}</>}
        {!retired && (
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ${TEST_STATE_STYLES[state]}`}>
            {TEST_STATE_LABELS[state]}
          </span>
        )}
      </span>
    </TableCell>
  );
}

function TankList({ title, tanks, className }: { title: string; tanks: Tank[]; className: string }) {
  return (
    <Alert className={className}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-inherit">
        <ul className="mt-1 space-y-0.5">
          {tanks.slice(0, 8).map((t) => (
            <li key={t.id}>
              {t.serialNumber} ({TANK_SIZE_LABELS[t.size]}):{" "}
              {[
                ["Visual inspection", t.visualState, t.nextVisualInspection],
                ["Hydrostatic test", t.hydrostaticState, t.nextHydrostaticTest],
              ]
                .filter(([, s]) => s !== "OK")
                .map(([name, s, due]) => (s === "NO_RECORD" ? `${name} date not recorded` : `${name} due ${formatDay(due as string)}`))
                .join(" · ")}
            </li>
          ))}
          {tanks.length > 8 && <li>…and {tanks.length - 8} more (use the test filter below)</li>}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export async function TanksPanel({ params }: { params: Record<string, string | undefined> }) {
  const size = TANK_SIZES.find((s) => s === params.size);
  const test = TEST_FILTERS.find((f) => f.key === params.test)?.key;
  const show = params.show === "retired" || params.show === "all" ? params.show : "active";
  const location = params.location && UUID.test(params.location) ? params.location : undefined;
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
  try {
    [all, locations] = await Promise.all([getTanks(), getLocations(true)]);
  } catch (e) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
        Tanks could not be loaded: {e instanceof Error ? e.message : "unknown error"}
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
          Cylinder tests: a visual inspection every year and a hydrostatic test every five years, counted from the last one.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={withDialog("import")} prefetch={false} scroll={false} />}>
            Import CSV
          </Button>
          <Button nativeButton={false} render={<Link href={withDialog("new")} prefetch={false} scroll={false} />}>
            Add tank
          </Button>
        </div>
      </div>

      {overdue.length > 0 && (
        <TankList
          title={`${overdue.length} tank${overdue.length === 1 ? " is" : "s are"} overdue for testing, or ha${overdue.length === 1 ? "s" : "ve"} no test date on record`}
          tanks={overdue}
          className="border-red-300 bg-red-50 text-red-900"
        />
      )}
      {dueSoon.length > 0 && (
        <TankList
          title={`${dueSoon.length} tank${dueSoon.length === 1 ? " needs" : "s need"} testing within 30 days`}
          tanks={dueSoon}
          className="border-amber-300 bg-amber-50 text-amber-900"
        />
      )}

      <form method="get" action="/dashboard/equipment" className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="tab" value="tanks" />
        <label className="text-sm font-medium text-zinc-700">
          Size
          <select name="size" defaultValue={size ?? ""} className={control}>
            <option value="">All sizes</option>
            {TANK_SIZES.map((s) => (
              <option key={s} value={s}>
                {TANK_SIZE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Tests
          <select name="test" defaultValue={test ?? ""} className={control}>
            <option value="">All tanks</option>
            {TEST_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Location
          <select name="location" defaultValue={location ?? ""} className={control}>
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700">
          Show
          <select name="show" defaultValue={show} className={control}>
            <option value="active">In use</option>
            <option value="retired">Retired</option>
            <option value="all">All</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">Filter</Button>
          {filtered && (
            <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/equipment?tab=tanks" prefetch={false} />}>
              Clear
            </Button>
          )}
        </div>
      </form>

      {tanks.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
          {all.length === 0 ? "No tanks yet. Add one, or import a CSV file." : "No tanks match these filters."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial number</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Visual inspection</TableHead>
                <TableHead>Hydrostatic test</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tanks.map((t) => {
                const retired = t.status === "RETIRED";
                const rowTone = retired ? "" : needsTest(t) ? "bg-red-50/60" : testDueSoon(t) ? "bg-amber-50/60" : "";
                return (
                  <TableRow key={t.id} className={rowTone}>
                    <TableCell className="font-medium">{t.serialNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">{TANK_SIZE_LABELS[t.size]}</TableCell>
                    <TableCell>{t.location?.name ?? <span className="text-zinc-400">—</span>}</TableCell>
                    <TestCell last={t.visualInspectionDate} next={t.nextVisualInspection} state={t.visualState} retired={retired} />
                    <TestCell last={t.hydrostaticTestDate} next={t.nextHydrostaticTest} state={t.hydrostaticState} retired={retired} />
                    <TableCell className={retired ? "text-zinc-500" : ""}>{TANK_STATUS_LABELS[t.status]}</TableCell>
                    <TableCell className="max-w-56 truncate text-zinc-600" title={t.notes ?? undefined}>
                      {t.notes ?? ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start justify-end gap-1">
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={withDialog(t.id)} prefetch={false} scroll={false} />}>
                          Edit
                        </Button>
                        <DeleteTankButton id={t.id} serialNumber={t.serialNumber} />
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
        <RoutedDialog wide closeHref={listHref} title={editing ? `Edit tank ${editing.serialNumber}` : "Add tank"}>
          <TankForm tank={editing ?? null} locations={locations} cancelHref={listHref} />
        </RoutedDialog>
      )}
      {open === "import" && (
        <RoutedDialog wide closeHref={listHref} title="Import tanks from CSV">
          <ImportTanksForm locations={locations} closeHref={listHref} />
        </RoutedDialog>
      )}
    </div>
  );
}
