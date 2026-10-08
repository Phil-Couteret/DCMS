"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { apiPost, auth, signIn, SUPERADMIN_ROLE, type CenterChoice, type LoginReply } from "@/auth";
import { forwardedFrom } from "@/lib/api-url";
import { hostSlug, requestHost } from "@/lib/tenant-host";

// Signing in to a center, choosing one ("Which center?") and switching
// center all end the same way: the API issues a token for one center (or the
// superadmin console) and it becomes the session.

export type CenterChoiceState = {
  error?: string;
  // Set when the login must choose a center.
  choose?: { selectionToken: string; tenants: CenterChoice[]; platform: boolean };
  // Where to go once signed in.
  done?: string;
} | null;

async function useToken(accessToken: string, role: string): Promise<CenterChoiceState> {
  try {
    await signIn("token", { accessToken, redirect: false });
  } catch (e) {
    if (e instanceof AuthError && (e as AuthError & { code?: string }).code === "not_staff") {
      return { error: "This account is not a staff account. Customers use the public website." };
    }
    if (e instanceof AuthError) return { error: "Could not sign in" };
    throw e;
  }
  return { done: role === SUPERADMIN_ROLE ? "/superadmin" : "/dashboard" };
}

export async function beginLogin(_prev: CenterChoiceState, formData: FormData): Promise<CenterChoiceState> {
  // On a center's own address, the sign-in is for that center.
  const h = await headers();
  const reply = await apiPost<LoginReply>(
    "/auth/login",
    { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") },
    undefined,
    hostSlug(requestHost(h)),
    forwardedFrom(h),
  );
  if (!reply.ok) {
    // 403: the right password, but no access to the center of this address.
    if (reply.status === 403) return { error: "This account has no access to this center." };
    if (reply.status === 429) return { error: "Too many sign-in attempts. Wait a few minutes and try again." };
    return { error: reply.status === 0 ? reply.message : "Invalid credentials" };
  }
  if ("requiresTenantSelection" in reply.data) {
    const { selectionToken, tenants, platform } = reply.data;
    return { choose: { selectionToken, tenants, platform } };
  }
  return useToken(reply.data.accessToken, reply.data.user.role);
}

// The center picked on the login page. An empty tenantId is the console.
export async function chooseCenter(prev: CenterChoiceState, formData: FormData): Promise<CenterChoiceState> {
  const tenantId = String(formData.get("tenantId") ?? "") || null;
  const reply = await apiPost<LoginReply>(
    "/auth/select-tenant",
    { selectionToken: String(formData.get("selectionToken") ?? ""), tenantId },
    undefined,
    null,
    forwardedFrom(await headers()),
  );
  if (!reply.ok) return { ...prev, error: reply.message };
  if ("requiresTenantSelection" in reply.data) return { error: "Could not sign in" };
  return useToken(reply.data.accessToken, reply.data.user.role);
}

// "Switch center" for a signed-in account. An empty tenantId is the console.
export async function switchCenter(_prev: CenterChoiceState, formData: FormData): Promise<CenterChoiceState> {
  const session = await auth();
  if (!session?.accessToken) return { error: "Your session has expired: sign in again" };
  const tenantId = String(formData.get("tenantId") ?? "") || null;
  const reply = await apiPost<LoginReply>("/auth/switch-tenant", { tenantId }, session.accessToken);
  if (!reply.ok) return { error: reply.message };
  if ("requiresTenantSelection" in reply.data) return { error: "Could not switch center" };
  return useToken(reply.data.accessToken, reply.data.user.role);
}
