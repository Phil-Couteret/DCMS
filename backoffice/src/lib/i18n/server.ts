import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, translator, type Lang } from "./core";

// The language of this request (the cookie the language switcher sets).
export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

// t() for server components and server actions.
export async function getT() {
  return translator(await getLang());
}
