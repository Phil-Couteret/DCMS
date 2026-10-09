"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LocationRef } from "@/lib/api";
import { useT } from "@/lib/i18n/client";
import { LOCATION_COOKIE } from "@/lib/location-cookie";

// The location the whole backoffice is narrowed to, at the top of every page.
// Kept in a cookie the server reads; changing it reloads the page without
// its own ?location= (which would override it) and without open panels,
// which may belong to another location.
export function LocationSwitcher({ locations, value }: { locations: LocationRef[]; value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useT();
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
      {t("Location")}
      <select
        value={value ?? ""}
        onChange={(e) => {
          const id = e.target.value;
          document.cookie = id
            ? `${LOCATION_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`
            : `${LOCATION_COOKIE}=; path=/; max-age=0; samesite=lax`;
          const next = new URLSearchParams(params);
          for (const name of ["location", "trip", "new", "day"]) next.delete(name);
          router.replace(next.size > 0 ? `${pathname}?${next}` : pathname);
          router.refresh();
        }}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-900"
      >
        <option value="">{t("All locations")}</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}
