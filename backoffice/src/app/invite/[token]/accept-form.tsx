"use client";

import { Button } from "@/components/ui/button";
import type { InvitationPreview } from "@/lib/platform";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/settings";
import { useFormAction } from "@/lib/use-form-action";
import { acceptAction, type AcceptState } from "./actions";

const label = "block text-sm font-medium text-zinc-700";
const control =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

// A new account chooses its name and password; an existing staff account
// confirms with its current password.
export function AcceptForm({ token, invitation }: { token: string; invitation: InvitationPreview }) {
  const [state, onSubmit, pending] = useFormAction<AcceptState>(acceptAction, null);
  if (state?.signInUrl) {
    return (
      <div className="mt-6 space-y-4">
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          You have joined {invitation.tenant.name}. Sign in with {invitation.email}.
        </p>
        <Button nativeButton={false} render={<a href={state.signInUrl} />}>
          Sign in
        </Button>
      </div>
    );
  }
  return (
    <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      {invitation.existingAccount ? (
        <>
          <input type="hidden" name="existing" value="1" />
          <p className="text-sm text-zinc-600">
            {invitation.email} already has an account. Confirm with its password to add {invitation.tenant.name} to it.
          </p>
          <label className={label}>
            Current password
            <input type="password" name="currentPassword" required autoComplete="current-password" className={control} />
          </label>
        </>
      ) : (
        <>
          <label className={label}>
            Your name
            <input name="name" required maxLength={120} defaultValue={invitation.name ?? ""} autoComplete="name" className={control} />
          </label>
          <label className={label}>
            Password
            <input
              type="password"
              name="password"
              required
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
              className={control}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-500">At least {PASSWORD_MIN} characters.</span>
          </label>
          <label className={label}>
            Confirm password
            <input type="password" name="confirmPassword" required maxLength={PASSWORD_MAX} autoComplete="new-password" className={control} />
          </label>
        </>
      )}
      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Joining…" : `Join ${invitation.tenant.name}`}
      </Button>
    </form>
  );
}
