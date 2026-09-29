"use client";

import Link from "next/link";
import { useState } from "react";
import { saveCustomer, type CustomerFormState } from "@/app/dashboard/customers/actions";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/api";
import { CERT_AGENCIES, CERT_LABELS, GENDER_LABELS, LANGUAGES } from "@/lib/customers";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400";
const label = "block text-sm font-medium text-zinc-700";
const section = "space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200";

export interface CustomerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  language: Language;
  birthdate: string;
  gender: string;
  certificationAgency: string;
  certificationLevel: string;
  certificationNumber: string;
  certificationExpiry: string;
  totalDives: string;
  loyaltyPoints: string;
  notes: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
}

export function CustomerForm({
  customerId,
  initial,
  cancelHref,
  maxBirthdate,
}: {
  customerId?: string;
  initial: CustomerFormValues;
  cancelHref: string;
  maxBirthdate: string;
}) {
  const [state, onSubmit, pending] = useFormAction<CustomerFormState>(saveCustomer, null);
  const [level, setLevel] = useState(initial.certificationLevel);
  const certified = level !== "" && level !== "none";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {customerId && <input type="hidden" name="customerId" value={customerId} />}
      <input type="hidden" name="gender_initial" value={initial.gender} />

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            First name
            <input name="firstName" required maxLength={100} defaultValue={initial.firstName} className={control} />
          </label>
          <label className={label}>
            Last name
            <input name="lastName" required maxLength={100} defaultValue={initial.lastName} className={control} />
          </label>
          <label className={label}>
            Email
            <input type="email" name="email" required maxLength={254} defaultValue={initial.email} className={control} />
          </label>
          <label className={label}>
            Phone (optional)
            <input type="tel" name="phone" maxLength={40} defaultValue={initial.phone} className={control} />
          </label>
          <label className={label}>
            Nationality (country code)
            <input
              name="country"
              required
              maxLength={60}
              placeholder="ES, DE, GB…"
              defaultValue={initial.country}
              className={control}
            />
          </label>
          <label className={label}>
            Language
            <select name="language" defaultValue={initial.language} className={control}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Birthdate (optional)
            <input type="date" name="birthdate" max={maxBirthdate} defaultValue={initial.birthdate} className={control} />
          </label>
          <label className={label}>
            Gender (optional)
            <select name="gender" defaultValue={initial.gender} className={control}>
              <option value="">Not specified</option>
              {Object.entries(GENDER_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
              {initial.gender && !(initial.gender in GENDER_LABELS) && (
                <option value={initial.gender}>{initial.gender}</option>
              )}
            </select>
          </label>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">Certification</h2>
        <p className="text-xs text-zinc-500">Record what the diver&apos;s card shows, once staff have seen it.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            Level
            <select
              name="certificationLevel"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={control}
            >
              <option value="">Not recorded</option>
              {Object.entries(CERT_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Agency
            <select
              name="certificationAgency"
              defaultValue={initial.certificationAgency}
              required={certified}
              disabled={!certified}
              className={control}
            >
              <option value="">{certified ? "Choose…" : "—"}</option>
              {CERT_AGENCIES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Card number (optional)
            <input
              name="certificationNumber"
              maxLength={60}
              defaultValue={initial.certificationNumber}
              disabled={!certified}
              className={control}
            />
          </label>
          <label className={label}>
            Card expiry (optional)
            <input
              type="date"
              name="certificationExpiry"
              defaultValue={initial.certificationExpiry}
              disabled={!certified}
              className={control}
            />
          </label>
          <label className={label}>
            Dives logged
            <input
              type="number"
              name="totalDives"
              required
              min={0}
              step={1}
              defaultValue={initial.totalDives}
              className={control}
            />
          </label>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">Emergency contact (optional)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            Name
            <input name="emergency_name" maxLength={100} defaultValue={initial.emergencyName} className={control} />
          </label>
          <label className={label}>
            Phone
            <input type="tel" name="emergency_phone" maxLength={40} defaultValue={initial.emergencyPhone} className={control} />
          </label>
          <label className={label}>
            Relationship
            <input
              name="emergency_relationship"
              maxLength={60}
              placeholder="e.g. Partner"
              defaultValue={initial.emergencyRelationship}
              className={control}
            />
          </label>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">Loyalty and notes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            Loyalty points
            <input
              type="number"
              name="loyaltyPoints"
              required
              min={0}
              step={1}
              defaultValue={initial.loyaltyPoints}
              className={control}
            />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Notes (optional)
            <textarea
              name="notes"
              rows={4}
              maxLength={2000}
              placeholder="For staff only, e.g. medical remarks, preferences"
              defaultValue={initial.notes}
              className={control}
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : customerId ? "Save changes" : "Create customer"}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} />}>
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
