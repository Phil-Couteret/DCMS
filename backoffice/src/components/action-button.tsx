"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

export type ActionState = { error?: string; ok?: boolean; message?: string } | null;
type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

// A one-click server action (approve, verify, assign, remove…) posting a few
// hidden fields, with an optional confirmation.
export function ActionButton({
  action,
  fields,
  children,
  pendingLabel,
  confirm,
  variant = "outline",
  size = "sm",
  disabled,
  className,
}: {
  action: Action;
  fields: Record<string, string>;
  children: React.ReactNode;
  pendingLabel: string;
  confirm?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "xs" | "sm" | "default";
  disabled?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" size={size} variant={variant} disabled={pending || disabled} className={className}>
        {pending ? pendingLabel : children}
      </Button>
      {state?.error && (
        <p role="alert" className="max-w-56 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
      {state?.message && !state.error && <p className="max-w-64 text-right text-xs text-zinc-600">{state.message}</p>}
    </form>
  );
}
