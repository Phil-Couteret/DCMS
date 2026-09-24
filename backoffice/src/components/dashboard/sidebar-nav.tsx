"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/bookings", label: "Bookings" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/customers", label: "Customers" },
  { href: "/dashboard/dive-logs", label: "Dive Logs" },
  { href: "/dashboard/equipment", label: "Equipment" },
  { href: "/dashboard/staff", label: "Staff" },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(({ href, label }) => {
        // Sections stay highlighted on their sub-pages, e.g. /dashboard/dive-logs/new.
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            // Every request through the proxy re-issues the Auth.js session
            // cookie. A prefetch still in flight when Sign out is clicked
            // lands after the sign-out response and restores the cookie, so
            // the redirect to /login bounces back to /dashboard. No prefetch,
            // no race.
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-[#0096c7] text-white"
                : "text-white hover:bg-white/20"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
