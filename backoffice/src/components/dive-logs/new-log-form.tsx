"use client";

import { zoneLabel } from "@/lib/center-time";
import { useState } from "react";
import { createLog, type FormState } from "@/app/dashboard/dive-logs/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

function minutesBetween(entry: string, exit: string) {
  if (!/^\d{2}:\d{2}$/.test(entry) || !/^\d{2}:\d{2}$/.test(exit)) return null;
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return toMin(exit) - toMin(entry);
}

export function NewLogForm({
  sites,
  guides,
  today,
  timeZone,
  bookingId,
}: {
  sites: { id: string; name: string }[];
  guides: { id: string; name: string }[];
  today: string;
  timeZone: string;
  bookingId?: string;
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<FormState>(createLog, null);
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const duration = minutesBetween(entry, exit);

  const num = (name: string, text: string, unit: string, required = false) => (
    <label className={label}>
      {required ? t("{label} ({unit})", { label: t(text), unit }) : t("{label} ({unit}), optional", { label: t(text), unit })}
      <input type="number" name={name} step="1" required={required} className={control} />
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-zinc-900">{t("Dive")}</legend>
        <label className={`${label} sm:col-span-2`}>
          {t("Booking ID")}
          <input name="bookingId" required defaultValue={bookingId} placeholder={t("Booking reference")} className={`${control} font-mono`} />
        </label>
        <label className={label}>
          {t("Dive site")}
          <select name="siteId" required defaultValue="" className={control}>
            <option value="" disabled>
              {t("Choose a site…")}
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Guide (optional)")}
          <select name="guideId" defaultValue="" className={control}>
            <option value="">{t("No guide")}</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Date")}
          <input type="date" name="date" required max={today} defaultValue={today} className={control} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            {t("Entry")}
            <input type="time" name="entryTime" required value={entry} onChange={(e) => setEntry(e.target.value)} className={control} />
          </label>
          <label className={label}>
            {t("Exit")}
            <input type="time" name="exitTime" required value={exit} onChange={(e) => setExit(e.target.value)} className={control} />
          </label>
        </div>
        <p className="text-sm text-zinc-600 sm:col-span-2" aria-live="polite">
          {t("Duration:")}{" "}
          {duration === null ? (
            "—"
          ) : duration > 0 ? (
            <span className="font-semibold text-zinc-900">{t("{count} min", { count: duration })}</span>
          ) : (
            <span className="text-red-700">{t("exit must be after entry")}</span>
          )}{" "}
          <span className="text-xs text-zinc-500">
            · {t("times in {zone} time ({timeZone})", { zone: zoneLabel(timeZone), timeZone })}
          </span>
        </p>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-zinc-900">{t("Measurements")}</legend>
        {num("maxDepth", "Max depth", "m", true)}
        {num("avgDepth", "Average depth", "m")}
        {num("visibility", "Visibility", "m")}
        {num("waterTemp", "Water temperature", "°C")}
        {num("airStartBar", "Air at start", "bar")}
        {num("airEndBar", "Air at end", "bar")}
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-zinc-900">{t("Conditions")}</legend>
        <label className={label}>
          {t("Weather (optional)")}
          <input name="weatherConditions" maxLength={200} className={control} />
        </label>
        <label className={label}>
          {t("Sea (optional)")}
          <input name="seaConditions" maxLength={200} className={control} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          {t("Notes (optional)")}
          <textarea name="notes" rows={3} maxLength={4000} className={control} />
        </label>
      </fieldset>

      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending || (duration !== null && duration <= 0)}>
        {pending ? t("Creating…") : t("Create dive log")}
      </Button>
    </form>
  );
}
