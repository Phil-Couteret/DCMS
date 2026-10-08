"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { addTenant, saveTenant, setTenantActive, type TenantFormState } from "@/app/superadmin/actions";
import { ActionButton } from "@/components/action-button";
import { Button } from "@/components/ui/button";
import { switchCenter, type CenterChoiceState } from "@/lib/centers";
import { PLAN_LABELS, SLUG_PATTERN, TENANT_PLANS, type Tenant } from "@/lib/platform";
import { LANGUAGES } from "@/lib/customers";
import { useFormAction } from "@/lib/use-form-action";

const label = "block text-sm font-medium text-zinc-700";
const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

// Create (tenant null) or edit a center's name, slug and plan. Creating also
// sets its regional settings, which its admins change later in Settings.
export function TenantForm({
  tenant,
  timeZones = [],
  currencies = [],
}: {
  tenant: Tenant | null;
  timeZones?: string[];
  currencies?: string[];
}) {
  const [state, onSubmit, pending] = useFormAction<TenantFormState>(tenant ? saveTenant : addTenant, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {tenant && <input type="hidden" name="id" value={tenant.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={label}>
          Name
          <input name="name" required minLength={2} maxLength={120} defaultValue={tenant?.name ?? ""} className={control} />
        </label>
        <label className={label}>
          Slug
          <input
            name="slug"
            required
            maxLength={63}
            pattern={SLUG_PATTERN}
            defaultValue={tenant?.slug ?? ""}
            autoComplete="off"
            className={control}
          />
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            Its address: <code>slug.dcms…</code>. Lowercase letters, digits and hyphens.
          </span>
        </label>
        <label className={label}>
          Plan
          <select name="plan" defaultValue={tenant?.plan ?? "FREE"} className={control}>
            {TENANT_PLANS.map((p) => (
              <option key={p} value={p}>
                {PLAN_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!tenant && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            Time zone
            <select name="timeZone" defaultValue="Atlantic/Canary" className={control}>
              {timeZones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Currency
            <select name="currency" defaultValue="EUR" className={control}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Default language
            <select name="defaultLanguage" defaultValue="EN" className={control}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Tax name
            <input name="taxName" required maxLength={20} defaultValue="IGIC" className={control} />
          </label>
          <label className={label}>
            Tax rate (%)
            <input type="number" name="taxRate" required min={0} max={100} step={0.01} defaultValue={7} className={control} />
          </label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : tenant ? "Save" : "Create center"}
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p role="status" className="text-sm text-green-700">
            Saved.
          </p>
        )}
      </div>
    </form>
  );
}

export function TenantActiveButton({ tenant }: { tenant: Tenant }) {
  return tenant.isActive ? (
    <ActionButton
      action={setTenantActive}
      fields={{ id: tenant.id, isActive: "false" }}
      pendingLabel="Deactivating…"
      confirm={`Deactivate ${tenant.name}? Its staff and customers are signed out and its site stops; its data is kept.`}
    >
      Deactivate
    </ActionButton>
  ) : (
    <ActionButton action={setTenantActive} fields={{ id: tenant.id, isActive: "true" }} pendingLabel="Activating…">
      Activate
    </ActionButton>
  );
}

// Enters the center as its admin (logged when not a member) and opens its
// dashboard.
export function OpenTenantButton({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [state, onSubmit, pending] = useFormAction<CenterChoiceState>(switchCenter, null);
  useEffect(() => {
    if (state?.done) {
      router.push(state.done);
      router.refresh();
    }
  }, [state?.done, router]);
  return (
    <form onSubmit={onSubmit} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="tenantId" value={tenant.id} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={!tenant.isActive || pending || !!state?.done}
        title={tenant.isActive ? "Open this center's backoffice; the entry is logged" : "Activate the center first"}
      >
        {pending || state?.done ? "Opening…" : "Open"}
      </Button>
      {state?.error && (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
