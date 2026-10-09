"use client";

import Link from "next/link";
import { useState } from "react";
import { saveCustomer, type CustomerFormState } from "@/app/dashboard/customers/actions";
import { Button } from "@/components/ui/button";
import type { CustomerType, Language, SkillLevel } from "@/lib/api";
import {
  CUSTOMER_TYPE_LABELS,
  GEAR_SIZES,
  GENDER_LABELS,
  LANGUAGES,
  RENTAL_SIZE_FIELDS,
  SKILL_LEVEL_LABELS,
  TANK_SIZES,
} from "@/lib/customers";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400";
const label = "block text-sm font-medium text-zinc-700";
const section = "space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200";
const check = "flex items-start gap-2 text-sm text-zinc-700";

export interface CustomerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  language: Language;
  birthdate: string;
  gender: string;
  customerType: CustomerType;
  centerSkillLevel: SkillLevel | "";
  isApproved: boolean;
  totalDives: string;
  loyaltyPoints: string;
  notes: string;
  medicalCertNumber: string;
  medicalCertExpiry: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  waiverSignedAt: string; // YYYY-MM-DD, or "" when not signed
  ownEquipment: boolean;
  tankSize: string;
  bcdSize: string;
  wetsuitSize: string;
  finsSize: string;
  bootsSize: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
}

// A size select that keeps a value outside the offered list.
function SizeSelect({ name, value, options, disabled }: { name: string; value: string; options: string[]; disabled?: boolean }) {
  const t = useT();
  return (
    <select name={name} defaultValue={value} disabled={disabled} className={control}>
      <option value="">{t("Not recorded")}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      {value && !options.includes(value) && <option value={value}>{value}</option>}
    </select>
  );
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
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<CustomerFormState>(saveCustomer, null);
  const [ownEquipment, setOwnEquipment] = useState(initial.ownEquipment);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {customerId && <input type="hidden" name="customerId" value={customerId} />}
      <input type="hidden" name="gender_initial" value={initial.gender} />
      {RENTAL_SIZE_FIELDS.map((f) => (
        <input key={f.key} type="hidden" name={`${f.key}_initial`} value={initial[f.key]} />
      ))}
      <input type="hidden" name="tankSize_initial" value={initial.tankSize} />

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">{t("Details")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("First name")}
            <input name="firstName" required maxLength={100} defaultValue={initial.firstName} className={control} />
          </label>
          <label className={label}>
            {t("Last name")}
            <input name="lastName" required maxLength={100} defaultValue={initial.lastName} className={control} />
          </label>
          <label className={label}>
            {t("Email")}
            <input type="email" name="email" required maxLength={254} defaultValue={initial.email} className={control} />
          </label>
          <label className={label}>
            {t("Phone (optional)")}
            <input type="tel" name="phone" maxLength={40} defaultValue={initial.phone} className={control} />
          </label>
          <label className={label}>
            {t("Nationality (country code)")}
            <input
              name="country"
              required
              maxLength={60}
              placeholder={t("ES, DE, GB…")}
              defaultValue={initial.country}
              className={control}
            />
          </label>
          <label className={label}>
            {t("Language")}
            <select name="language" defaultValue={initial.language} className={control}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {t(l.label)}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("Birthdate (optional)")}
            <input type="date" name="birthdate" max={maxBirthdate} defaultValue={initial.birthdate} className={control} />
          </label>
          <label className={label}>
            {t("Gender (optional)")}
            <select name="gender" defaultValue={initial.gender} className={control}>
              <option value="">{t("Not specified")}</option>
              {Object.entries(GENDER_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {t(text)}
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
        <h2 className="font-semibold text-zinc-900">{t("Classification")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("Customer type")}
            <select name="customerType" defaultValue={initial.customerType} className={control}>
              {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {t(text)}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("Center skill level")}
            <select name="centerSkillLevel" defaultValue={initial.centerSkillLevel} className={control}>
              <option value="">{t("Not assessed")}</option>
              {Object.entries(SKILL_LEVEL_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {t(text)}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-zinc-500">{t("Staff's assessment in the water.")}</span>
          </label>
          <label className={label}>
            {t("Dives logged")}
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
          <label className={`${check} sm:self-center`}>
            <input type="checkbox" name="isApproved" defaultChecked={initial.isApproved} className="mt-0.5 size-4" />
            <span>
              {t("Approved for booking")}
              <span className="block text-xs text-zinc-500">{t("Unapproved customers cannot book online.")}</span>
            </span>
          </label>
        </div>
        <p className="text-xs text-zinc-500">{t("Certifications are recorded on the customer's profile page.")}</p>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">{t("Medical certificate (optional)")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("Certificate number")}
            <input name="medicalCertNumber" maxLength={60} defaultValue={initial.medicalCertNumber} className={control} />
          </label>
          <label className={label}>
            {t("Expiry date")}
            <input type="date" name="medicalCertExpiry" defaultValue={initial.medicalCertExpiry} className={control} />
          </label>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">{t("Diving insurance (optional)")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            {t("Provider")}
            <input
              name="insuranceProvider"
              maxLength={100}
              placeholder={t("e.g. DAN Europe")}
              defaultValue={initial.insuranceProvider}
              className={control}
            />
          </label>
          <label className={label}>
            {t("Policy number")}
            <input name="insurancePolicyNumber" maxLength={60} defaultValue={initial.insurancePolicyNumber} className={control} />
          </label>
          <label className={label}>
            {t("Expiry date")}
            <input type="date" name="insuranceExpiry" defaultValue={initial.insuranceExpiry} className={control} />
          </label>
          <label className={label}>
            {t("Waiver signed on")}
            <input type="date" name="waiverSignedAt" defaultValue={initial.waiverSignedAt} className={control} />
            <span className="mt-1 block text-xs font-normal text-zinc-500">{t("A signed liability waiver is accepted instead of dive insurance.")}</span>
          </label>
        </div>
        {customerId && (
          <p className="text-xs text-zinc-500">
            {t("Changing the medical certificate or insurance details clears their verification.")}
          </p>
        )}
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">{t("Equipment preferences")}</h2>
        <label className={check}>
          <input
            type="checkbox"
            name="ownEquipment"
            checked={ownEquipment}
            onChange={(e) => setOwnEquipment(e.target.checked)}
            className="mt-0.5 size-4"
          />
          <span>
            {t("Brings a complete set of their own equipment")}
            <span className="block text-xs text-zinc-500">{t("The tank is always provided by the center.")}</span>
          </span>
        </label>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <label className={label}>
            {t("Tank")}
            <SizeSelect name="tankSize" value={initial.tankSize} options={TANK_SIZES} />
          </label>
          {RENTAL_SIZE_FIELDS.map((f) => (
            <label key={f.key} className={label}>
              {t(f.label)}
              <SizeSelect name={f.key} value={initial[f.key]} options={GEAR_SIZES} disabled={ownEquipment} />
            </label>
          ))}
        </div>
        {ownEquipment && <p className="text-xs text-zinc-500">{t("Rental sizes are kept but not needed while this is ticked.")}</p>}
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">{t("Emergency contact (optional)")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            {t("Name")}
            <input name="emergency_name" maxLength={100} defaultValue={initial.emergencyName} className={control} />
          </label>
          <label className={label}>
            {t("Phone")}
            <input type="tel" name="emergency_phone" maxLength={40} defaultValue={initial.emergencyPhone} className={control} />
          </label>
          <label className={label}>
            {t("Relationship")}
            <input
              name="emergency_relationship"
              maxLength={60}
              placeholder={t("e.g. Partner")}
              defaultValue={initial.emergencyRelationship}
              className={control}
            />
          </label>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold text-zinc-900">{t("Loyalty and notes")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            {t("Loyalty points")}
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
            {t("Notes (optional)")}
            <textarea
              name="notes"
              rows={4}
              maxLength={2000}
              placeholder={t("For staff only, e.g. medical remarks, preferences")}
              defaultValue={initial.notes}
              className={control}
            />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : customerId ? t("Save changes") : t("Create customer")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} />}>
          {t("Cancel")}
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
