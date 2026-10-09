"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  removeBoat,
  removeBono,
  saveBono,
  inviteStaffAction,
  removeLocation,
  saveLocation,
  assignLocation,
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
import { LANGUAGE_LABELS, LANGUAGES } from "@/lib/customers";
import { money } from "@/lib/billing";
import type { Bono, Boat, CenterSettings, DiveSite, FunDiveTier, InsuranceOptionData, Location, LocationRef, Pricing, User } from "@/lib/api";
import { LOCATION_TYPE_LABELS, LOCATION_TYPES, locationOptions } from "@/lib/locations";
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
import { interval } from "@/lib/tanks";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

function Status({ state, saved }: { state: SettingsFormState; saved?: string }) {
  const t = useT();
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
        {saved ?? t("Saved.")}
      </p>
    );
  }
  return null;
}

export function GeneralForm({
  settings,
  isAdmin,
  timeZones,
  currencies,
}: {
  settings: CenterSettings;
  isAdmin: boolean;
  timeZones: string[];
  currencies: string[];
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveGeneral, null);
  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Center name")}
          <input name="name" required maxLength={120} defaultValue={settings.name} className={control} />
        </label>
        <label className={label}>
          {t("Legal name (optional)")}
          <input name="legalName" maxLength={160} defaultValue={settings.legalName ?? ""} className={control} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          {t("Address")}
          <textarea name="address" rows={3} maxLength={300} defaultValue={settings.address ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Phone")}
          <input type="tel" name="phone" maxLength={40} defaultValue={settings.phone ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Email")}
          <input type="email" name="email" maxLength={254} defaultValue={settings.email ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Website")}
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
        <legend className="pt-4 text-sm font-semibold text-zinc-900">{t("Tax")}</legend>
        <p className="text-xs text-zinc-500">
          {t("Added to net prices on new invoices. Invoices already issued keep the tax they were created with.")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("Tax name")}
            <input name="taxName" required maxLength={20} defaultValue={settings.taxName} className={control} />
          </label>
          <label className={label}>
            {t("Tax rate (%)")}
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
      {isAdmin ? (
        <CenterAdminFields settings={settings} timeZones={timeZones} currencies={currencies} />
      ) : (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 border-t border-zinc-200 pt-4 text-sm sm:grid-cols-2">
          <ReadOnly label={t("Time zone")} value={settings.timeZone} />
          <ReadOnly label={t("Currency")} value={settings.currency} />
          <ReadOnly
            label={t("Default language")}
            value={LANGUAGE_LABELS[settings.defaultLanguage] ? t(LANGUAGE_LABELS[settings.defaultLanguage]) : settings.defaultLanguage}
          />
          <ReadOnly
            label={t("Invoice numbers")}
            value={t("{prefix}-YYYY-0001 · partners {partnerPrefix}-YYYY-0001", {
              prefix: settings.invoicePrefix,
              partnerPrefix: settings.partnerInvoicePrefix,
            })}
          />
          <ReadOnly
            label={t("Tank tests")}
            value={t("visual every {visual} · hydrostatic every {hydrostatic}", {
              visual: interval(settings.visualInspectionIntervalMonths, t),
              hydrostatic: interval(settings.hydrostaticTestIntervalMonths, t),
            })}
          />
          <p className="text-xs text-zinc-500 sm:col-span-2">{t("Only an admin can change these, and the branding.")}</p>
        </dl>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : t("Save")}
        </Button>
        <Status state={state} />
      </div>
    </form>
  );
}

function ReadOnly({ label: name, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500">{name}</dt>
      <dd className="font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

// A colour picker that can also be left unset (the site's default colour).
function ColourField({ name, title, toggle, value }: { name: string; title: string; toggle: string; value: string | null }) {
  const [on, setOn] = useState(value !== null);
  return (
    <div className={label}>
      <span className="flex items-center gap-2">
        <input type="checkbox" name={`${name}On`} checked={on} onChange={(e) => setOn(e.target.checked)} aria-label={toggle} />
        {title}
      </span>
      <input type="color" name={name} defaultValue={value ?? "#0077b6"} disabled={!on} aria-label={title} className="mt-1 h-9 w-20 rounded-md border border-zinc-300 disabled:opacity-40" />
    </div>
  );
}

// Admins: the center's time zone, currency and language, the public site's
// branding, and the invoice number prefixes.
function CenterAdminFields({
  settings,
  timeZones,
  currencies,
}: {
  settings: CenterSettings;
  timeZones: string[];
  currencies: string[];
}) {
  const t = useT();
  const zones = timeZones.includes(settings.timeZone) ? timeZones : [settings.timeZone, ...timeZones];
  return (
    <>
      <fieldset className="space-y-3 border-t border-zinc-200 pt-4">
        <legend className="pt-4 text-sm font-semibold text-zinc-900">{t("Region")}</legend>
        <p className="text-xs text-zinc-500">
          {t(
            'The time zone sets the center\'s days (closing a day, "today", invoice years) and the times staff enter. The currency applies to prices and new invoices; invoices already issued keep theirs.',
          )}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            {t("Time zone")}
            <select name="timeZone" defaultValue={settings.timeZone} className={control}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("Currency")}
            <select name="currency" defaultValue={settings.currency} className={control}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("Default language")}
            <select name="defaultLanguage" defaultValue={settings.defaultLanguage} className={control}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {t(l.label)}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-zinc-500">{t("For new customers and the public site.")}</span>
          </label>
        </div>
      </fieldset>
      <fieldset className="space-y-3 border-t border-zinc-200 pt-4">
        <legend className="pt-4 text-sm font-semibold text-zinc-900">{t("Public site branding")}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={`${label} sm:col-span-3`}>
            {t("Logo URL (optional)")}
            <input type="url" name="logoUrl" maxLength={500} placeholder="https://" defaultValue={settings.logoUrl ?? ""} className={control} />
          </label>
          <ColourField name="primaryColor" title={t("Main colour")} toggle={t("Use a main colour")} value={settings.primaryColor} />
          <ColourField name="accentColor" title={t("Accent colour")} toggle={t("Use an accent colour")} value={settings.accentColor} />
        </div>
      </fieldset>
      <fieldset className="space-y-3 border-t border-zinc-200 pt-4">
        <legend className="pt-4 text-sm font-semibold text-zinc-900">{t("Invoice numbers")}</legend>
        <p className="text-xs text-zinc-500">
          {t(
            "Each series runs PREFIX-YEAR-0001, 0002… without gaps, and starts again each year. A new prefix applies to the next invoice; the count continues.",
          )}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("Customer invoices")}
            <input name="invoicePrefix" required maxLength={10} pattern="[A-Za-z0-9]{1,10}" defaultValue={settings.invoicePrefix} className={`${control} uppercase`} />
          </label>
          <label className={label}>
            {t("Partner invoices")}
            <input name="partnerInvoicePrefix" required maxLength={10} pattern="[A-Za-z0-9]{1,10}" defaultValue={settings.partnerInvoicePrefix} className={`${control} uppercase`} />
          </label>
        </div>
      </fieldset>
      <fieldset className="space-y-3 border-t border-zinc-200 pt-4">
        <legend className="pt-4 text-sm font-semibold text-zinc-900">{t("Tank tests")}</legend>
        <p className="text-xs text-zinc-500">
          {t("How long after its last test each cylinder test falls due (Equipment → Tanks). Follow the rules where the center operates.")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("Visual inspection every (months)")}
            <input
              type="number"
              name="visualInspectionIntervalMonths"
              required
              min={1}
              max={120}
              step={1}
              defaultValue={settings.visualInspectionIntervalMonths}
              className={control}
            />
          </label>
          <label className={label}>
            {t("Hydrostatic test every (months)")}
            <input
              type="number"
              name="hydrostaticTestIntervalMonths"
              required
              min={1}
              max={120}
              step={1}
              defaultValue={settings.hydrostaticTestIntervalMonths}
              className={control}
            />
          </label>
        </div>
      </fieldset>
    </>
  );
}

const REMOVE = { boat: removeBoat, site: removeSite, user: removeUser, location: removeLocation, bono: removeBono };

// A delete button with a confirmation, for a boat, a dive site or a user.
export function DeleteButton({
  kind,
  id,
  name,
  confirmText,
}: {
  kind: keyof typeof REMOVE;
  id: string;
  name: string;
  confirmText?: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(REMOVE[kind], null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText ?? t("Delete {name}? This cannot be undone.", { name }))) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive" disabled={pending}>
        {pending ? t("Deleting…") : t("Delete")}
      </Button>
      {state?.error && (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

function FormActions({
  pending,
  state,
  cancelHref,
  create,
  submitLabel,
}: {
  pending: boolean;
  state: SettingsFormState;
  cancelHref: string;
  create: boolean;
  submitLabel?: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <Button type="submit" disabled={pending}>
        {pending ? t("Saving…") : (submitLabel ?? (create ? t("Create") : t("Save changes")))}
      </Button>
      <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
        {t("Cancel")}
      </Button>
      <Status state={state} />
    </div>
  );
}

export function BoatForm({
  boat,
  cancelHref,
  locations,
}: {
  boat: Boat | null;
  cancelHref: string;
  locations: LocationRef[];
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveBoat, null);
  // An unknown stored status stays selectable so saving does not change it.
  const statuses = boat && !BOAT_STATUSES.includes(boat.status) ? [...BOAT_STATUSES, boat.status] : BOAT_STATUSES;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {boat && <input type="hidden" name="boatId" value={boat.id} />}
      <input type="hidden" name="status_initial" value={boat?.status ?? ""} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Name")}
          <input name="name" required maxLength={100} defaultValue={boat?.name} className={control} />
        </label>
        <label className={label}>
          {t("Registration number")}
          <input name="registrationNumber" required maxLength={60} defaultValue={boat?.registrationNumber} className={control} />
        </label>
        <label className={label}>
          {t("Capacity (divers)")}
          <input type="number" name="capacity" required min={1} step={1} defaultValue={boat?.capacity ?? 10} className={control} />
        </label>
        <label className={label}>
          {t("Location")}
          <select name="locationId" defaultValue={boat?.locationId ?? ""} className={control}>
            <option value="">{t("Not assigned")}</option>
            {locationOptions(locations, boat?.location ?? null).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Status")}
          <select name="status" defaultValue={boat?.status ?? "active"} className={control}>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {BOAT_STATUS_LABELS[s] ? t(BOAT_STATUS_LABELS[s]) : s}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Length in m (optional)")}
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
          {t("Engine (optional)")}
          <input name="engine" maxLength={100} defaultValue={boat?.engine ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Insurance expiry")}
          <input type="date" name="insuranceExpiry" defaultValue={boat?.insuranceExpiry?.slice(0, 10) ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Last service")}
          <input type="date" name="lastServiceDate" defaultValue={boat?.lastServiceDate?.slice(0, 10) ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Next service")}
          <input type="date" name="nextServiceDate" defaultValue={boat?.nextServiceDate?.slice(0, 10) ?? ""} className={control} />
        </label>
      </div>
      <p className="text-xs text-zinc-500">{t("Online bookings are only placed on active boats.")}</p>
      <FormActions pending={pending} state={state} cancelHref={cancelHref} create={!boat} />
    </form>
  );
}

const TRANSLATIONS = [
  { suffix: "Es", nameLabel: "Name (Spanish)", descriptionLabel: "Description (Spanish)" },
  { suffix: "De", nameLabel: "Name (German)", descriptionLabel: "Description (German)" },
  { suffix: "Fr", nameLabel: "Name (French)", descriptionLabel: "Description (French)" },
] as const;

export function SiteForm({
  site,
  cancelHref,
  locations,
}: {
  site: DiveSite | null;
  cancelHref: string;
  locations: LocationRef[];
}) {
  const t = useT();
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
          {t("Name (English)")}
          <input name="nameEn" required maxLength={120} defaultValue={site?.nameEn} className={control} />
        </label>
        <label className={label}>
          {t("Location")}
          <select name="locationId" defaultValue={site?.locationId ?? ""} className={control}>
            <option value="">{t("Not assigned")}</option>
            {locationOptions(locations, site?.location ?? null).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className={label}>
            {t("Latitude")}
            <input type="number" name="latitude" required min={-90} max={90} step="any" defaultValue={site?.latitude} className={control} />
          </label>
          <label className={label}>
            {t("Longitude")}
            <input type="number" name="longitude" required min={-180} max={180} step="any" defaultValue={site?.longitude} className={control} />
          </label>
        </div>
        <label className={`${label} sm:col-span-2`}>
          {t("Description (English)")}
          <textarea name="descriptionEn" required rows={3} maxLength={2000} defaultValue={site?.descriptionEn} className={control} />
        </label>
      </div>

      <details className="rounded-lg p-3 ring-1 ring-zinc-200">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          {t("Translations for the public site (left empty, the English text is used)")}
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TRANSLATIONS.map(({ suffix, nameLabel, descriptionLabel }) => (
            <div key={suffix} className="space-y-2 sm:col-span-2">
              <label className={label}>
                {t(nameLabel)}
                <input name={`name${suffix}`} maxLength={120} defaultValue={site?.[`name${suffix}`]} className={control} />
              </label>
              <label className={label}>
                {t(descriptionLabel)}
                <textarea name={`description${suffix}`} rows={2} maxLength={2000} defaultValue={site?.[`description${suffix}`]} className={control} />
              </label>
            </div>
          ))}
        </div>
      </details>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className={label}>
          {t("Min depth (m)")}
          <input type="number" name="depthMin" required min={0} step={1} defaultValue={site?.depthMin} className={control} />
        </label>
        <label className={label}>
          {t("Max depth (m)")}
          <input type="number" name="depthMax" required min={0} step={1} defaultValue={site?.depthMax} className={control} />
        </label>
        <label className={label}>
          {t("Certification needed")}
          <select name="requiredCertLevel" defaultValue={site?.requiredCertLevel ?? 0} className={control}>
            {SITE_CERT_LEVELS.map((name, i) => (
              <option key={name} value={i}>
                {t(name)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Difficulty (1–5)")}
          <select name="difficultyLevel" defaultValue={site?.difficultyLevel ?? 1} className={control}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Travel time (min)")}
          <input type="number" name="travelTimeMinutes" required min={0} step={1} defaultValue={site?.travelTimeMinutes} className={control} />
        </label>
        <label className={label}>
          {t("Max divers per trip")}
          <input type="number" name="maxDiversPerTrip" required min={1} step={1} defaultValue={site?.maxDiversPerTrip ?? 10} className={control} />
        </label>
        <label className={label}>
          {t("Visibility (m, optional)")}
          <input type="number" name="typicalVisibility" min={0} step={1} defaultValue={site?.typicalVisibility ?? ""} className={control} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={label}>
            {t("Water °C min")}
            <input type="number" name="tempMin" step={1} defaultValue={temp?.min ?? ""} className={control} />
          </label>
          <label className={label}>
            {t("max")}
            <input type="number" name="tempMax" step={1} defaultValue={temp?.max ?? ""} className={control} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Typical current")}
          <input name="typicalCurrent" maxLength={100} placeholder="none" defaultValue={site?.typicalCurrent ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Access")}
          <input name="accessibility" maxLength={100} placeholder="boat_only" defaultValue={site?.accessibility ?? ""} className={control} />
        </label>
        <label className="flex items-start gap-2 self-center text-sm font-medium text-zinc-700">
          <input type="checkbox" name="isShore" defaultChecked={site?.isShore ?? false} className="mt-0.5 size-4" />
          <span>
            {t("Shore dive site")}
            <span className="block text-xs font-normal text-zinc-500">
              {t("A beach, harbour or pool: shore sessions (discovery dives, courses) take place here, with no boat.")}
            </span>
          </span>
        </label>
        {(
          [
            ["marineLife", "Marine life (comma-separated)"],
            ["pointsOfInterest", "Points of interest (comma-separated)"],
            ["bestSeason", "Best season (comma-separated)"],
            ["facilities", "Facilities (comma-separated)"],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className={label}>
            {t(text)}
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
  const t = useT();
  return (
    <>
      <label className={label}>
        {t("Password")}
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
        <span className="mt-1 block text-xs font-normal text-zinc-500">{t("At least {count} characters.", { count: PASSWORD_MIN })}</span>
      </label>
      <label className={label}>
        {t("Confirm password")}
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
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveUser, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {user && <input type="hidden" name="userId" value={user.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Name")}
          <input name="name" maxLength={120} defaultValue={user?.name ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Email")}
          {user ? (
            <input value={user.email} readOnly disabled className={`${control} bg-zinc-50 text-zinc-500`} />
          ) : (
            <>
              <input type="email" name="email" required maxLength={254} autoComplete="off" className={control} />
              <span className="mt-1 block text-xs font-normal text-zinc-500">
                {t("Someone who already works at another center gets access here with their existing account and password.")}
              </span>
            </>
          )}
        </label>
        <label className={label}>
          {t("Role")}
          <select name="role" required defaultValue={user?.role ?? "INSTRUCTOR"} disabled={isSelf} className={control}>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(USER_ROLE_LABELS[r])}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            {isSelf
              ? t("You cannot change your own role.")
              : t("The role in this center. Admins can also manage users. Customers cannot sign in to the backoffice.")}
          </span>
        </label>
        {/* A disabled select is not submitted; the action still needs a valid role to check. */}
        {isSelf && <input type="hidden" name="role" value={user!.role} />}
        {user && !isSelf && user.role !== "CUSTOMER" && (
          <label className="flex items-start gap-2 self-center text-sm font-medium text-zinc-700">
            <input type="hidden" name="activeShown" value="1" />
            <input type="checkbox" name="isActive" defaultChecked={user.isActive} className="mt-0.5" />
            <span>
              {t("Access to this center")}
              <span className="block text-xs font-normal text-zinc-500">
                {t("Unticked, the account cannot sign in here; its other centers are not affected.")}
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
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(resetUserPassword, null);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-green-700">
          {t("The password for {email} has been changed.", { email: user.email })}
        </p>
        <Button nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          {t("Done")}
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
          {pending ? t("Saving…") : t("Set password")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          {t("Cancel")}
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
function PriceField({
  name,
  value,
  label: aria,
  optional,
  currency,
}: {
  name: string;
  value: number | null;
  label: string;
  optional?: boolean;
  currency: string;
}) {
  const t = useT();
  return (
    <div className="flex items-center justify-end gap-1.5">
      <input
        name={name}
        aria-label={aria}
        inputMode="decimal"
        required={!optional}
        pattern="\d{1,5}([.,]\d{1,2})?"
        title={t("A price from 0 to {max}, with at most 2 decimals", { max: MAX_PRICE })}
        placeholder={optional ? t("No price") : undefined}
        defaultValue={value === null ? "" : String(value)}
        className={priceInput}
      />
      <span className="text-sm text-zinc-500">{currency}</span>
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
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(savePricing, null);
  const [tiers, setTiers] = useState<TierRow[]>(() => pricing.funDiveTiers.map((t) => ({ ...t, id: nextTierId++ })));
  const [packs, setPacks] = useState(() => pricing.divePacks.map((p) => ({ ...p, id: nextTierId++ })));
  // Insurance periods: id is the saved period's (kept when renamed), key the row's.
  const [periods, setPeriods] = useState<(InsuranceOptionData & { key: number })[]>(() =>
    pricing.insurance.map((p) => ({ ...p, key: nextTierId++ })),
  )
  const funDive = pricing.activities.funDive;
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
        {t(
          "Net prices in euros; {tax} is added on invoices (set in the General tab). A saved change applies to the next invoice and to the public site at once. Invoices already issued keep their prices.",
          { tax },
        )}
        {!canEdit && ` ${t("Only admins can change prices.")}`}
      </p>
      <fieldset disabled={!canEdit || pending} className="space-y-6">
        <Card
          title={t("Activities")}
          description={t("Per participant. An activity left empty has no price: its bookings cannot be invoiced and the public site hides it.")}
        >
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={th}>{t("Activity")}</th>
                  <th className={thRight}>{t("Net price")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(Object.entries(ACTIVITY_PRICE_LABELS) as [keyof typeof ACTIVITY_PRICE_LABELS, string][]).map(([key, name]) => (
                  <tr key={key}>
                    <td className={`${td} font-medium text-zinc-900`}>
                      {t(name)}
                      {key === "funDive" && (
                        <span className="block text-xs font-normal text-zinc-500">
                          {t("Booked and invoiced on its own. Fun dives billed with a stay use the tiers below.")}
                        </span>
                      )}
                    </td>
                    <td className={td}>
                      <PriceField currency={pricing.currency} name={`activity_${key}`} value={pricing.activities[key]} label={t("{item} price", { item: t(name) })} optional />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t("Rental equipment")} description={t("Per booking, one set.")}>
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={th}>{t("Item")}</th>
                  <th className={thRight}>{t("Net price")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(Object.entries(EQUIPMENT_PRICE_LABELS) as [keyof typeof EQUIPMENT_PRICE_LABELS, string][]).map(([key, name]) => (
                  <tr key={key}>
                    <td className={`${td} font-medium text-zinc-900`}>{t(name)}</td>
                    <td className={td}>
                      <PriceField currency={pricing.currency} name={`equipment_${key}`} value={pricing.equipment[key]} label={t("{item} price", { item: t(name) })} />
                    </td>
                  </tr>
                ))}
                <tr className="bg-sky-50/60">
                  <td className={`${td} font-medium text-zinc-900`}>
                    {t("Full package")}
                    <span className="block text-xs font-normal text-zinc-500">
                      {t("All five items together, instead of their sum (currently {amount}).", { amount: money(itemsTotal, pricing.currency) })}
                    </span>
                  </td>
                  <td className={td}>
                    <PriceField currency={pricing.currency} name="equipment_fullPackage" value={pricing.equipment.fullPackage} label={t("Full package price")} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title={t("Fun dive volume tiers")}
          description={t(
            "When a stay is billed, every fun dive in it is charged the rate of the highest tier its number of fun dives reaches, by customer type. The first tier starts at 1 dive.",
          )}
        >
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={th}>{t("From dives")}</th>
                  <th className={thRight}>{t("Tourist")}</th>
                  <th className={thRight}>{t("Local")}</th>
                  <th className={thRight}>{t("Recurrent")}</th>
                  <th className={thRight}>
                    <span className="sr-only">{t("Actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {tiers.map((tier, i) => (
                  <tr key={tier.id}>
                    <td className={td}>
                      <input
                        name="tierMin"
                        aria-label={t("Tier {n}: from dives", { n: i + 1 })}
                        type="number"
                        required
                        min={1}
                        max={999}
                        step={1}
                        defaultValue={tier.minDives}
                        className={`${priceInput} w-20 text-left`}
                      />
                    </td>
                    <td className={td}>
                      <PriceField currency={pricing.currency} name="tierTourist" value={tier.tourist} label={t("Tier {n}: tourist rate", { n: i + 1 })} />
                    </td>
                    <td className={td}>
                      <PriceField currency={pricing.currency} name="tierLocal" value={tier.local} label={t("Tier {n}: local rate", { n: i + 1 })} />
                    </td>
                    <td className={td}>
                      <PriceField currency={pricing.currency} name="tierRecurrent" value={tier.recurrent} label={t("Tier {n}: recurrent rate", { n: i + 1 })} />
                    </td>
                    <td className={`${td} text-right`}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={tiers.length <= 1}
                        onClick={() => setTiers(tiers.filter((x) => x.id !== tier.id))}
                      >
                        {t("Remove")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTier}>
            {t("Add tier")}
          </Button>
        </Card>

        <Card
          title={t("Dive packs")}
          description={t(
            "A fixed price for a number of fun dives, per diver. When a stay's own fun dives come to exactly a pack, billing the stay offers the pack price instead of the volume rate. The public site lists the packs.",
          )}
        >
          {packs.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("No packs. Add one, for example 10 dives.")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className={th}>{t("Dives")}</th>
                    <th className={thRight}>{t("Pack price")}</th>
                    <th className={thRight}>{t("Per dive")}</th>
                    <th className={thRight}>
                      <span className="sr-only">{t("Actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {packs.map((p, i) => (
                    <tr key={p.id}>
                      <td className={td}>
                        <input
                          name="packDives"
                          aria-label={t("Pack {n}: number of dives", { n: i + 1 })}
                          type="number"
                          required
                          min={2}
                          max={100}
                          step={1}
                          defaultValue={p.diveCount}
                          className={`${priceInput} w-20 text-left`}
                        />
                      </td>
                      <td className={td}>
                        <PriceField currency={pricing.currency} name="packPrice" value={p.price} label={t("Pack {n}: price", { n: i + 1 })} />
                      </td>
                      <td className={`${td} text-right tabular-nums text-zinc-500`}>
                        {money(p.price / p.diveCount, pricing.currency)}
                        {funDive !== null && p.price < funDive * p.diveCount && (
                          <span className="block text-xs text-emerald-700">
                            {t("saves {amount} on single fun dives", { amount: money(funDive * p.diveCount - p.price, pricing.currency) })}
                          </span>
                        )}
                      </td>
                      <td className={`${td} text-right`}>
                        <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setPacks(packs.filter((x) => x.id !== p.id))}>
                          {t("Remove")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={packs.length >= 10}
            onClick={() => {
              const most = packs.reduce((n, p) => Math.max(n, p.diveCount), 0);
              setPacks([...packs, { diveCount: most ? most + 5 : 5, price: 0, id: nextTierId++ }]);
            }}
          >
            {t("Add pack")}
          </Button>
        </Card>

        <Card title={t("Add-ons")} description={t("Ticked on a booking and billed with it, outside any government bono discount.")}>
          <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className={th}>{t("Add-on")}</th>
                  <th className={thRight}>{t("Net price")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                <tr>
                  <td className={`${td} font-medium text-zinc-900`}>
                    {t("Night dive surcharge")}
                    <span className="block text-xs font-normal text-zinc-500">{t("Per diver.")}</span>
                  </td>
                  <td className={td}>
                    <PriceField currency={pricing.currency} name="addOn_nightDive" value={pricing.addOns.nightDive} label={t("Night dive surcharge")} />
                  </td>
                </tr>
                <tr>
                  <td className={`${td} font-medium text-zinc-900`}>
                    {t("Personal instructor")}
                    <span className="block text-xs font-normal text-zinc-500">{t("Per booking.")}</span>
                  </td>
                  <td className={td}>
                    <PriceField
                      currency={pricing.currency}
                      name="addOn_personalInstructor"
                      value={pricing.addOns.personalInstructor}
                      label={t("Personal instructor fee")}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title={t("Dive insurance")}
          description={t(
            "The periods of cover sold with a stay. On the Stays page, staff choose one for a diver with no insurance and no signed waiver; the shortest period covering the stay's diving days is suggested.",
          )}
        >
          {periods.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("No insurance periods: the Stays page cannot offer insurance. Add one, for example 1 week.")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className={th}>{t("Name")}</th>
                    <th className={th}>{t("Days covered")}</th>
                    <th className={thRight}>{t("Net price")}</th>
                    <th className={thRight}>
                      <span className="sr-only">{t("Actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {periods.map((p, i) => (
                    <tr key={p.key}>
                      <td className={td}>
                        <input type="hidden" name="insId" value={p.id ?? ""} />
                        <input
                          name="insName"
                          aria-label={t("Insurance period {n}: name", { n: i + 1 })}
                          required
                          maxLength={40}
                          placeholder={t("e.g. 2 weeks")}
                          defaultValue={p.name}
                          className={`${priceInput} w-36 text-left`}
                        />
                      </td>
                      <td className={td}>
                        <input
                          name="insDays"
                          aria-label={t("Insurance period {n}: days covered", { n: i + 1 })}
                          type="number"
                          required
                          min={1}
                          max={3660}
                          step={1}
                          defaultValue={p.days}
                          className={`${priceInput} w-24 text-left`}
                        />
                      </td>
                      <td className={td}>
                        <PriceField currency={pricing.currency} name="insPrice" value={p.price} label={t("Insurance period {n}: price", { n: i + 1 })} />
                      </td>
                      <td className={`${td} text-right`}>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setPeriods(periods.filter((x) => x.key !== p.key))}
                        >
                          {t("Remove")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={periods.length >= 20}
            onClick={() => setPeriods([...periods, { name: "", days: 7, price: 0, key: nextTierId++ }])}
          >
            {t("Add period")}
          </Button>
        </Card>
      </fieldset>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? t("Saving…") : t("Save prices")}
          </Button>
          <Status state={state} saved={t("Prices saved. They apply from the next invoice.")} />
        </div>
      )}
    </form>
  );
}

// Create (location null) or edit a location: its activity type, address and
// contact details. Inactive locations are left out of selection lists.
export function LocationForm({ location, cancelHref }: { location: Location | null; cancelHref: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveLocation, null);
  const a = location?.address ?? {};
  const c = location?.contactInfo ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {location && <input type="hidden" name="locationId" value={location.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Location name")}
          <input name="name" required maxLength={120} defaultValue={location?.name ?? ""} className={control} />
          <span className="mt-1 block text-xs font-normal text-zinc-500">{t("For example Caleta de Fuste, Las Playitas.")}</span>
        </label>
        <label className={label}>
          {t("Activity type")}
          <select name="type" defaultValue={location?.type ?? "DIVING"} className={control}>
            {LOCATION_TYPES.map((x) => (
              <option key={x} value={x}>
                {t(LOCATION_TYPE_LABELS[x])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-zinc-900">{t("Address")}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>
            {t("Street")}
            <input name="street" maxLength={200} defaultValue={a.street ?? ""} className={control} />
          </label>
          <label className={label}>
            {t("City")}
            <input name="city" maxLength={100} defaultValue={a.city ?? ""} className={control} />
          </label>
          <label className={label}>
            {t("Postal code")}
            <input name="postalCode" maxLength={20} defaultValue={a.postalCode ?? ""} className={control} />
          </label>
          <label className={label}>
            {t("Country")}
            <input name="country" maxLength={100} defaultValue={a.country ?? ""} className={control} />
          </label>
        </div>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-zinc-900">{t("Contact")}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("Phone")}
            <input type="tel" name="phone" maxLength={40} defaultValue={c.phone ?? ""} className={control} />
          </label>
          <label className={label}>
            {t("Mobile")}
            <input type="tel" name="mobile" maxLength={40} defaultValue={c.mobile ?? ""} className={control} />
          </label>
          <label className={label}>
            {t("Email")}
            <input type="email" name="email" maxLength={254} defaultValue={c.email ?? ""} className={control} />
          </label>
          <label className={label}>
            {t("Website")}
            <input type="url" name="website" maxLength={300} placeholder="https://" defaultValue={c.website ?? ""} className={control} />
          </label>
        </div>
      </fieldset>
      <label className="flex items-start gap-2 text-sm font-medium text-zinc-700">
        <input type="checkbox" name="isActive" defaultChecked={location?.isActive ?? true} className="mt-0.5" />
        <span>
          {t("Active location")}
          <span className="block text-xs font-normal text-zinc-500">{t("Inactive locations are hidden from selection lists.")}</span>
        </span>
      </label>
      <FormActions pending={pending} state={state} cancelHref={cancelHref} create={!location} />
    </form>
  );
}

// The location selector on a boat's or dive site's row: saves on change.
export function LocationSelect({
  kind,
  id,
  name,
  current,
  locations,
}: {
  kind: "boat" | "site";
  id: string;
  name: string;
  current: LocationRef | null;
  locations: LocationRef[];
}) {
  const t = useT();
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(assignLocation, null);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <select
        name="locationId"
        aria-label={t("Location of {name}", { name })}
        defaultValue={current?.id ?? ""}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-zinc-900 disabled:opacity-60"
      >
        <option value="">{t("Not assigned")}</option>
        {locationOptions(locations, current).map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {state?.error && (
        <p role="alert" className="max-w-48 text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

// A government bono: a code staff enter on bookings, and its discount.
export function BonoForm({ bono, currency, cancelHref }: { bono: Bono | null; currency: string; cancelHref: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(saveBono, null);
  const [type, setType] = useState(bono?.type ?? "PERCENTAGE");
  const used = bono?.usageCount ?? 0;
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {bono && <input type="hidden" name="bonoId" value={bono.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Code")}
          <input
            name="code"
            required
            maxLength={40}
            pattern="[A-Za-z0-9][A-Za-z0-9\-]{1,39}"
            title={t("Letters, digits and dashes")}
            autoComplete="off"
            defaultValue={bono?.code ?? ""}
            className={`${control} font-mono uppercase`}
          />
          <span className="mt-1 block text-xs font-normal text-zinc-500">{t("What staff enter on a booking, for example BONO-2026.")}</span>
        </label>
        <label className={label}>
          {t("Description")}
          <input name="description" required maxLength={200} defaultValue={bono?.description ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Discount")}
          <select name="type" value={type} onChange={(e) => setType(e.target.value as Bono["type"])} className={control}>
            <option value="PERCENTAGE">{t("Percentage of the activity")}</option>
            <option value="FIXED">{t("Fixed amount off the activity")}</option>
          </select>
        </label>
        <label className={label}>
          {type === "PERCENTAGE" ? t("Percentage") : t("Amount ({currency})", { currency })}
          <input
            type="number"
            name="discountValue"
            required
            min={0.01}
            max={type === "PERCENTAGE" ? 100 : MAX_PRICE}
            step={0.01}
            defaultValue={bono ? Number(bono.discountValue) : ""}
            className={control}
          />
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            {type === "PERCENTAGE" ? t("Off the activity price, before tax.") : t("Off the activity price, before tax, up to the whole of it.")}
          </span>
        </label>
        <label className={label}>
          {t("Valid from")}
          <input type="date" name="validFrom" required defaultValue={bono?.validFrom.slice(0, 10) ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Valid to")}
          <input type="date" name="validTo" defaultValue={bono?.validTo?.slice(0, 10) ?? ""} className={control} />
          <span className="mt-1 block text-xs font-normal text-zinc-500">{t("The booking's date must fall in this period. Empty: no end.")}</span>
        </label>
        <label className={label}>
          {t("Usage limit")}
          <input
            type="number"
            name="usageLimit"
            min={Math.max(1, used)}
            step={1}
            defaultValue={bono?.usageLimit ?? ""}
            placeholder={t("No limit")}
            className={control}
          />
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            {bono
              ? t("Uses are counted when a booking is invoiced; {count} so far.", { count: used })
              : t("Uses are counted when a booking is invoiced.")}
          </span>
        </label>
        <label className="flex items-center gap-2 self-center text-sm font-medium text-zinc-700">
          <input type="checkbox" name="isActive" defaultChecked={bono?.isActive ?? true} className="size-4" />
          {t("Active (can be entered on bookings)")}
        </label>
      </div>
      <FormActions pending={pending} state={state} cancelHref={cancelHref} create={!bono} />
    </form>
  );
}

// Invite someone to this center's staff: they get a one-time link by email
// and set their own password (or confirm with the one of their staff login
// at another center).
export function InviteForm({ cancelHref }: { cancelHref: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<SettingsFormState>(inviteStaffAction, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className={label}>
        {t("Email")}
        <input type="email" name="email" required maxLength={254} autoComplete="off" className={control} />
      </label>
      <label className={label}>
        {t("Role")}
        <select name="role" defaultValue="INSTRUCTOR" className={control}>
          <option value="INSTRUCTOR">{t("Instructor")}</option>
          <option value="ADMIN">{t("Admin")}</option>
        </select>
      </label>
      <p className="text-sm text-zinc-600">
        {t(
          "They get an email with a link, valid for 7 days, to choose their own name and password. Someone who already has a staff login at another center confirms with that password instead.",
        )}
      </p>
      <FormActions pending={pending} state={state} cancelHref={cancelHref} create submitLabel={t("Send invitation")} />
    </form>
  );
}

