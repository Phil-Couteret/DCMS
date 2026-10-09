"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LANG, translator, type Lang, type T } from "./core";

const LangContext = createContext<Lang>(DEFAULT_LANG);

// Set once in the root layout from the request's language.
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

// t() for client components.
export function useT(): T {
  const lang = useLang();
  return useMemo(() => translator(lang), [lang]);
}
