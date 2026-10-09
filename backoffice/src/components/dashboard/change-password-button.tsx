"use client";

import { useState } from "react";
import { changePassword, type PasswordState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/client";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/settings";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [state, onSubmit, pending] = useFormAction<PasswordState>(changePassword, null);
  const t = useT();
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-green-700">
          {t("Your password has been changed. Use it the next time you sign in.")}
        </p>
        <Button onClick={onDone}>{t("Done")}</Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className={label}>
        {t("Current password")}
        <input
          type="password"
          name="currentPassword"
          required
          autoComplete="current-password"
          autoFocus
          className={control}
        />
      </label>
      <label className={label}>
        {t("New password")}
        <input
          type="password"
          name="password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
          className={control}
        />
        <span className="mt-1 block text-xs font-normal text-zinc-500">{t("At least {count} characters.", { count: PASSWORD_MIN })}</span>
      </label>
      <label className={label}>
        {t("Confirm new password")}
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
          className={control}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : t("Change password")}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("Cancel")}
        </Button>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

// Shown above Sign out: the signed-in user changing their own password.
export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);
  // A fresh form, without the last result, each time the dialog opens.
  const [attempt, setAttempt] = useState(0);
  const t = useT();
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-white/40 bg-transparent text-white hover:bg-white/20 hover:text-white"
        onClick={() => {
          setAttempt((n) => n + 1);
          setOpen(true);
        }}
      >
        {t("Change password")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Change password")}</DialogTitle>
            <DialogDescription>{t("Enter your current password and a new one.")}</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm key={attempt} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
