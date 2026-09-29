"use client";

import { useEffect, useRef, useState } from "react";
import { addCrew, saveReport, setPlannedSite } from "@/app/dashboard/dive-prep/actions";
import type { ActionState } from "@/components/action-button";
import { Button } from "@/components/ui/button";
import type { DivePrep, PrepSite, TripListItem, TripRole } from "@/lib/api";
import { ROLES_FOR_TYPE } from "@/lib/dive-prep";
import { ROLE_LABELS } from "@/lib/trips";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

function Feedback({ state }: { state: ActionState }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-xs text-destructive">
        {state.error}
      </p>
    );
  }
  if (state?.message) return <p className="text-xs text-green-700">{state.message}</p>;
  return null;
}

// Adds a crew member. Only staff free in this slot are offered, and each only
// in the roles their type allows; a captain only on a boat that has none.
export function CrewForm({
  tripId,
  staff,
  hasBoat,
  hasCaptain,
}: {
  tripId: string;
  staff: DivePrep["staff"];
  hasBoat: boolean;
  hasCaptain: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction<ActionState>(addCrew, null);
  const form = useRef<HTMLFormElement>(null);
  const rolesFor = (type: keyof typeof ROLES_FOR_TYPE) =>
    ROLES_FOR_TYPE[type].filter((r) => r !== "CAPTAIN" || (hasBoat && !hasCaptain));
  const eligible = staff.filter((s) => s.tripId === null && rolesFor(s.type).length > 0);
  const [staffId, setStaffId] = useState("");
  const roles = rolesFor(eligible.find((s) => s.id === staffId)?.type ?? "ADMIN");
  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      setStaffId("");
    }
  }, [state]);

  if (eligible.length === 0) return <p className="text-xs text-zinc-500">No other staff free in this slot.</p>;
  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-1">
      <input type="hidden" name="tripId" value={tripId} />
      <div className="grid grid-cols-[1fr_9rem_auto] items-end gap-2">
        <label className="sr-only" htmlFor={`crew-${tripId}`}>
          Staff member
        </label>
        <select
          id={`crew-${tripId}`}
          name="staffId"
          required
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className={`${control} mt-0`}
        >
          <option value="" disabled>
            Add crew…
          </option>
          {eligible.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName} ({s.type.toLowerCase()})
            </option>
          ))}
        </select>
        <select name="role" aria-label="Role" key={staffId} defaultValue={roles[0] ?? ""} className={`${control} mt-0`}>
          {roles.map((r: TripRole) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending || !staffId}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function SiteForm({ tripId, sites, current }: { tripId: string; sites: PrepSite[]; current: string | null }) {
  const [state, onSubmit, pending] = useFormAction<ActionState>(setPlannedSite, null);
  return (
    <form onSubmit={onSubmit} className="space-y-1">
      <input type="hidden" name="tripId" value={tripId} />
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor={`site-${tripId}`}>
          Planned site
        </label>
        <select id={`site-${tripId}`} name="siteId" defaultValue={current ?? ""} className={`${control} mt-0`}>
          <option value="">Not decided</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameEn} (difficulty {s.difficultyLevel})
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

// The post-dive report of one trip. An active trip can be completed from
// here; a completed one can still be corrected.
export function ReportForm({ trip, sites }: { trip: TripListItem; sites: PrepSite[] }) {
  const [state, onSubmit, pending] = useFormAction<ActionState>(saveReport, null);
  const actual = trip.actualSiteId ?? trip.plannedSiteId ?? "";
  const [siteId, setSiteId] = useState(actual);
  const planned = trip.plannedSite;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="tripId" value={trip.id} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={`${label} sm:col-span-3`}>
          Actual dive site (official report)
          <select name="actualSiteId" value={siteId} onChange={(e) => setSiteId(e.target.value)} className={control}>
            <option value="">Not recorded</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Entry time
          <input type="time" name="entryTime" defaultValue={trip.entryTime ?? ""} className={control} />
        </label>
        <label className={label}>
          Exit time
          <input type="time" name="exitTime" defaultValue={trip.exitTime ?? ""} className={control} />
        </label>
      </div>
      {planned && siteId && siteId !== planned.id && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
          Planned site was {planned.nameEn}; the report will record {sites.find((s) => s.id === siteId)?.nameEn}.
        </p>
      )}
      <label className={label}>
        Notes for the official record (optional)
        <textarea
          name="reportNotes"
          rows={3}
          maxLength={4000}
          defaultValue={trip.reportNotes ?? ""}
          placeholder="Conditions, changes to the plan, anything the marine authority should know"
          className={control}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {trip.status === "ACTIVE" && (
          <Button type="submit" name="intent" value="complete" disabled={pending}>
            {pending ? "Saving…" : "Confirm & complete dive"}
          </Button>
        )}
        <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>
          {trip.status === "ACTIVE" ? "Save (don't complete)" : "Save report"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      Print / PDF
    </Button>
  );
}
