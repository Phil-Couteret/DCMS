import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { StaffForm } from "@/components/staff/staff-forms";
import { getUsers } from "@/lib/api";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// A staff profile for one of the center's staff accounts that has none yet.
// Admins only (the API refuses others too).
export default async function NewStaffPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard/staff");
  const users = await getUsers();
  const t = await getT();
  const accounts = users
    .filter((u) => u.role !== "CUSTOMER" && u.isActive && !u.staffId)
    .map((u) => ({ id: u.id, label: u.name ? `${u.name} (${u.email})` : u.email }));
  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/staff" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        {t("← All staff")}
      </Link>
      <h1 className="text-2xl font-semibold text-zinc-900">{t("New staff profile")}</h1>
      <StaffForm staff={null} accounts={accounts} cancelHref="/dashboard/staff" />
    </main>
  );
}
