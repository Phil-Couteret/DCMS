import { getT } from "@/lib/i18n/server";
import { previewInvitation } from "@/lib/invitations";
import { AcceptForm } from "./accept-form";

export const dynamic = "force-dynamic";


// The page an invitation email links to. Public: the token in the address
// is the credential.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await previewInvitation(token);
  const t = await getT();

  let body: React.ReactNode;
  if (!invitation) {
    body = <p className="mt-2 text-sm text-zinc-600">{t("This invitation link is not valid. Check that you copied all of it.")}</p>;
  } else if (invitation.status === "ACCEPTED") {
    body = (
      <p className="mt-2 text-sm text-zinc-600">
        {t("This invitation has already been used.")}{" "}
        <a href={invitation.signInUrl} className="font-medium text-zinc-900 underline">
          {t("Sign in")}
        </a>
        .
      </p>
    );
  } else if (invitation.status !== "PENDING") {
    body = (
      <p className="mt-2 text-sm text-zinc-600">
        {t(
          invitation.status === "EXPIRED"
            ? "This invitation has expired. Ask {center} for a new invitation."
            : "This invitation has been replaced by a newer one. Ask {center} for a new invitation.",
          { center: invitation.tenant.name },
        )}
      </p>
    );
  } else if (invitation.customerAccount) {
    body = (
      <p className="mt-2 text-sm text-zinc-600">
        {t("{email} belongs to a customer account and cannot be used for staff. Ask to be invited with another email.", {
          email: invitation.email,
        })}
      </p>
    );
  } else {
    body = (
      <>
        <p className="mt-1 text-sm text-zinc-500">
          {t(
            invitation.role === "ADMIN"
              ? "{email} is invited to join {center} as an admin."
              : "{email} is invited to join {center} as an instructor.",
            { email: invitation.email, center: invitation.tenant.name },
          )}
        </p>
        <AcceptForm token={token} invitation={invitation} />
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">
          {invitation ? t("Join {center}", { center: invitation.tenant.name }) : t("Invitation")}
        </h1>
        {body}
      </div>
    </main>
  );
}
