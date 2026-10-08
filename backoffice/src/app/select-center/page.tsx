import Link from "next/link";
import { auth } from "@/auth";
import { CenterList } from "@/components/dashboard/center-list";
import { getMyCenters } from "@/lib/platform";

export const dynamic = "force-dynamic";

// "Switch center": every center the account works at (all active ones for a
// superadmin) and, for a superadmin, the platform console.
export default async function SelectCenterPage() {
  const session = await auth();
  const { tenants, platform } = await getMyCenters();
  const back = session?.user.tenantId ? "/dashboard" : "/superadmin";
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">Switch center</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {session?.user.email}
          {session?.user.tenantName ? ` at ${session.user.tenantName}` : " in the superadmin console"}.
        </p>
        <CenterList mode="switch" tenants={tenants} platform={platform} currentTenantId={session?.user.tenantId ?? null} />
        <Link href={back} prefetch={false} className="mt-6 inline-block text-sm text-zinc-600 underline underline-offset-4 hover:text-zinc-900">
          Cancel
        </Link>
      </div>
    </main>
  );
}
