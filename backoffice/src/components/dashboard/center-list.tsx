"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CenterChoice } from "@/auth";
import { chooseCenter, switchCenter, type CenterChoiceState } from "@/lib/centers";
import { useFormAction } from "@/lib/use-form-action";

const ROLE_LABELS: Record<string, string> = { ADMIN: "Admin", INSTRUCTOR: "Instructor" };

// The centers an account can work in, one button each, plus the superadmin
// console. On the login page ("Which center?") it finishes the sign-in; on
// /select-center it switches the signed-in session.
export function CenterList({
  mode,
  tenants,
  platform,
  selectionToken,
  currentTenantId,
}: {
  mode: "login" | "switch";
  tenants: CenterChoice[];
  platform: boolean;
  selectionToken?: string;
  currentTenantId?: string | null;
}) {
  const router = useRouter();
  const [state, onSubmit, pending] = useFormAction<CenterChoiceState>(
    mode === "login" ? chooseCenter : switchCenter,
    null,
  );
  useEffect(() => {
    if (state?.done) {
      router.push(state.done);
      router.refresh();
    }
  }, [state?.done, router]);
  const busy = pending || !!state?.done;
  const item =
    "flex w-full items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2.5 text-left text-sm transition hover:border-zinc-900 hover:bg-zinc-50 disabled:opacity-60";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-2">
      {selectionToken && <input type="hidden" name="selectionToken" value={selectionToken} />}
      {tenants.map((t) => {
        const current = mode === "switch" && t.id === currentTenantId;
        return (
          <button key={t.id} type="submit" name="tenantId" value={t.id} disabled={busy || current} className={item}>
            <span className="min-w-0">
              <span className="block truncate font-medium text-zinc-900">{t.name}</span>
              <span className="block truncate text-xs text-zinc-500">
                {t.slug}
                {!t.member && " · not a member: your entry is logged"}
              </span>
            </span>
            <span className="shrink-0 text-xs text-zinc-500">
              {current ? "Current" : (ROLE_LABELS[t.role] ?? t.role)}
            </span>
          </button>
        );
      })}
      {platform && (
        <button
          type="submit"
          name="tenantId"
          value=""
          disabled={busy || (mode === "switch" && currentTenantId === null)}
          className={`${item} border-dashed`}
        >
          <span className="font-medium text-zinc-900">Superadmin console</span>
          <span className="text-xs text-zinc-500">
            {mode === "switch" && currentTenantId === null ? "Current" : "Platform"}
          </span>
        </button>
      )}
      {state?.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {busy && <p className="text-sm text-zinc-500">Opening…</p>}
    </form>
  );
}
