import Link from "next/link";
import { auth } from "@/auth";
import { BreachForm, DeleteBreachButton, StatusActions } from "@/components/breaches/forms";
import { RoutedDialog, RoutedSheet } from "@/components/routed-panel";
import { Button } from "@/components/ui/button";
import { getBreaches, type BreachStatus, type DataBreach } from "@/lib/api";
import {
  BREACH_STATUS_LABELS,
  BREACH_STATUS_STYLES,
  BREACH_STATUSES,
  DATA_TYPE_LABELS,
  hoursLeft,
  SEVERITY_LABELS,
  SEVERITY_STYLES,
} from "@/lib/breaches";
import { centerDateTime } from "@/lib/center-time";
import { centerLocale } from "@/lib/center";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const th = "px-4 py-2 font-medium";
const td = "px-4 py-2 align-top";

// The empty list under each status filter.
const EMPTY_LABELS: Record<BreachStatus, string> = {
  DETECTED: "No detected breaches",
  ASSESSED: "No assessed breaches",
  REPORTED: "No reported breaches",
  RESOLVED: "No resolved breaches",
};

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function href(params: Record<string, string | undefined>) {
  const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  return query.size > 0 ? `/dashboard/breaches?${query}` : "/dashboard/breaches";
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>{children}</span>;
}

function Stat({ label, value, tone = "text-zinc-900" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

// The 72-hour deadline, and how it stands.
async function Deadline({ breach }: { breach: DataBreach }) {
  const t = await getT();
  const { timeZone } = await centerLocale();
  if (breach.overdue) {
    return (
      <>
        {centerDateTime(timeZone, breach.reportingDeadline)}
        <span className="mt-1 block">
          <Pill className="bg-red-600 text-white">{t("Overdue")}</Pill>
        </span>
      </>
    );
  }
  if (breach.reportedToAuthority || breach.status === "RESOLVED") {
    return <span className="text-zinc-500">{breach.reportedToAuthority ? t("Met") : t("Not reported")}</span>;
  }
  const left = hoursLeft(breach.reportingDeadline);
  return (
    <>
      {centerDateTime(timeZone, breach.reportingDeadline)}
      <span className={`block text-xs ${left < 24 ? "font-medium text-amber-700" : "text-zinc-500"}`}>
        {left < 1 ? t("Less than 1 hour left") : t("{hours} h left", { hours: left })}
      </span>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-wrap text-zinc-900">{children}</dd>
    </div>
  );
}

async function Details({ breach, editHref }: { breach: DataBreach; editHref: string }) {
  const t = await getT();
  const { timeZone } = await centerLocale();
  const dataTypes = breach.affectedDataTypes.map((d) => (DATA_TYPE_LABELS[d] ? t(DATA_TYPE_LABELS[d]) : d));
  return (
    <>
      {breach.overdue && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-200">
          {t("Overdue: the 72-hour deadline to report this breach passed on {date}.", { date: centerDateTime(timeZone, breach.reportingDeadline) })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Pill className={BREACH_STATUS_STYLES[breach.status]}>{t(BREACH_STATUS_LABELS[breach.status])}</Pill>
        <Pill className={SEVERITY_STYLES[breach.severity]}>{t("{severity} severity", { severity: t(SEVERITY_LABELS[breach.severity]) })}</Pill>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("Detected")}>{centerDateTime(timeZone, breach.detectedAt)}</Field>
        <Field label={t("Report deadline")}>
          <Deadline breach={breach} />
        </Field>
        <Field label={t("Affected data")}>{dataTypes.length > 0 ? dataTypes.join(", ") : t("Not yet known")}</Field>
        <Field label={t("People affected")}>{breach.estimatedAffected?.toLocaleString("en-GB") ?? t("Not yet known")}</Field>
        <div className="sm:col-span-2">
          <Field label={t("Description")}>{breach.description}</Field>
        </div>
        <Field label={t("Reported to the authority")}>
          {breach.reportedToAuthority && breach.reportedAt ? centerDateTime(timeZone, breach.reportedAt) : t("No")}
        </Field>
        <Field label={t("Authority reference")}>{breach.authorityReference ?? "—"}</Field>
        {breach.status === "RESOLVED" && (
          <>
            <Field label={t("Resolved")}>{breach.resolutionDate ? centerDateTime(timeZone, breach.resolutionDate) : "—"}</Field>
            <div className="sm:col-span-2">
              <Field label={t("Resolution")}>{breach.resolutionDetails ?? "—"}</Field>
            </div>
          </>
        )}
        <Field label={t("Recorded by")}>
          {breach.createdBy.name ?? breach.createdBy.email}, {centerDateTime(timeZone, breach.createdAt)}
        </Field>
      </dl>
      <div className="flex flex-wrap items-start gap-2">
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={editHref} prefetch={false} scroll={false} />}>
          {t("Edit details")}
        </Button>
        {breach.status === "DETECTED" && <DeleteBreachButton breach={breach} />}
      </div>
      {breach.status !== "RESOLVED" && (
        <section className="space-y-3 border-t border-zinc-200 pt-4">
          <h3 className="font-semibold text-zinc-900">{t("Move forward")}</h3>
          <StatusActions breach={breach} />
        </section>
      )}
    </>
  );
}

export default async function BreachesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getT();
  const { timeZone } = await centerLocale();
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return (
      <main className="space-y-6 p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Data breaches")}</h1>
        <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700 ring-1 ring-zinc-200">
          {t("Only admins can see the data breach register.")}
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const rawStatus = one(params.status);
  const status = BREACH_STATUSES.includes(rawStatus as BreachStatus) ? (rawStatus as BreachStatus) : undefined;
  const open = one(params.breach);
  const editing = one(params.edit) === "1";

  let all: DataBreach[];
  try {
    all = await getBreaches();
  } catch (e) {
    return (
      <main className="space-y-6 p-6 md:p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">{t("Data breaches")}</h1>
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {t("Breaches could not be loaded: {error}", { error: e instanceof Error ? e.message : t("unknown error") })}
        </p>
      </main>
    );
  }
  const shown = status ? all.filter((b) => b.status === status) : all;
  const overdue = all.filter((b) => b.overdue);
  const count = (s: BreachStatus) => all.filter((b) => b.status === s).length;
  const selected = open && UUID.test(open) ? all.find((b) => b.id === open) : undefined;
  const listHref = href({ status });

  return (
    <main className="space-y-6 p-6 md:p-8">
      {overdue.length > 0 && (
        <div role="alert" className="rounded-xl bg-red-600 p-4 text-white shadow-sm">
          <p className="font-semibold">
            {overdue.length === 1
              ? t("1 breach is past the 72-hour reporting deadline")
              : t("{count} breaches are past the 72-hour reporting deadline", { count: overdue.length })}
          </p>
          <p className="mt-1 text-sm text-red-50">
            {t("GDPR requires notifying the supervisory authority within 72 hours of detection. Report or assess:")}{" "}
            {overdue.map((b, i) => (
              <span key={b.id}>
                {i > 0 && ", "}
                <Link href={href({ status, breach: b.id })} prefetch={false} scroll={false} className="font-medium underline">
                  {b.title}
                </Link>
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t("Data breaches")}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t("The GDPR breach register: every personal data breach, whether or not it was reported.")}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href={href({ status, breach: "new" })} prefetch={false} scroll={false} />}>
          {t("Record a breach")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("Total")} value={all.length} />
        <Stat label={t("Detected")} value={count("DETECTED")} tone="text-red-700" />
        <Stat label={t("Assessed")} value={count("ASSESSED")} tone="text-amber-700" />
        <Stat label={t("Reported")} value={count("REPORTED")} tone="text-sky-700" />
        <Stat label={t("Resolved")} value={count("RESOLVED")} tone="text-green-700" />
        <Stat label={t("Overdue")} value={overdue.length} tone={overdue.length > 0 ? "text-red-700" : "text-zinc-900"} />
      </div>

      <nav aria-label={t("Filter by status")} className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {[undefined, ...BREACH_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={href({ status: s })}
            prefetch={false}
            aria-current={s === status ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
              s === status ? "border-[#0096c7] text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {s ? t(BREACH_STATUS_LABELS[s]) : t("All")}
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center ring-1 ring-zinc-200">
          <p className="font-medium text-zinc-900">{status ? t(EMPTY_LABELS[status]) : t("No breaches recorded")}</p>
          {!status && <p className="mt-1 text-sm text-zinc-500">{t("Record any personal data breach here as soon as it is detected.")}</p>}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-zinc-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className={th}>{t("Breach")}</th>
                <th className={th}>{t("Severity")}</th>
                <th className={th}>{t("Status")}</th>
                <th className={th}>{t("Detected")}</th>
                <th className={th}>{t("Report deadline")}</th>
                <th className={`${th} text-right`}>{t("People affected")}</th>
                <th className={th}>{t("Authority")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {shown.map((b) => (
                <tr key={b.id} className={b.overdue ? "bg-red-50" : undefined}>
                  <td className={td}>
                    <Link
                      href={href({ status, breach: b.id })}
                      prefetch={false}
                      scroll={false}
                      className="font-medium text-[#0077b6] hover:underline"
                    >
                      {b.title}
                    </Link>
                  </td>
                  <td className={td}>
                    <Pill className={SEVERITY_STYLES[b.severity]}>{t(SEVERITY_LABELS[b.severity])}</Pill>
                  </td>
                  <td className={td}>
                    <Pill className={BREACH_STATUS_STYLES[b.status]}>{t(BREACH_STATUS_LABELS[b.status])}</Pill>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{centerDateTime(timeZone, b.detectedAt)}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    <Deadline breach={b} />
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{b.estimatedAffected?.toLocaleString("en-GB") ?? "—"}</td>
                  <td className={td}>
                    {b.reportedToAuthority ? (
                      <Pill className="bg-green-100 text-green-900">{b.authorityReference ?? t("Reported")}</Pill>
                    ) : (
                      <span className="text-zinc-500">{t("No")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open === "new" && (
        <RoutedDialog wide closeHref={listHref} title={t("Record a data breach")} description={t("Record it as soon as it is detected; details can be completed later.")}>
          <BreachForm breach={null} cancelHref={listHref} timeZone={timeZone} />
        </RoutedDialog>
      )}
      {selected &&
        (editing ? (
          <RoutedDialog wide closeHref={href({ status, breach: selected.id })} title={t("Edit {title}", { title: selected.title })}>
            <BreachForm breach={selected} cancelHref={href({ status, breach: selected.id })} timeZone={timeZone} />
          </RoutedDialog>
        ) : (
          <RoutedSheet closeHref={listHref} title={selected.title}>
            <Details breach={selected} editHref={href({ status, breach: selected.id, edit: "1" })} />
          </RoutedSheet>
        ))}
    </main>
  );
}
