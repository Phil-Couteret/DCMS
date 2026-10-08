"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LocationRef } from "@/lib/api";

// "All locations" or one of them, kept in the page's ?location= parameter:
// changing it reloads the page with the other parameters as they were. The
// open panels (a trip, the new-trip form) close, since they may belong to
// another location.
export function LocationFilter({ locations, value }: { locations: LocationRef[]; value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
      Location
      <select
        value={value ?? ""}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          for (const panel of ["trip", "new", "day"]) next.delete(panel);
          if (e.target.value) next.set("location", e.target.value);
          else next.delete("location");
          router.push(`${pathname}?${next}`);
        }}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
      >
        <option value="">All locations</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
