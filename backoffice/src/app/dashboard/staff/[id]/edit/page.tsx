import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { StaffForm } from "@/components/staff/staff-forms";
import { ApiError, getStaffMember } from "@/lib/api";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  if (!UUID.test(id)) notFound();
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect(`/dashboard/staff/${id}`);
  let member;
  try {
    member = await getStaffMember(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href={`/dashboard/staff/${id}`} prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← {member.firstName} {member.lastName}
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">{t("Edit staff profile")}</h1>
      <StaffForm staff={member} accounts={[]} cancelHref={`/dashboard/staff/${id}`} />
    </main>
  );
}
