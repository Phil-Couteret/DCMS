"use server";

import { acceptInvitation } from "@/lib/invitations";
import { getT } from "@/lib/i18n/server";
import { newPasswordError } from "@/lib/settings";

export type AcceptState = { error?: string; signInUrl?: string } | null;

export async function acceptAction(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const t = await getT();
  const token = String(formData.get("token") ?? "");
  if (formData.get("existing") === "1") {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    if (!currentPassword) return { error: t("Enter your current password") };
    const result = await acceptInvitation(token, { currentPassword });
    return result.ok ? { signInUrl: result.signInUrl } : { error: result.error };
  }
  const name = String(formData.get("name") ?? "").trim();
  // Passwords are not trimmed: spaces are allowed in them.
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: t("Enter your name") };
  const invalid = newPasswordError(password, String(formData.get("confirmPassword") ?? ""), t);
  if (invalid) return { error: invalid };
  const result = await acceptInvitation(token, { name, password });
  return result.ok ? { signInUrl: result.signInUrl } : { error: result.error };
}
