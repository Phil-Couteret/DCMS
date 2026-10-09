"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importTanksCsv, removeTank, saveTank, type TankFormState, type TankImportState } from "@/app/dashboard/equipment/tank-actions";
import { ImportResultView } from "@/components/import-result";
import { Button } from "@/components/ui/button";
import type { LocationRef, Tank } from "@/lib/api";
import { locationOptions } from "@/lib/locations";
import { interval, TANK_SIZE_LABELS, TANK_SIZES, TANK_STATUS_LABELS } from "@/lib/tanks";
import { useFormAction } from "@/lib/use-form-action";

const label = "block text-sm font-medium text-zinc-700";
const hint = "mt-1 block text-xs font-normal text-zinc-500";
const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

const day = (iso: string | null | undefined) => iso?.slice(0, 10) ?? "";

// Add (tank null) or edit a tank. The dates are when each test was last
// done; the next ones are worked out from them.
export function TankForm({
  tank,
  locations,
  cancelHref,
  intervals,
}: {
  tank: Tank | null;
  locations: LocationRef[];
  cancelHref: string;
  intervals: { visual: number; hydrostatic: number }; // months
}) {
  const [state, onSubmit, pending] = useFormAction<TankFormState>(saveTank, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {tank && <input type="hidden" name="tankId" value={tank.id} />}
      <input type="hidden" name="returnTo" value={cancelHref} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Serial number
          <input name="serialNumber" required maxLength={60} defaultValue={tank?.serialNumber ?? ""} className={control} />
        </label>
        <label className={label}>
          Size
          <select name="size" required defaultValue={tank?.size ?? "12L"} className={control}>
            {TANK_SIZES.map((s) => (
              <option key={s} value={s}>
                {TANK_SIZE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Last visual inspection
          <input type="date" name="visualInspectionDate" defaultValue={day(tank?.visualInspectionDate)} className={control} />
          <span className={hint}>Next one due {interval(intervals.visual)} later.</span>
        </label>
        <label className={label}>
          Last hydrostatic test
          <input type="date" name="hydrostaticTestDate" defaultValue={day(tank?.hydrostaticTestDate)} className={control} />
          <span className={hint}>Next one due {interval(intervals.hydrostatic)} later.</span>
        </label>
        <label className={label}>
          Location
          <select name="locationId" defaultValue={tank?.locationId ?? ""} className={control}>
            <option value="">Not assigned</option>
            {locationOptions(locations, tank?.location ?? null).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Status
          <select name="status" defaultValue={tank?.status ?? "ACTIVE"} className={control}>
            {(["ACTIVE", "RETIRED"] as const).map((s) => (
              <option key={s} value={s}>
                {TANK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className={`${label} sm:col-span-2`}>
          Notes
          <textarea
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={tank?.notes ?? ""}
            placeholder="Net colour, where it is kept, painted dates…"
            className={control}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : tank ? "Save changes" : "Add tank"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          Cancel
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

export function DeleteTankButton({ id, serialNumber }: { id: string; serialNumber: string }) {
  const [state, action, pending] = useActionState<TankFormState, FormData>(removeTank, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Delete tank ${serialNumber}? To keep its record, set it to Retired instead. This cannot be undone.`)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive" disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {state?.error && (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function ImportTanksForm({ locations, closeHref }: { locations: LocationRef[]; closeHref: string }) {
  const [state, onSubmit, pending] = useFormAction<TankImportState>(importTanksCsv, null);
  if (state?.result) {
    return (
      <div className="space-y-4">
        <ImportResultView result={state.result} noun={["tank", "tanks"]} />
        <Button nativeButton={false} render={<Link href={closeHref} prefetch={false} scroll={false} />}>
          Done
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 text-sm">
      <div className="space-y-2 text-zinc-700">
        <p>
          A CSV file with a header row. <strong>serialNumber</strong> and <strong>size</strong> are required; the other columns are
          optional: <span className="font-mono text-xs">visualInspectionDate, hydrostaticTestDate, status, location, notes</span>.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-zinc-600">
          <li>Sizes: 10L, 12L, 15L, Nitrox12L, Nitrox15L (&quot;12&quot; or &quot;Nitrox 15&quot; are understood too).</li>
          <li>Dates are when the test was last done: DD/MM/YYYY or YYYY-MM-DD; empty or &quot;-&quot; when unknown.</li>
          <li>Status: ACTIVE (the default) or RETIRED. Location: a location&apos;s name.</li>
          <li>Tanks whose serial number is already on record are skipped. Commas or semicolons between columns both work.</li>
        </ul>
        <a href="/templates/tanks-import.csv" download className="inline-block font-medium text-[#0077b6] underline">
          Download the template
        </a>
      </div>
      <label className={label}>
        CSV file
        <input type="file" name="file" required accept=".csv,text/csv" className={`${control} file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1`} />
      </label>
      {locations.length > 0 && (
        <label className={label}>
          Location for rows without one
          <select name="locationId" defaultValue="" className={control}>
            <option value="">Not assigned</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={closeHref} prefetch={false} scroll={false} />}>
          Cancel
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
