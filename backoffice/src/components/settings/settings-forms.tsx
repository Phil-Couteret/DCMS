"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  removeBoat,
  removeSite,
  saveBoat,
  saveGeneral,
  saveSite,
  type SettingsFormState,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import type { Boat, CenterSettings, DiveSite } from "@/lib/api";
import { BOAT_STATUS_LABELS, BOAT_STATUSES, SITE_CERT_LEVELS, stringsOnly, tempRange } from "@/lib/settings";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

function Status({ state, saved = "Saved." }: { state: SettingsFormState; saved?: string }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state?.ok) {
    return (
      <p role="status" className="text-sm text-green-700">
        {saved}
      </p>
    );
  }
  return null;
}

export function GeneralForm({ settings }: { settings: CenterSettings }) {
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveGeneral, null);
  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Center name
          <input name="name" required maxLength={120} defaultValue={settings.name} className={control} />
        </label>
        <label className={label}>
          Legal name (optional)
          <input name="legalName" maxLength={160} defaultValue={settings.legalName ?? ""} className={control} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Address
          <textarea name="address" rows={3} maxLength={300} defaultValue={settings.address ?? ""} className={control} />
        </label>
        <label className={label}>
          Phone
          <input type="tel" name="phone" maxLength={40} defaultValue={settings.phone ?? ""} className={control} />
        </label>
        <label className={label}>
          Email
          <input type="email" name="email" maxLength={254} defaultValue={settings.email ?? ""} className={control} />
        </label>
        <label className={label}>
          Website
          <input
            type="url"
            name="website"
            maxLength={300}
            placeholder="https://"
            defaultValue={settings.website ?? ""}
            className={control}
          />
        </label>
      </div>
      <fieldset className="space-y-3 border-t border-zinc-200 pt-4">
        <legend className="pt-4 text-sm font-semibold text-zinc-900">Tax</legend>
        <p className="text-xs text-zinc-500">
          Added to net prices on new invoices. Invoices already issued keep the tax they were created with.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            Tax name
            <input name="taxName" required maxLength={20} defaultValue={settings.taxName} className={control} />
          </label>
          <label className={label}>
            Tax rate (%)
            <input
              type="number"
              name="taxRate"
              required
              min={0}
              max={100}
              step={0.01}
              defaultValue={Number(settings.taxRate)}
              className={control}
            />
          </label>
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

// A delete button with a confirmation, for a boat or a dive site.
export function DeleteButton({ kind, id, name }: { kind: "boat" | "site"; id: string; name: string }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(
    kind === "boat" ? removeBoat : removeSite,
    null,
  );
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Delete ${name}? This cannot be undone.`)) e.preventDefault();
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

function FormActions({ pending, state, cancelHref, create }: { pending: boolean; state: SettingsFormState; cancelHref: string; create: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : create ? "Create" : "Save changes"}
      </Button>
      <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
        Cancel
      </Button>
      <Status state={state} />
    </div>
  );
}

export function BoatForm({ boat, cancelHref }: { boat: Boat | null; cancelHref: string }) {
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveBoat, null);
  // An unknown stored status stays selectable so saving does not change it.
  const statuses = boat && !BOAT_STATUSES.includes(boat.status) ? [...BOAT_STATUSES, boat.status] : BOAT_STATUSES;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {boat && <input type="hidden" name="boatId" value={boat.id} />}
      <input type="hidden" name="status_initial" value={boat?.status ?? ""} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Name
          <input name="name" required maxLength={100} defaultValue={boat?.name} className={control} />
        </label>
        <label className={label}>
          Registration number
          <input name="registrationNumber" required maxLength={60} defaultValue={boat?.registrationNumber} className={control} />
        </label>
        <label className={label}>
          Capacity (divers)
          <input type="number" name="capacity" required min={1} step={1} defaultValue={boat?.capacity ?? 10} className={control} />
        </label>
        <label className={label}>
          Status
          <select name="status" defaultValue={boat?.status ?? "active"} className={control}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {BOAT_STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Length in m (optional)
          <input
            type="number"
            name="length"
            min={0}
            max={999.99}
            step={0.01}
            defaultValue={boat?.length ?? ""}
            className={control}
          />
        </label>
        <label className={label}>
          Engine (optional)
          <input name="engine" maxLength={100} defaultValue={boat?.engine ?? ""} className={control} />
        </label>
        <label className={label}>
          Insurance expiry
          <input type="date" name="insuranceExpiry" defaultValue={boat?.insuranceExpiry?.slice(0, 10) ?? ""} className={control} />
        </label>
        <label className={label}>
          Last service
          <input type="date" name="lastServiceDate" defaultValue={boat?.lastServiceDate?.slice(0, 10) ?? ""} className={control} />
        </label>
        <label className={label}>
          Next service
          <input type="date" name="nextServiceDate" defaultValue={boat?.nextServiceDate?.slice(0, 10) ?? ""} className={control} />
        </label>
      </div>
      <p className="text-xs text-zinc-500">Online bookings are only placed on active boats.</p>
      <FormActions pending={pending} state={state} cancelHref={cancelHref} create={!boat} />
    </form>
  );
}

const TRANSLATIONS = [
  { suffix: "Es", name: "Spanish" },
  { suffix: "De", name: "German" },
  { suffix: "Fr", name: "French" },
] as const;

export function SiteForm({ site, cancelHref }: { site: DiveSite | null; cancelHref: string }) {
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveSite, null);
  const lists = {
    marineLife: stringsOnly(site?.marineLife).join(", "),
    pointsOfInterest: stringsOnly(site?.pointsOfInterest).join(", "),
    bestSeason: stringsOnly(site?.bestSeason).join(", "),
    facilities: stringsOnly(site?.facilities).join(", "),
  };
  const temp = tempRange(site?.waterTempRange);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {site && <input type="hidden" name="siteId" value={site.id} />}
      {Object.entries(lists).map(([key, value]) => (
        <input key={key} type="hidden" name={`${key}_initial`} value={value} />
      ))}
      <input type="hidden" name="temp_initial" value={temp ? `${temp.min}|${temp.max}` : "|"} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Name (English)
          <input name="nameEn" required maxLength={120} defaultValue={site?.nameEn} className={control} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className={label}>
            Latitude
            <input type="number" name="latitude" required min={-90} max={90} step="any" defaultValue={site?.latitude} className={control} />
          </label>
          <label className={label}>
            Longitude
            <input type="number" name="longitude" required min={-180} max={180} step="any" defaultValue={site?.longitude} className={control} />
          </label>
        </div>
        <label className={`${label} sm:col-span-2`}>
          Description (English)
          <textarea name="descriptionEn" required rows={3} maxLength={2000} defaultValue={site?.descriptionEn} className={control} />
        </label>
      </div>

      <details className="rounded-lg p-3 ring-1 ring-zinc-200">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          Translations for the public site (left empty, the English text is used)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TRANSLATIONS.map(({ suffix, name }) => (
            <div key={suffix} className="space-y-2 sm:col-span-2">
              <label className={label}>
                Name ({name})
                <input name={`name${suffix}`} maxLength={120} defaultValue={site?.[`name${suffix}`]} className={control} />
              </label>
              <label className={label}>
                Description ({name})
                <textarea name={`description${suffix}`} rows={2} maxLength={2000} defaultValue={site?.[`description${suffix}`]} className={control} />
              </label>
            </div>
          ))}
        </div>
      </details>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className={label}>
          Min depth (m)
          <input type="number" name="depthMin" required min={0} step={1} defaultValue={site?.depthMin} className={control} />
        </label>
        <label className={label}>
          Max depth (m)
          <input type="number" name="depthMax" required min={0} step={1} defaultValue={site?.depthMax} className={control} />
        </label>
        <label className={label}>
          Certification needed
          <select name="requiredCertLevel" defaultValue={site?.requiredCertLevel ?? 0} className={control}>
            {SITE_CERT_LEVELS.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Difficulty (1–5)
          <select name="difficultyLevel" defaultValue={site?.difficultyLevel ?? 1} className={control}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Travel time (min)
          <input type="number" name="travelTimeMinutes" required min={0} step={1} defaultValue={site?.travelTimeMinutes} className={control} />
        </label>
        <label className={label}>
          Max divers per trip
          <input type="number" name="maxDiversPerTrip" required min={1} step={1} defaultValue={site?.maxDiversPerTrip ?? 10} className={control} />
        </label>
        <label className={label}>
          Visibility (m, optional)
          <input type="number" name="typicalVisibility" min={0} step={1} defaultValue={site?.typicalVisibility ?? ""} className={control} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={label}>
            Water °C min
            <input type="number" name="tempMin" step={1} defaultValue={temp?.min ?? ""} className={control} />
          </label>
          <label className={label}>
            max
            <input type="number" name="tempMax" step={1} defaultValue={temp?.max ?? ""} className={control} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Typical current
          <input name="typicalCurrent" maxLength={100} placeholder="none" defaultValue={site?.typicalCurrent ?? ""} className={control} />
        </label>
        <label className={label}>
          Access
          <input name="accessibility" maxLength={100} placeholder="boat_only" defaultValue={site?.accessibility ?? ""} className={control} />
        </label>
        {(
          [
            ["marineLife", "Marine life"],
            ["pointsOfInterest", "Points of interest"],
            ["bestSeason", "Best season"],
            ["facilities", "Facilities"],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className={label}>
            {text} (comma-separated)
            <input name={key} maxLength={1000} defaultValue={lists[key]} className={control} />
          </label>
        ))}
      </div>
      <FormActions pending={pending} state={state} cancelHref={cancelHref} create={!site} />
    </form>
  );
}
