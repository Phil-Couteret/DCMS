import { auth } from "@/auth";
import { ChangePasswordButton } from "@/components/dashboard/change-password-button";
import { BreachesNavLink, CenterNavLinks, SettingsNavLink, SidebarNav } from "@/components/dashboard/sidebar-nav";
import { LanguageSwitcher } from "@/components/dashboard/language-switcher";
import { LocationSwitcher } from "@/components/dashboard/location-switcher";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { activeLocations, chosenLocation } from "@/lib/current-location";
import { getT } from "@/lib/i18n/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const t = await getT();
  // With several locations, every page can be narrowed to one of them.
  const [locations, location] = await Promise.all([activeLocations(), chosenLocation()]);
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex flex-col gap-4 print:hidden border-b border-white/10 bg-[#023e8a] p-4 text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-3">
          <p className="text-sm font-semibold text-white">{t("Dive Center Backoffice")}</p>
          {session?.user?.tenantName && <p className="truncate text-xs text-white/80">{session.user.tenantName}</p>}
        </div>
        <SidebarNav isAdmin={isAdmin} />
        <div className="flex gap-1 md:mt-auto md:flex-col">
          <SettingsNavLink />
          {isAdmin && <BreachesNavLink />}
          <CenterNavLinks
            canSwitch={session?.user?.canSwitchCenter ?? false}
            // Not for a superadmin signed in to a center as an instructor.
            superadmin={isAdmin && (session?.user?.isSuperadmin ?? false)}
          />
          <ChangePasswordButton />
          {session?.user?.id && <LanguageSwitcher userId={session.user.id} />}
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {locations.length > 1 && (
          <div className="flex items-center justify-end border-b border-zinc-200 bg-white px-6 py-2 print:hidden md:px-8">
            <LocationSwitcher locations={locations} value={location} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
