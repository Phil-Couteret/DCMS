import { auth } from "@/auth";
import { ChangePasswordButton } from "@/components/dashboard/change-password-button";
import { BreachesNavLink, CenterNavLinks, SettingsNavLink, SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex flex-col gap-4 print:hidden border-b border-white/10 bg-[#023e8a] p-4 text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-3">
          <p className="text-sm font-semibold text-white">Dive Center Backoffice</p>
          {session?.user?.tenantName && <p className="truncate text-xs text-white/80">{session.user.tenantName}</p>}
        </div>
        <SidebarNav />
        <div className="flex gap-1 md:mt-auto md:flex-col">
          <SettingsNavLink />
          {session?.user?.role === "ADMIN" && <BreachesNavLink />}
          <CenterNavLinks
            canSwitch={session?.user?.canSwitchCenter ?? false}
            superadmin={session?.user?.isSuperadmin ?? false}
          />
          <ChangePasswordButton />
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
