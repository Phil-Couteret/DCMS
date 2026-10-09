"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";

// A list of divers with a search box over their names: the rows are rendered
// on the server and only filtered here.
export function DiverSearch({ rows }: { rows: { key: string; name: string; node: React.ReactNode }[] }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  return (
    <div className="space-y-2">
      <label className="block max-w-sm text-sm font-medium text-zinc-700">
        <span className="sr-only">{t("Search divers")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search divers…")}
          className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
        />
      </label>
      {shown.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("No unassigned diver matches “{query}”.", { query: query.trim() })}</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {shown.map((r) => (
            <li key={r.key} className="flex flex-wrap items-start justify-between gap-3 py-3">
              {r.node}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
