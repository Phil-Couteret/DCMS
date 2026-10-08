import { cache } from "react";
import { auth, DEFAULT_LOCALE, type CenterLocale } from "@/auth";

// Server-side: the signed-in session's center time zone and currency, which
// dates and amounts are shown in. Client components get them as props.
export const centerLocale = cache(async (): Promise<CenterLocale> => {
  const session = await auth();
  return {
    timeZone: session?.user.timeZone ?? DEFAULT_LOCALE.timeZone,
    currency: session?.user.currency ?? DEFAULT_LOCALE.currency,
  };
});
