import { API_URL, forwardedFor } from "@/lib/forwarded";
import { getT } from "@/lib/i18n/server";
import type { InvitationPreview } from "@/lib/platform";

// The public invitation API: no session, the token is the credential.

// null for an unknown link (or a deactivated center).
export async function previewInvitation(token: string): Promise<InvitationPreview | null> {
  const res = await fetch(`${API_URL}/invitations/${encodeURIComponent(token)}`, {
    headers: await forwardedFor(),
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error((await getT())("The invitation could not be read ({status})", { status: res.status }));
  return res.json() as Promise<InvitationPreview>;
}

export async function acceptInvitation(
  token: string,
  body: { name?: string; password?: string; currentPassword?: string },
): Promise<{ ok: true; signInUrl: string } | { ok: false; error: string }> {
  const res = await fetch(`${API_URL}/invitations/${encodeURIComponent(token)}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await forwardedFor()) },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  const t = await getT();
  if (!res) return { ok: false, error: t("The server could not be reached") };
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    return { ok: false, error: message ?? t("The invitation could not be accepted") };
  }
  return { ok: true, signInUrl: data.signInUrl };
}
