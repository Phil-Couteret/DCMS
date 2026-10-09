import Link from "next/link";
import { auth } from "@/auth";
import { StaffStatusBadge } from "@/components/staff/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStaff } from "@/lib/api";
import { getT } from "@/lib/i18n/server";
import { formatDay, STAFF_STATUSES, STAFF_TYPES, STATUS_LABELS, TYPE_LABELS } from "@/lib/staff";

export const dynamic = "force-dynamic";

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const t = await getT();
  const isAdmin = (await auth())?.user.role === "ADMIN";
  const type = STAFF_TYPES.find((ty) => ty === one(params.type));
  const status = STAFF_STATUSES.find((s) => s === one(params.status));
  const filtered = Boolean(type || status);

  let staff;
  let loadError: string | null = null;
  try {
    staff = await getStaff({ type, status });
  } catch (e) {
    loadError = (e as Error).message;
  }

  return (
    <main className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Staff")}</h1>
        {isAdmin && (
          <Button nativeButton={false} render={<Link href="/dashboard/staff/new" prefetch={false} />}>
            {t("New staff")}
          </Button>
        )}
      </div>

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl bg-white p-4 ring-1 ring-zinc-200 sm:grid-cols-2 lg:grid-cols-[repeat(2,minmax(0,14rem))_auto]">
        <label className="block text-sm font-medium text-zinc-700">
          {t("Type")}
          <select name="type" defaultValue={type ?? ""} className={control}>
            <option value="">{t("All types")}</option>
            {STAFF_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(TYPE_LABELS[ty])}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Status")}
          <select name="status" defaultValue={status ?? ""} className={control}>
            <option value="">{t("All statuses")}</option>
            {STAFF_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_LABELS[s])}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit">{t("Filter")}</Button>
          {filtered && (
            <Link href="/dashboard/staff" prefetch={false} className="px-2 py-2 text-sm text-zinc-600 hover:text-zinc-900">
              {t("Clear")}
            </Link>
          )}
        </div>
      </form>

      {loadError || !staff ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {t("Staff could not be loaded: {error}", { error: loadError ?? "" })}
        </p>
      ) : staff.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">{t("No staff found")}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {filtered ? t("No staff member matches these filters.") : t("There are no staff members yet.")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Type")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead>{t("Phone")}</TableHead>
                <TableHead>{t("Hire Date")}</TableHead>
                <TableHead className="text-right">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.firstName} {s.lastName}
                  </TableCell>
                  <TableCell>{t(TYPE_LABELS[s.type])}</TableCell>
                  <TableCell>
                    <StaffStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell>
                    {s.phone ? (
                      <a href={`tel:${s.phone.replace(/\s+/g, "")}`} className="hover:underline">
                        {s.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{formatDay(s.hireDate)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      nativeButton={false}
                      render={<Link href={`/dashboard/staff/${s.id}`} prefetch={false} />}
                    >
                      {t("View")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
