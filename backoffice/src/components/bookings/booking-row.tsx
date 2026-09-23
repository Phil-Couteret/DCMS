"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { TableRow } from "@/components/ui/table";

// The whole row opens the booking, except clicks on its own buttons and links.
export function BookingRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <TableRow
      className="cursor-pointer"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, a, form, input, select")) return;
        router.push(href);
      }}
    >
      {children}
    </TableRow>
  );
}
