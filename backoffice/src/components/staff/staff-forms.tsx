"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";
import {
  changeStaffStatus,
  removeQualification,
  saveAvailability,
  saveQualification,
  saveStaff,
  type FormState,
} from "@/app/dashboard/staff/actions";
import { Button } from "@/components/ui/button";
import type { Staff, StaffQualification, StaffStatus } from "@/lib/api";
import { STAFF_STATUSES, STAFF_TYPES, STATUS_LABELS, TYPE_LABELS } from "@/lib/staff";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export function StatusToggle({ staffId, status }: { staffId: string; status: StaffStatus }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(changeStaffStatus, null);
  const next: StaffStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant={next === "INACTIVE" ? "outline" : "default"} disabled={pending}>
        {pending ? t("Saving…") : next === "INACTIVE" ? t("Mark Inactive") : t("Mark Active")}
      </Button>
      {state?.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AvailabilityForm({ staffId, today }: { staffId: string; today: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<FormState>(saveAvailability, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="staffId" value={staffId} />
      <label className="block max-w-xs text-sm font-medium text-zinc-700">
        {t("Date")}
        <input type="date" name="date" required min={today} defaultValue={today} className={control} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium text-zinc-700">{t("Available")}</legend>
        <div className="mt-1 flex gap-4 text-sm text-zinc-900">
          <label className="flex items-center gap-2">
            <input type="radio" name="available" value="yes" defaultChecked /> {t("Yes")}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="available" value="no" /> {t("No")}
          </label>
        </div>
      </fieldset>
      <label className="block text-sm font-medium text-zinc-700">
        {t("Reason (optional)")}
        <input name="reason" maxLength={200} placeholder={t("e.g. Course, holiday")} className={control} />
      </label>
      <p className="text-xs text-zinc-500">{t("Saving replaces any entry already set for that day.")}</p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : t("Save availability")}
        </Button>
        {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm text-green-700">{t("Saved.")}</p>}
      </div>
    </form>
  );
}

const label = "block text-sm font-medium text-zinc-700";

function FormError({ state }: { state: FormState }) {
  return state?.error ? (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  ) : null;
}

// Create (staff null: choose one of the accounts without a profile) or edit
// a staff profile.
export function StaffForm({
  staff,
  accounts,
  cancelHref,
}: {
  staff: Staff | null;
  accounts: { id: string; label: string }[];
  cancelHref: string;
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<FormState>(saveStaff, null);
  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      {staff && <input type="hidden" name="staffId" value={staff.id} />}
      {!staff && (
        <label className={label}>
          {t("Account")}
          <select name="userId" required defaultValue="" className={control}>
            <option value="" disabled>
              {t("Choose an account")}
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            {accounts.length === 0
              ? t("Every staff account already has a profile. Add the person in Settings → Users first.")
              : t("Staff accounts of this center without a profile. New people are added in Settings → Users first.")}
          </span>
        </label>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("First name")}
          <input name="firstName" required maxLength={80} defaultValue={staff?.firstName ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Last name")}
          <input name="lastName" required maxLength={80} defaultValue={staff?.lastName ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Phone")}
          <input type="tel" name="phone" required maxLength={40} defaultValue={staff?.phone ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Hire date")}
          <input type="date" name="hireDate" required defaultValue={staff?.hireDate.slice(0, 10) ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Type")}
          <select name="type" defaultValue={staff?.type ?? "GUIDE"} className={control}>
            {STAFF_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(TYPE_LABELS[ty])}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Status")}
          <select name="status" defaultValue={staff?.status ?? "ACTIVE"} className={control}>
            {STAFF_STATUSES.map((st) => (
              <option key={st} value={st}>
                {t(STATUS_LABELS[st])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || (!staff && accounts.length === 0)}>
          {pending ? t("Saving…") : staff ? t("Save changes") : t("Create profile")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} />}>
          {t("Cancel")}
        </Button>
        <FormError state={state} />
      </div>
    </form>
  );
}

// Add (qualification null) or edit a qualification.
export function QualificationForm({
  staffId,
  qualification,
  cancelHref,
}: {
  staffId: string;
  qualification: StaffQualification | null;
  cancelHref: string;
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<FormState>(saveQualification, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="staffId" value={staffId} />
      {qualification && <input type="hidden" name="qualificationId" value={qualification.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Qualification")}
          <input
            name="type"
            required
            maxLength={80}
            placeholder={t("e.g. Open Water Instructor")}
            defaultValue={qualification?.type ?? ""}
            className={control}
          />
        </label>
        <label className={label}>
          {t("Agency")}
          <input name="agency" required maxLength={40} placeholder={t("e.g. PADI")} defaultValue={qualification?.agency ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Number")}
          <input name="number" required maxLength={60} defaultValue={qualification?.number ?? ""} className={control} />
        </label>
        <span />
        <label className={label}>
          {t("Issued")}
          <input type="date" name="issueDate" required defaultValue={qualification?.issueDate.slice(0, 10) ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Expires (optional)")}
          <input type="date" name="expiryDate" defaultValue={qualification?.expiryDate?.slice(0, 10) ?? ""} className={control} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : qualification ? t("Save changes") : t("Add qualification")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          {t("Cancel")}
        </Button>
        <FormError state={state} />
      </div>
    </form>
  );
}

export function DeleteQualificationButton({ staffId, qualification }: { staffId: string; qualification: StaffQualification }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(removeQualification, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t("Delete the qualification {type} ({agency})?", { type: qualification.type, agency: qualification.agency }))) e.preventDefault();
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="qualificationId" value={qualification.id} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive" disabled={pending}>
        {pending ? t("Deleting…") : t("Delete")}
      </Button>
      <FormError state={state} />
    </form>
  );
}
