import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportIncident } from "@/components/dive-logs/incident-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, getDiveLog } from "@/lib/api";
import { ACTIVITY_LABELS } from "@/lib/bookings";
import { centerClock, zoneLabel } from "@/lib/center-time";
import { formatDay, SEVERITY_LABELS, SEVERITY_STYLES } from "@/lib/dive-logs";
import { centerLocale } from "@/lib/center";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

function orDash(value: number | string | null, unit = "") {
  return value === null || value === "" ? "—" : `${value}${unit}`;
}

// "08 Oct, 09:30" in center time.
function signedAtFormat(timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
  timeZone,
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
}

export default async function DiveLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { timeZone } = await centerLocale();
  const t = await getT();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let log;
  try {
    log = await getDiveLog(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const signed = log.signatures.length;
  const total = log.participants.length;

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/dive-logs" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        ← {t("All dive logs")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {t("Dive log")} <span className="font-mono">{log.logNumber}</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatDay(log.date)} · {log.site.nameEn} · {centerClock(timeZone, log.entryTime)}–{centerClock(timeZone, log.exitTime)}
          </p>
        </div>
        <span title={t("Coming soon")}>
          <Button variant="outline" disabled>
            {t("Download PDF")}
          </Button>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Dive")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100">
              <Row label={t("Booking")}>
                <Link href={`/dashboard/bookings/${log.booking.id}`} prefetch={false} className="hover:underline">
                  {ACTIVITY_LABELS[log.booking.activityType] ? t(ACTIVITY_LABELS[log.booking.activityType]) : log.booking.activityType}
                </Link>
              </Row>
              <Row label={t("Site")}>{log.site.nameEn}</Row>
              <Row label={t("Guide")}>{log.guide ? `${log.guide.firstName} ${log.guide.lastName}` : "—"}</Row>
              <Row label={t("Entry / exit")}>
                {centerClock(timeZone, log.entryTime)} – {centerClock(timeZone, log.exitTime)} (
                {t("{zone} time", { zone: zoneLabel(timeZone) })})
              </Row>
              <Row label={t("Duration")}>{t("{count} min", { count: log.duration })}</Row>
              <Row label={t("Max depth")}>{log.maxDepth} m</Row>
              <Row label={t("Average depth")}>{orDash(log.avgDepth, " m")}</Row>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("Conditions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100">
              <Row label={t("Visibility")}>{orDash(log.visibility, " m")}</Row>
              <Row label={t("Water temperature")}>{orDash(log.waterTemp, " °C")}</Row>
              <Row label={t("Weather")}>{orDash(log.weatherConditions)}</Row>
              <Row label={t("Sea")}>{orDash(log.seaConditions)}</Row>
              <Row label={t("Air")}>
                {log.airStartBar === null && log.airEndBar === null
                  ? "—"
                  : `${orDash(log.airStartBar)} → ${orDash(log.airEndBar)} bar`}
              </Row>
              <Row label={t("Notes")}>
                <span className="whitespace-pre-wrap">{orDash(log.notes)}</span>
              </Row>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Participants")}</CardTitle>
            <CardDescription>{t("{count} on this dive", { count: total })}</CardDescription>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="text-sm text-zinc-500">{t("No participants recorded.")}</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {log.participants.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/dashboard/customers/${p.customer.id}`} prefetch={false} className="hover:underline">
                      {p.customer.firstName} {p.customer.lastName}
                    </Link>
                    <Badge variant="secondary" className="capitalize">
                      {t(p.role)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("Signatures")}</CardTitle>
            <CardDescription>
              {total === 1
                ? t("{signed} of 1 participant signed", { signed })
                : t("{signed} of {total} participants signed", { signed, total })}
              {total > 0 && signed < total && (
                <span className="ml-1 font-medium text-amber-700">· {t("missing {count}", { count: total - signed })}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signed === 0 ? (
              <p className="text-sm text-zinc-500">{t("No signatures yet.")}</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {log.signatures.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {s.signerName} <span className="text-xs capitalize text-zinc-500">({t(s.signerType)})</span>
                    </span>
                    <span className="text-zinc-500">{signedAtFormat(timeZone).format(new Date(s.signedAt))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={log.incident ? "ring-red-300" : undefined}>
        <CardHeader>
          <CardTitle>{t("Incident")}</CardTitle>
        </CardHeader>
        <CardContent>
          {log.incident ? (
            <dl className="divide-y divide-zinc-100">
              <Row label={t("Type")}>{log.incident.type}</Row>
              <Row label={t("Severity")}>
                <Badge className={SEVERITY_STYLES[log.incident.severity]}>{t(SEVERITY_LABELS[log.incident.severity])}</Badge>
              </Row>
              <Row label={t("Description")}>
                <span className="whitespace-pre-wrap">{log.incident.description}</span>
              </Row>
              <Row label={t("Actions taken")}>
                <span className="whitespace-pre-wrap">{log.incident.actionsTaken}</span>
              </Row>
              <Row label={t("Reported to authorities")}>{log.incident.reportedToAuthorities ? t("Yes") : t("No")}</Row>
            </dl>
          ) : (
            <ReportIncident logId={log.id} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
