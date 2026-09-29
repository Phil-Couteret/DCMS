"use client";

import { useEffect, useRef } from "react";
import { addCertification, type CustomerActionState } from "@/app/dashboard/customers/actions";
import { Button } from "@/components/ui/button";
import { CERT_AGENCIES, CERT_LABELS } from "@/lib/customers";
import { useFormAction } from "@/lib/use-form-action";

export { ActionButton } from "@/components/action-button";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

export function AddCertificationForm({ customerId }: { customerId: string }) {
  const [state, onSubmit, pending] = useFormAction<CustomerActionState>(addCertification, null);
  const form = useRef<HTMLFormElement>(null);
  // Cleared only after a successful add, so a failed one can be corrected.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200">
      <input type="hidden" name="customerId" value={customerId} />
      <p className="text-sm font-medium text-zinc-900">Add a certification</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className={label}>
          Agency
          <select name="agency" required defaultValue="" className={control}>
            <option value="" disabled>
              Choose…
            </option>
            {CERT_AGENCIES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Level
          <select name="level" required defaultValue="" className={control}>
            <option value="" disabled>
              Choose…
            </option>
            {Object.entries(CERT_LABELS)
              .filter(([value]) => value !== "none")
              .map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
          </select>
        </label>
        <label className={label}>
          Card number
          <input name="cardNumber" maxLength={60} className={control} />
        </label>
        <label className={label}>
          Issued
          <input type="date" name="issueDate" className={control} />
        </label>
        <label className={label}>
          Expires
          <input type="date" name="expiryDate" className={control} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add certification"}
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
