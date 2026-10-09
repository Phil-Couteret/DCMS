import type { ImportResult } from "@/lib/api";
import { useT } from "@/lib/i18n/client";

// What a CSV import did: how many rows were added, and each row skipped or
// refused, by its line in the file (the header is line 1). Rendered by client
// components only (it uses useT). The noun is part of the translated sentence,
// so each noun used ("customer", "tank") has its own dictionary entries.
export function ImportResultView({ result, noun }: { result: ImportResult; noun: [string, string] }) {
  const { imported, skipped, errors } = result;
  const t = useT();
  return (
    <div className="space-y-3 text-sm" role="status">
      <p className="rounded-lg bg-emerald-50 p-3 font-medium text-emerald-900 ring-1 ring-emerald-200">
        {imported === 1 ? t(`1 ${noun[0]} imported`) : t(`{count} ${noun[1]} imported`, { count: imported })}
        {skipped.length > 0 &&
          (skipped.length === 1 ? t(", 1 skipped") : t(", {count} skipped", { count: skipped.length }))}
        {errors.length > 0 && t(", {count} with problems", { count: errors.length })}.
      </p>
      {errors.length > 0 && (
        <details open className="rounded-lg bg-red-50 p-3 text-red-900 ring-1 ring-red-200">
          <summary className="cursor-pointer font-medium">{t("Not imported: fix these rows and import them again")}</summary>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {errors.map((e) => (
              <li key={e.line}>
                <span className="font-medium tabular-nums">{t("Line {line}:", { line: e.line })}</span> {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
      {skipped.length > 0 && (
        <details className="rounded-lg bg-zinc-50 p-3 text-zinc-700 ring-1 ring-zinc-200">
          <summary className="cursor-pointer font-medium">{t("Skipped (already on record)")}</summary>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {skipped.map((s) => (
              <li key={s.line}>
                <span className="font-medium tabular-nums">{t("Line {line}:", { line: s.line })}</span> {s.reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
