import { SidebarNav } from "@/components/dashboard/sidebar-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
      <aside className="border-b border-zinc-200 bg-white p-4 md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <p className="mb-4 px-3 text-sm font-semibold text-zinc-900">Dive Center Backoffice</p>
        <SidebarNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
