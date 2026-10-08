"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CenterList } from "@/components/dashboard/center-list";
import { beginLogin, type CenterChoiceState } from "@/lib/centers";
import { useFormAction } from "@/lib/use-form-action";

const NOT_STAFF = "This account is not a staff account. Customers use the public website.";

export default function LoginPage() {
  const router = useRouter();
  const [state, onSubmit, pending] = useFormAction<CenterChoiceState>(beginLogin, null);
  // The proxy sends a non-staff session here with ?error=not_staff.
  const [notStaff, setNotStaff] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "not_staff") setNotStaff(true);
  }, []);
  // Until React hydrates, onSubmit is not attached and the browser would
  // submit the form natively. Keep the button disabled until then.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Signed in with a single choice; the center list handles its own.
  useEffect(() => {
    if (state?.done) {
      router.push(state.done);
      router.refresh();
    }
  }, [state?.done, router]);

  const error = state?.error ?? (notStaff && !state ? NOT_STAFF : null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">Dive Center Backoffice</h1>
        {state?.choose ? (
          <>
            <p className="mt-1 text-sm text-zinc-500">Which center?</p>
            <CenterList
              mode="login"
              selectionToken={state.choose.selectionToken}
              tenants={state.choose.tenants}
              platform={state.choose.platform}
            />
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-zinc-500">Sign in with your staff account.</p>

            {/* method="post" so a native fallback submit never puts credentials in the URL. */}
            <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-zinc-700">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </label>
              <label className="block text-sm font-medium text-zinc-700">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </label>

              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!hydrated || pending || !!state?.done}
                className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {pending || state?.done ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
