import { MESSAGES } from "./messages";

// Backoffice translations. The English text is the key: t("Bookings") looks it
// up in the Spanish or French dictionary and falls back to the English text
// when there is no entry, so nothing ever shows a raw key. Placeholders are
// {name}: t("{count} bookings", { count: 3 }).
//
// Where t comes from: server components and server actions, getT() from
// "@/lib/i18n/server"; client components, useT() from "@/lib/i18n/client".

export const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
] as const;

export type Lang = (typeof LANGS)[number]["code"];

export const DEFAULT_LANG: Lang = "en";

// Mirrors the user's choice (kept in localStorage, per user) so pages render
// on the server in that language.
export const LANG_COOKIE = "bo_lang";

export type Vars = Record<string, string | number>;
export type T = (text: string, vars?: Vars) => string;

export function isLang(value: unknown): value is Lang {
  return LANGS.some((l) => l.code === value);
}

export function translate(lang: Lang, text: string, vars?: Vars): string {
  const found = lang === "en" ? text : (MESSAGES[lang][text] ?? text);
  return vars ? found.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : found;
}

export function translator(lang: Lang): T {
  return (text, vars) => translate(lang, text, vars);
}

// BCP 47 locale for dates and numbers in the chosen language.
export const INTL_LOCALE: Record<Lang, string> = { en: "en-GB", es: "es-ES", fr: "fr-FR" };
