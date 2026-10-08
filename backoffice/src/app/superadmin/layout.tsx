import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

// The platform console's frame: no center sidebar, since it spans them all.
export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const link = "rounded-md px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20";
  return (
    <div className="min-h-screen bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-[#03045e] px-4 py-3 text-white sm:px-6">
        <div>
          <p className="text-sm font-semibold">Superadmin console</p>
          <p className="text-xs text-white/80">{session?.user.email}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/superadmin" prefetch={false} className={link}>
            Centers
          </Link>
          {session?.user.canSwitchCenter && (
            <Link href="/select-center" prefetch={false} className={link}>
              Switch center
            </Link>
          )}
          {session?.user.tenantId && (
            <Link href="/dashboard" prefetch={false} className={link}>
              Back to {session.user.tenantName}
            </Link>
          )}
          <div className="w-28">
            <SignOutButton />
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
