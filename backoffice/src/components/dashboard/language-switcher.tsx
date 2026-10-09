"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DEFAULT_LANG, isLang, LANG_COOKIE, LANGS, type Lang } from "@/lib/i18n/core";
import { useLang, useT } from "@/lib/i18n/client";

// The backoffice language, chosen per user: kept in localStorage under the
// user's id, and mirrored in a cookie so the server renders pages in it.
const key = (userId: string) => `dcms_bo_lang:${userId}`;

function setCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

function stored(userId: string): Lang {
  try {
    const value = window.localStorage.getItem(key(userId));
    return isLang(value) ? value : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function LanguageSwitcher({ userId }: { userId: string }) {
  const lang = useLang();
  const t = useT();
  const router = useRouter();

  // Another user may have used this browser last: follow this user's choice.
  useEffect(() => {
    const mine = stored(userId);
    if (mine !== lang) {
      setCookie(mine);
      router.refresh();
    }
  }, [userId, lang, router]);

  return (
    <label className="flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm text-white/90">
      <span>{t("Language")}</span>
      <select
        value={lang}
        onChange={(e) => {
          const next = e.target.value as Lang;
          try {
            window.localStorage.setItem(key(userId), next);
          } catch {
            // Private mode: the cookie still carries it for this browser.
          }
          setCookie(next);
          router.refresh();
        }}
        className="rounded border border-white/40 bg-[#023e8a] px-1.5 py-0.5 text-sm text-white outline-none focus:ring-2 focus:ring-white/60"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
