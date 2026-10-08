"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const input =
  "mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

// Partners sign in with their contact email or API key, and the API secret
// the dive center gave them.
export default function PartnerLoginPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  // Until React hydrates, onSubmit is not attached and the browser would
  // submit the form natively. Keep the button disabled until then.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(false);
    const form = new FormData(e.currentTarget);
    const result = await signIn("partner", {
      identifier: form.get("identifier"),
      apiSecret: form.get("apiSecret"),
      redirect: false,
    });
    if (result?.error) {
      setError(true);
      setPending(false);
      return;
    }
    router.push("/partner");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">Partner Portal</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in with the credentials the dive center gave you.</p>

        {/* method="post" so a native fallback submit never puts credentials in the URL. */}
        <form method="post" onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-zinc-700">
            Email or API key
            <input name="identifier" required autoComplete="username" className={input} />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            API secret
            <div className="relative">
              <input
                name="apiSecret"
                type={showSecret ? "text" : "password"}
                required
                autoComplete="current-password"
                className={`${input} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute inset-y-0 right-2 my-auto h-fit text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                {showSecret ? "Hide" : "Show"}
              </button>
            </div>
            <span className="mt-1 block text-xs font-normal text-zinc-500">Your API secret is your password.</span>
          </label>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Invalid credentials, or this partner account is not active.
            </p>
          )}

          <button
            type="submit"
            disabled={!hydrated || pending}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
