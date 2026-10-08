"use client";

import Link from "next/link";
import { useState } from "react";
import {
  cancelPartnerInvoiceAction,
  createPartnerInvoiceAction,
  deletePartnerAction,
  recordPartnerPaymentAction,
  regenerateCredentialsAction,
  savePartnerAction,
  type PartnerFormState,
} from "@/app/dashboard/partners/actions";
import { Button } from "@/components/ui/button";
import type { Partner, PartnerCredentials } from "@/lib/api";
import { money } from "@/lib/billing";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

function Feedback({ state, success }: { state: PartnerFormState; success?: string }) {
  if (state?.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state?.ok && success) return <p role="status" className="text-sm text-green-700">{success}</p>;
  return null;
}

// Runs a form after a confirm() prompt.
function confirmed(message: string, onSubmit: (e: React.FormEvent<HTMLFormElement>) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(message)) {
      e.preventDefault();
      return;
    }
    onSubmit(e);
  };
}

function CopyField({ label: name, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-xs font-medium text-zinc-600">{name}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className={`min-w-0 flex-1 truncate rounded bg-white px-2 py-1.5 font-mono text-sm ring-1 ${secret ? "ring-amber-300" : "ring-zinc-200"}`}>
          {value}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            navigator.clipboard.writeText(value).then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              },
              () => setCopied(false),
            )
          }
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

// The one time the secret is visible: it is stored only as a hash.
export function CredentialsPanel({ credentials, email }: { credentials: PartnerCredentials; email: string }) {
  return (
    <div className="space-y-3 rounded-xl bg-amber-50 p-5 ring-1 ring-amber-300">
      <p className="font-semibold text-amber-900">Save these credentials now. The API secret will not be shown again.</p>
      <CopyField label="API key" value={credentials.apiKey} />
      <CopyField label="API secret (the partner's password)" value={credentials.apiSecret} secret />
      <p className="text-sm text-amber-900">
        The partner signs in to the portal at <code className="font-mono">/partner/login</code> with {email} or the API
        key, and the API secret. Send the secret by a different channel from the email address.
      </p>
    </div>
  );
}

export function PartnerForm({ partner }: { partner?: Partner }) {
  const [state, onSubmit, pending] = useFormAction<PartnerFormState>(savePartnerAction, null);
  if (!partner && state?.credentials) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-green-700">Partner created.</p>
        <CredentialsPanel credentials={state.credentials} email="their contact email" />
        <Button nativeButton={false} render={<Link href={`/dashboard/partners/${state.partnerId}`} prefetch={false} />}>
          I&apos;ve saved the credentials
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-zinc-200">
      {partner && <input type="hidden" name="partnerId" value={partner.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          Partner name
          <input name="name" required maxLength={100} defaultValue={partner?.name} placeholder="e.g. Fuerte Tours" className={control} />
        </label>
        <label className={label}>
          Company name
          <input name="companyName" required maxLength={150} defaultValue={partner?.companyName} placeholder="e.g. Fuerte Tours S.L." className={control} />
        </label>
        <label className={label}>
          Contact email
          <input name="contactEmail" type="email" required maxLength={254} defaultValue={partner?.contactEmail} className={control} />
          <span className="mt-1 block text-xs font-normal text-zinc-500">Also their portal sign-in.</span>
        </label>
        <label className={label}>
          Contact phone (optional)
          <input name="contactPhone" maxLength={40} defaultValue={partner?.contactPhone ?? ""} className={control} />
        </label>
        <label className={label}>
          Commission (%)
          <input
            name="commissionRate"
            required
            inputMode="decimal"
            defaultValue={partner ? String(Number(partner.commissionRate)) : ""}
            placeholder="e.g. 15"
            className={control}
          />
          <span className="mt-1 block text-xs font-normal text-zinc-500">
            The share of the catalogue price the partner keeps. Changes apply to invoices created afterwards.
          </span>
        </label>
        <label className="flex items-center gap-2 self-center text-sm font-medium text-zinc-700">
          <input type="checkbox" name="isActive" defaultChecked={partner?.isActive ?? true} className="size-4" />
          Active (can sign in to the portal and be chosen on bookings)
        </label>
      </div>
      <label className={label}>
        Notes (optional, staff only)
        <textarea name="notes" rows={2} maxLength={2000} defaultValue={partner?.notes ?? ""} className={control} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : partner ? "Save changes" : "Create partner"}
        </Button>
        <Feedback state={state} success="Saved." />
      </div>
    </form>
  );
}

export function RegenerateCredentials({ partnerId, email }: { partnerId: string; email: string }) {
  const [state, onSubmit, pending] = useFormAction<PartnerFormState>(regenerateCredentialsAction, null);
  if (state?.credentials) return <CredentialsPanel credentials={state.credentials} email={email} />;
  return (
    <form
      onSubmit={confirmed("Create a new API key and secret? The current ones stop working at once, including for the portal.", onSubmit)}
      className="space-y-2"
    >
      <input type="hidden" name="partnerId" value={partnerId} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Creating…" : "New key and secret"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function DeletePartnerButton({ partnerId, name }: { partnerId: string; name: string }) {
  const [state, onSubmit, pending] = useFormAction<PartnerFormState>(deletePartnerAction, null);
  return (
    <form onSubmit={confirmed(`Delete ${name}? This cannot be undone.`, onSubmit)} className="space-y-1">
      <input type="hidden" name="partnerId" value={partnerId} />
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting…" : "Delete partner"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function CreateInvoiceButton({
  partnerId,
  from,
  to,
  total,
  currency,
}: {
  partnerId: string;
  from: string;
  to: string;
  total: string;
  currency: string;
}) {
  const [state, onSubmit, pending] = useFormAction<PartnerFormState>(createPartnerInvoiceAction, null);
  return (
    <form onSubmit={confirmed(`Create an invoice for ${money(total, currency)}?`, onSubmit)} className="flex flex-col items-end gap-1">
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="from" value={from} />
      <input type="hidden" name="to" value={to} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invoice"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function PartnerPaymentForm({
  invoiceId,
  paidAmount,
  total,
  currency,
}: {
  invoiceId: string;
  paidAmount: string;
  total: string;
  currency: string;
}) {
  const [state, onSubmit, pending] = useFormAction<PartnerFormState>(recordPartnerPaymentAction, null);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <label className={label}>
        Total paid so far ({currency})
        <input
          name="paidAmount"
          required
          inputMode="decimal"
          defaultValue={Number(paidAmount) > 0 ? paidAmount : total}
          className={`${control} max-w-48`}
        />
        <span className="mt-1 block text-xs font-normal text-zinc-500">Replaces the amount recorded before. Total: {money(total, currency)}.</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Record payment"}
        </Button>
        <Feedback state={state} success="Payment recorded." />
      </div>
    </form>
  );
}

export function CancelPartnerInvoiceButton({ invoiceId, number }: { invoiceId: string; number: string }) {
  const [state, onSubmit, pending] = useFormAction<PartnerFormState>(cancelPartnerInvoiceAction, null);
  return (
    <form
      onSubmit={confirmed(`Cancel ${number}? Its bookings can then go on a new invoice.`, onSubmit)}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Cancelling…" : "Cancel invoice"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}
