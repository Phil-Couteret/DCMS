"use client";

import { useActionState } from "react";
import { cancel, markSent, type FormState } from "@/app/dashboard/billing/actions";
import { Button } from "@/components/ui/button";

// Button-only forms: nothing typed, so React's reset after the action is harmless.
export function CancelInvoiceButton({ invoiceId, size = "sm" }: { invoiceId: string; size?: "sm" | "default" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(cancel, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Button
        type="submit"
        size={size}
        variant="outline"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm("Cancel this invoice? Its number is kept and it cannot be reopened.")) e.preventDefault();
        }}
      >
        {pending ? "Cancelling…" : "Cancel"}
      </Button>
      {state?.error && (
        <p role="alert" className="max-w-64 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function MarkSentButton({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(markSent, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Mark as Sent"}
      </Button>
      {state?.error && (
        <p role="alert" className="max-w-64 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
