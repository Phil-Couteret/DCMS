"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  removeBoat,
  removeSite,
  removeUser,
  resetUserPassword,
  saveBoat,
  saveGeneral,
  savePricing,
  saveSite,
  saveUser,
  type SettingsFormState,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import type { Boat, CenterSettings, DiveSite, FunDiveTier, Pricing, User } from "@/lib/api";
import {
  ACTIVITY_PRICE_LABELS,
  BOAT_STATUS_LABELS,
  BOAT_STATUSES,
  EQUIPMENT_PRICE_LABELS,
  MAX_PRICE,
  PASSWORD_MAX,
  PASSWORD_MIN,
  SITE_CERT_LEVELS,
  stringsOnly,
  tempRange,
  USER_ROLE_LABELS,
  USER_ROLES,
} from "@/lib/settings";
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

const REMOVE = { boat: removeBoat, site: removeSite, user: removeUser };

// A delete button with a confirmation, for a boat, a dive site or a user.
export function DeleteButton({ kind, id, name }: { kind: keyof typeof REMOVE; id: string; name: string }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(REMOVE[kind], null);
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

// New password and confirmation fields.
function PasswordFields({ autoFocus }: { autoFocus?: boolean }) {
  return (
    <>
      <label className={label}>
        Password
        <input
          type="password"
          name="password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
          autoFocus={autoFocus}
          className={control}
        />
        <span className="mt-1 block text-xs font-normal text-zinc-500">At least {PASSWORD_MIN} characters.</span>
      </label>
      <label className={label}>
        Confirm password
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
          className={control}
        />
      </label>
    </>
  );
}

// Create (user null) or edit a login account. The email cannot be changed;
// the password is set on create and afterwards with UserPasswordForm. Your
// own role is shown but cannot be changed.
export function UserForm({ user, isSelf, cancelHref }: { user: User | null; isSelf: boolean; cancelHref: string }) {
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveUser, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {user && <input type="hidden" name="userId" value={user.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Name
          <input name="name" maxLength={120} defaultValue={user?.name ?? ""} className={control} />
        </label>
        <label className={label}>
          Email
          {user ? (
            <input value={user.email} readOnly disabled className={`${control} bg-zinc-50 text-zinc-500`} />
          ) : (
            <>
              <input type="email" name="email" required maxLength={254} autoComplete="off" className={control} />
              <span className="mt-1 block text-xs font-normal text-zinc-500">
                Someone who already works at another center gets access here with their existing account and password.
              </span>
            </>
          )}
        </label>
        <label className={label}>
          Role
          <select name="role" required defaultValue={user?.role ?? "INSTRUCTOR"} disabled={isSelf} className={control}>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {USER_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            {isSelf
              ? "You cannot change your own role."
              : "The role in this center. Admins can also manage users. Customers cannot sign in to the backoffice."}
          </span>
        </label>
        {/* A disabled select is not submitted; the action still needs a valid role to check. */}
        {isSelf && <input type="hidden" name="role" value={user!.role} />}
        {user && !isSelf && user.role !== "CUSTOMER" && (
          <label className="flex items-start gap-2 self-center text-sm font-medium text-zinc-700">
            <input type="hidden" name="activeShown" value="1" />
            <input type="checkbox" name="isActive" defaultChecked={user.isActive} className="mt-0.5" />
            <span>
              Access to this center
              <span className="block text-xs font-normal text-zinc-500">
                Unticked, the account cannot sign in here; its other centers are not affected.
              </span>
            </span>
          </label>
        )}
        {!user && <PasswordFields />}
      </div>
      <FormActions pending={pending} state={state} cancelHref={cancelHref} create={!user} />
    </form>
  );
}

// An admin setting another user's (or their own) password, without the old one.
export function UserPasswordForm({ user, cancelHref }: { user: User; cancelHref: string }) {
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(resetUserPassword, null);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-green-700">
          The password for {user.email} has been changed.
        </p>
        <Button nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          Done
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="userId" value={user.id} />
      <PasswordFields autoFocus />
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Set password"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          Cancel
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

const priceInput =
  "block w-28 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500";
const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500";
const thRight = `${th} text-right`;
const td = "px-3 py-2";

// A euro amount field, net of tax.
function PriceField({ name, value, label: aria, optional }: { name: string; value: number | null; label: string; optional?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <input
        name={name}
        aria-label={aria}
        inputMode="decimal"
        required={!optional}
        pattern="\d{1,5}([.,]\d{1,2})?"
        title={`A price from 0 to ${MAX_PRICE}, with at most 2 decimals`}
        placeholder={optional ? "No price" : undefined}
        defaultValue={value === null ? "" : String(value)}
        className={priceInput}
      />
      <span className="text-sm text-zinc-500">€</span>
    </div>
  );
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
      <div>
        <h2 className="font-semibold text-zinc-900">{title}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

let nextTierId = 0;
type TierRow = FunDiveTier & { id: number };

// The whole price list, saved in one go. Instructors see it read-only.
export function PricingForm({ pricing, canEdit }: { pricing: Pricing; canEdit: boolean }) {
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(savePricing, null);
  const [tiers, setTiers] = useState<TierRow[]>(() => pricing.funDiveTiers.map((t) => ({ ...t, id: nextTierId++ })));
  const tax = `${pricing.taxName} (${pricing.taxRate.toLocaleString("en-GB", { maximumFractionDigits: 2 })}%)`;
  const itemsTotal = Object.keys(EQUIPMENT_PRICE_LABELS).reduce(
    (sum, k) => sum + pricing.equipment[k as keyof typeof EQUIPMENT_PRICE_LABELS],
    0,
  );

  const addTier = () => {
    const last = tiers.reduce<TierRow | null>((a, t) => (!a || t.minDives > a.minDives ? t : a), null);
    setTiers([
      ...tiers,
      last
        ? { ...last, minDives: last.minDives + 1, id: nextTierId++ }
        : { minDives: 1, tourist: 0, local: 0, recurrent: 0, id: nextTierId++ },
    ]);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700 ring-1 ring-zinc-200">
        Net prices in euros; {tax} is added on invoices (set in the General tab). A saved change applies to the next
        invoice and to the public site at once. Invoices already issued keep their prices.
        {!canEdit && " Only admins can change prices."}
      </p>
      <fieldset disabled={!canEdit || pending} className="space-y-6">
        <Card title="Activities" description="Per participant. An activity left empty has no price: its bookings cannot be invoiced and the public site hides it.">
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={th}>Activity</th>
                  <th className={thRight}>Net price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(Object.entries(ACTIVITY_PRICE_LABELS) as [keyof typeof ACTIVITY_PRICE_LABELS, string][]).map(([key, name]) => (
                  <tr key={key}>
                    <td className={`${td} font-medium text-zinc-900`}>
                      {name}
                      {key === "funDive" && (
                        <span className="block text-xs font-normal text-zinc-500">
                          Booked and invoiced on its own. Fun dives billed with a stay use the tiers below.
                        </span>
                      )}
                    </td>
                    <td className={td}>
                      <PriceField name={`activity_${key}`} value={pricing.activities[key]} label={`${name} price`} optional />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Rental equipment" description="Per booking, one set.">
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={th}>Item</th>
                  <th className={thRight}>Net price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(Object.entries(EQUIPMENT_PRICE_LABELS) as [keyof typeof EQUIPMENT_PRICE_LABELS, string][]).map(([key, name]) => (
                  <tr key={key}>
                    <td className={`${td} font-medium text-zinc-900`}>{name}</td>
                    <td className={td}>
                      <PriceField name={`equipment_${key}`} value={pricing.equipment[key]} label={`${name} price`} />
                    </td>
                  </tr>
                ))}
                <tr className="bg-sky-50/60">
                  <td className={`${td} font-medium text-zinc-900`}>
                    Full package
                    <span className="block text-xs font-normal text-zinc-500">
                      All five items together, instead of their sum (currently {itemsTotal.toLocaleString("en-GB")} €).
                    </span>
                  </td>
                  <td className={td}>
                    <PriceField name="equipment_fullPackage" value={pricing.equipment.fullPackage} label="Full package price" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Fun dive volume tiers"
          description="When a stay is billed, every fun dive in it is charged the rate of the highest tier its number of fun dives reaches, by customer type. The first tier starts at 1 dive."
        >
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={th}>From dives</th>
                  <th className={thRight}>Tourist</th>
                  <th className={thRight}>Local</th>
                  <th className={thRight}>Recurrent</th>
                  <th className={thRight}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {tiers.map((t, i) => (
                  <tr key={t.id}>
                    <td className={td}>
                      <input
                        name="tierMin"
                        aria-label={`Tier ${i + 1}: from dives`}
                        type="number"
                        required
                        min={1}
                        max={999}
                        step={1}
                        defaultValue={t.minDives}
                        className={`${priceInput} w-20 text-left`}
                      />
                    </td>
                    <td className={td}>
                      <PriceField name="tierTourist" value={t.tourist} label={`Tier ${i + 1}: tourist rate`} />
                    </td>
                    <td className={td}>
                      <PriceField name="tierLocal" value={t.local} label={`Tier ${i + 1}: local rate`} />
                    </td>
                    <td className={td}>
                      <PriceField name="tierRecurrent" value={t.recurrent} label={`Tier ${i + 1}: recurrent rate`} />
                    </td>
                    <td className={`${td} text-right`}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={tiers.length <= 1}
                        onClick={() => setTiers(tiers.filter((x) => x.id !== t.id))}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTier}>
            Add tier
          </Button>
        </Card>
      </fieldset>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save prices"}
          </Button>
          <Status state={state} saved="Prices saved. They apply from the next invoice." />
        </div>
      )}
    </form>
  );
}
