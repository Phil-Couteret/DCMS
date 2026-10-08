import { headers } from "next/headers";
import { forwardedFrom } from "@/lib/api-url";

export { API_URL } from "@/lib/api-url";

// The visitor's X-Forwarded-For, in server components, actions and route
// handlers (see api-url.ts). Outside a request nothing is sent.
export async function forwardedFor(): Promise<Record<string, string>> {
  try {
    return forwardedFrom(await headers());
  } catch {
    return {};
  }
}
