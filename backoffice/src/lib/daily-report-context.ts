import { getSettings } from "@/lib/api";
import { centerLocale } from "@/lib/center";
import type { ReportContext } from "@/lib/daily-report-html";
import { getLang, getT } from "@/lib/i18n/server";

// What the daily report HTML needs besides the day: the language of the
// request, the center's currency, time zone, name and address.
export async function reportContext(): Promise<ReportContext> {
  const [t, lang, { currency, timeZone }, settings] = await Promise.all([getT(), getLang(), centerLocale(), getSettings().catch(() => null)]);
  return { t, lang, currency, timeZone, center: { name: settings?.name ?? "", address: settings?.address ?? null } };
}
