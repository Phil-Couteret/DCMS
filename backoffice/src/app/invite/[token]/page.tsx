import { previewInvitation } from "@/lib/invitations";
import { AcceptForm } from "./accept-form";

export const dynamic = "force-dynamic";

const ROLE = { ADMIN: "an admin", INSTRUCTOR: "an instructor" } as const;

// The page an invitation email links to. Public: the token in the address
// is the credential.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await previewInvitation(token);

  let body: React.ReactNode;
  if (!invitation) {
    body = <p className="mt-2 text-sm text-zinc-600">This invitation link is not valid. Check that you copied all of it.</p>;
  } else if (invitation.status === "ACCEPTED") {
    body = (
      <p className="mt-2 text-sm text-zinc-600">
        This invitation has already been used.{" "}
        <a href={invitation.signInUrl} className="font-medium text-zinc-900 underline">
          Sign in
        </a>
        .
      </p>
    );
  } else if (invitation.status !== "PENDING") {
    body = (
      <p className="mt-2 text-sm text-zinc-600">
        This invitation has {invitation.status === "EXPIRED" ? "expired" : "been replaced by a newer one"}. Ask{" "}
        {invitation.tenant.name} for a new invitation.
      </p>
    );
  } else if (invitation.customerAccount) {
    body = (
      <p className="mt-2 text-sm text-zinc-600">
        {invitation.email} belongs to a customer account and cannot be used for staff. Ask to be invited with another email.
      </p>
    );
  } else {
    body = (
      <>
        <p className="mt-1 text-sm text-zinc-500">
          {invitation.email} is invited to join {invitation.tenant.name} as {ROLE[invitation.role]}.
        </p>
        <AcceptForm token={token} invitation={invitation} />
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">
          {invitation ? `Join ${invitation.tenant.name}` : "Invitation"}
        </h1>
        {body}
      </div>
    </main>
  );
}
