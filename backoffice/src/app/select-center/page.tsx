import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { CenterList } from "@/components/dashboard/center-list";
import { getT } from "@/lib/i18n/server";
import { getMyCenters } from "@/lib/platform";
import { backofficeOrigin, hostKind, requestHost } from "@/lib/tenant-host";

export const dynamic = "force-dynamic";

// Behind the reverse proxy X-Forwarded-Proto says; without one, https in
// production and http in development.
const PROTOCOL = process.env.NODE_ENV === "production" ? "https" : "http";

// "Switch center": every center the account works at (all active ones for a
// superadmin) and, for a superadmin, the platform console.
export default async function SelectCenterPage() {
  const session = await auth();
  const tr = await getT();
  const { tenants, platform } = await getMyCenters();
  const h = await headers();
  const onCenterAddress = hostKind(requestHost(h)).kind === "center";
  const back = session?.user.tenantId ? "/dashboard" : "/superadmin";
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">{tr("Switch center")}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {session?.user.tenantName
            ? tr("Signed in as {email} at {center}.", { email: session?.user.email ?? "", center: session.user.tenantName })
            : tr("Signed in as {email} in the superadmin console.", { email: session?.user.email ?? "" })}
        </p>
        {onCenterAddress ? (
          // Each center has its own address and sign-in (cookies are
          // host-only): open the other one rather than switch here.
          <ul className="mt-6 space-y-2">
            {tenants.map((t) => (
              <li key={t.id}>
                {t.id === session?.user.tenantId ? (
                  <span className="block rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-500">
                    {t.name} · {tr("current")}
                  </span>
                ) : (
                  <a
                    href={`${backofficeOrigin(h, PROTOCOL, t.slug)}/login`}
                    className="block rounded-md border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-900 hover:border-zinc-900 hover:bg-zinc-50"
                  >
                    {t.name}
                    <span className="block text-xs font-normal text-zinc-500">{tr("Opens its own address; sign in there.")}</span>
                  </a>
                )}
              </li>
            ))}
            {platform && (
              <li>
                <a
                  href={`${backofficeOrigin(h, PROTOCOL, null)}/login`}
                  className="block rounded-md border border-dashed border-zinc-300 px-3 py-2.5 text-sm font-medium text-zinc-900 hover:border-zinc-900"
                >
                  {tr("Superadmin console")}
                </a>
              </li>
            )}
          </ul>
        ) : (
          <CenterList mode="switch" tenants={tenants} platform={platform} currentTenantId={session?.user.tenantId ?? null} />
        )}
        <Link href={back} prefetch={false} className="mt-6 inline-block text-sm text-zinc-600 underline underline-offset-4 hover:text-zinc-900">
          {tr("Cancel")}
        </Link>
      </div>
    </main>
  );
}
