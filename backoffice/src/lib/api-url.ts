// Shared by the proxy (middleware) and server code: no next/headers here.

// The API's address for this server: API_URL at run time (e.g.
// http://backend:4000 inside Docker), else NEXT_PUBLIC_API_URL.
export const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// The API is reached server to server, so it sees this server's address.
// Passing on the visitor's X-Forwarded-For (set by nginx) lets its rate
// limits count per visitor; the API believes it only from proxies it trusts
// (TRUST_PROXY).
export function forwardedFrom(headers: Headers | null | undefined): Record<string, string> {
  const value = headers?.get("x-forwarded-for");
  return value ? { "X-Forwarded-For": value } : {};
}
