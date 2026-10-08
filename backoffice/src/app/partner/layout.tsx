import { auth } from "@/auth";
import { PortalSignOutButton } from "@/components/portal/sign-out";

// The partner portal's frame. The login page has no session yet and shows
// none of it.
export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) return children;
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 bg-[#023e8a] px-6 py-3 text-white print:hidden">
        <div>
          <p className="text-sm font-semibold">Partner Portal</p>
          <p className="text-xs text-white/80">{session.user.name}</p>
        </div>
        <PortalSignOutButton />
      </header>
      {children}
    </div>
  );
}
