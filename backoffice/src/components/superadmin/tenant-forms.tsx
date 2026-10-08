"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addTenant, inviteAction, saveQuotas, saveTenant, setTenantActive, type TenantFormState } from "@/app/superadmin/actions";
import { ActionButton } from "@/components/action-button";
import { Button } from "@/components/ui/button";
import { switchCenter, type CenterChoiceState } from "@/lib/centers";
import { LOCATION_TYPE_LABELS, LOCATION_TYPES } from "@/lib/locations";
import { PLAN_LABELS, QUOTA_LABELS, SLUG_PATTERN, TENANT_PLANS, type Quotas } from "@/lib/platform-labels";
import type { SentInvitation, Tenant } from "@/lib/platform";
import { LANGUAGES } from "@/lib/customers";
import { useFormAction } from "@/lib/use-form-action";

const label = "block text-sm font-medium text-zinc-700";
const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

function Feedback({ state, saved = "Saved." }: { state: TenantFormState; saved?: string }) {
  if (state?.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  return state?.ok ? (
    <p role="status" className="text-sm text-green-700">
      {saved}
    </p>
  ) : null;
}

// A center's name, slug and plan.
export function TenantForm({ tenant }: { tenant: Tenant }) {
  const [state, onSubmit, pending] = useFormAction<TenantFormState>(saveTenant, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={tenant.id} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={label}>
          Name
          <input name="name" required minLength={2} maxLength={120} defaultValue={tenant.name} className={control} />
        </label>
        <label className={label}>
          Slug
          <input name="slug" required maxLength={63} pattern={SLUG_PATTERN} defaultValue={tenant.slug} autoComplete="off" className={control} />
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            Its addresses use it. Changing it moves the center&apos;s site and backoffice.
          </span>
        </label>
        <label className={label}>
          Plan
          <select name="plan" defaultValue={tenant.plan} className={control}>
            {TENANT_PLANS.map((p) => (
              <option key={p} value={p}>
                {PLAN_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

// "Deep Blue Diving!" → "deep-blue-diving", as the original console did.
function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 63) || "center"
  );
}

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-zinc-200 pt-4">
      <legend className="pt-4 text-sm font-semibold text-zinc-900">{legend}</legend>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
    </fieldset>
  );
}

// Onboarding: the center, its region and tax, its first location and its
// first admin, created together. Afterwards it shows the invitation link.
export function OnboardForm({ timeZones, currencies }: { timeZones: string[]; currencies: string[] }) {
  const [state, onSubmit, pending] = useFormAction<TenantFormState>(addTenant, null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // The slug follows the name until it is edited by hand.
  const [slugEdited, setSlugEdited] = useState(false);

  if (state?.created) {
    const { created } = state;
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
          {created.name} is ready: its settings, default prices and first location are set up.
        </p>
        {created.invitation && <InvitationResult invitation={created.invitation} />}
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href={`/superadmin/tenants/${created.id}`} prefetch={false} />}>
            Open {created.name}
          </Button>
          {/* A fresh, empty form for the next center. */}
          <Button variant="outline" onClick={() => window.location.reload()}>
            Add another center
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className={label}>
          Company name
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="e.g. Deep Blue Diving"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            className={control}
          />
        </label>
        <label className={label}>
          Slug
          <input
            name="slug"
            required
            maxLength={63}
            pattern={SLUG_PATTERN}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              setSlugEdited(true);
            }}
            autoComplete="off"
            className={control}
          />
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            Its addresses: <code>{slug || "slug"}.dcms…</code> and <code>{slug || "slug"}.admin…</code>
          </span>
        </label>
        <label className={label}>
          Plan
          <select name="plan" defaultValue="FREE" className={control}>
            {TENANT_PLANS.map((p) => (
              <option key={p} value={p}>
                {PLAN_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Fieldset legend="Region and tax" hint="Its admins can change these later in Settings → General.">
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
      </Fieldset>

      <Fieldset legend="First location">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            Name
            <input name="locationName" maxLength={120} placeholder={name || "e.g. Caleta de Fuste"} className={control} />
            <span className="mt-1 block text-xs font-normal text-zinc-500">Left empty: the center&apos;s name.</span>
          </label>
          <label className={label}>
            Activity type
            <select name="locationType" defaultValue="DIVING" className={control}>
              {LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LOCATION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Fieldset>

      <Fieldset
        legend="First admin"
        hint="Receives an email with a link to set their password (valid 7 days). An existing staff account confirms with its password instead."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className={label}>
            Email
            <input type="email" name="adminEmail" maxLength={254} autoComplete="off" className={control} />
          </label>
          <label className={label}>
            Name (optional)
            <input name="adminName" maxLength={120} autoComplete="off" className={control} />
          </label>
        </div>
      </Fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create center"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

// A sent invitation: emailed, or the link to pass on by hand.
export function InvitationResult({ invitation }: { invitation: SentInvitation }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2 rounded-md bg-zinc-50 p-3 text-sm ring-1 ring-zinc-200">
      <p className="text-zinc-800">
        {invitation.emailed
          ? `An invitation was emailed to ${invitation.email}.`
          : `No email could be sent (email is not set up on the server). Send ${invitation.email} this link; it works once, for 7 days, and is not shown again:`}
      </p>
      {!invitation.emailed && (
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 text-xs ring-1 ring-zinc-200">{invitation.link}</code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(invitation.link).then(() => setCopied(true), () => setCopied(false));
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      )}
    </div>
  );
}

// Invites someone to a center's staff (admin by default).
export function InviteForm({ tenantId }: { tenantId: string }) {
  const [state, onSubmit, pending] = useFormAction<TenantFormState>(inviteAction, null);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={tenantId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <label className={`${label} sm:col-span-2`}>
          Email
          <input type="email" name="email" required maxLength={254} autoComplete="off" className={control} />
        </label>
        <label className={label}>
          Name (optional)
          <input name="name" maxLength={120} autoComplete="off" className={control} />
        </label>
        <label className={label}>
          Role
          <select name="role" defaultValue="ADMIN" className={control}>
            <option value="ADMIN">Admin</option>
            <option value="INSTRUCTOR">Instructor</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send invitation"}
        </Button>
        <Feedback state={state} />
      </div>
      {state?.invited && <InvitationResult invitation={state.invited} />}
    </form>
  );
}

// The authorized limits, shown against usage. Not enforced yet.
export function QuotasForm({ tenant }: { tenant: Tenant }) {
  const [state, onSubmit, pending] = useFormAction<TenantFormState>(saveQuotas, null);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="id" value={tenant.id} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.keys(QUOTA_LABELS) as (keyof Quotas)[]).map((key) => (
          <label key={key} className={label}>
            {QUOTA_LABELS[key]}
            <input
              type="number"
              name={key}
              required
              min={0}
              step={key === "storagePricePerGbMonth" ? 0.01 : 1}
              defaultValue={tenant.quotas[key]}
              className={control}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save quotas"}
        </Button>
        <Feedback state={state} saved="Quotas saved." />
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
