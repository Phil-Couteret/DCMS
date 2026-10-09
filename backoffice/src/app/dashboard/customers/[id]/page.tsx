import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/bookings/status-badge";
import { ActionButton, AddCertificationForm } from "@/components/customers/profile-actions";
import { UploadDocumentForm } from "@/components/customers/documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  removeCertification,
  removeDocument,
  setApproval,
  setCertificationVerified,
  setDocumentVerified,
} from "@/app/dashboard/customers/actions";
import {
  ApiError,
  getBookings,
  getCustomer,
  getCustomerCertifications,
  getCustomerDiveHistory,
  getCustomerDocuments,
  type Booking,
} from "@/lib/api";
import { ACTIVITY_LABELS, formatBookingDate, parseGuestNotes } from "@/lib/bookings";
import { centerNow } from "@/lib/center-time";
import { DOCUMENT_TYPE_LABELS, fileSize } from "@/lib/documents";
import {
  CERT_LABELS,
  countryLabel,
  CUSTOMER_TYPE_LABELS,
  GENDER_LABELS,
  LANGUAGE_LABELS,
  RENTAL_SIZE_FIELDS,
  SKILL_LEVEL_LABELS,
} from "@/lib/customers";
import { centerLocale } from "@/lib/center";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A document expiring within this many days is flagged.
const EXPIRY_WARNING_DAYS = 30;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

const PILL_TONES = {
  green: "bg-green-50 text-green-700 ring-green-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  zinc: "bg-zinc-100 text-zinc-600 ring-zinc-200",
};

function Pill({ tone, children, title }: { tone: keyof typeof PILL_TONES; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ${PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

// An expiry date with a badge when it has passed or is close.
async function Expiry({ iso, today, soon }: { iso: string | null; today: string; soon: string }) {
  const t = await getT();
  if (!iso) return <span className="text-zinc-500">{t("Not recorded")}</span>;
  const day = iso.slice(0, 10);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {formatBookingDate(iso)}
      {day < today ? <Pill tone="red">{t("Expired")}</Pill> : day <= soon ? <Pill tone="amber">{t("Expires soon")}</Pill> : null}
    </span>
  );
}

async function Verified({ at, by }: { at: string | null; by?: string | null }) {
  const t = await getT();
  if (!at) return <Pill tone="zinc">{t("Not verified")}</Pill>;
  const when = dateTime.format(new Date(at));
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Pill tone="green">{t("Verified")}</Pill>
      <span className="text-xs text-zinc-500">
        {when}
        {by && ` ${t("by {name}", { name: by })}`}
      </span>
    </span>
  );
}

// emergencyContact is free-form JSON. The name, phone and relationship the
// form edits come first; other keys follow as label/value pairs, and anything
// that is not an object is shown as text.
async function EmergencyContact({ value }: { value: unknown }) {
  const t = await getT();
  if (value === null || value === undefined) return <>{t("Not given")}</>;
  if (typeof value === "object" && !Array.isArray(value)) {
    const { name, phone, relationship, ...others } = value as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
    const entries = Object.entries(others);
    if (!str(name) && !str(phone) && !str(relationship) && entries.length === 0) return <>{t("Not given")}</>;
    return (
      <ul className="space-y-0.5">
        {(str(name) || str(relationship)) && (
          <li>
            {str(name) ?? t("Name not given")}
            {str(relationship) && <span className="text-zinc-500"> ({str(relationship)})</span>}
          </li>
        )}
        <li>
          {str(phone) ? (
            <a href={`tel:${str(phone)}`} className="hover:underline">
              {str(phone)}
            </a>
          ) : (
            <span className="text-zinc-500">{t("No phone given")}</span>
          )}
        </li>
        {entries.map(([k, v]) => (
          <li key={k}>
            <span className="text-zinc-500">{k}:</span> {typeof v === "string" ? v : JSON.stringify(v)}
          </li>
        ))}
      </ul>
    );
  }
  return <>{typeof value === "string" ? value : JSON.stringify(value)}</>;
}

// The newest guest booking that carried a certification level: what the
// customer said when booking online, before staff saw a card.
function selfDeclaredCert(bookings: Booking[]) {
  const withLevel = bookings
    .map((b) => ({ booking: b, level: parseGuestNotes(b.notes)?.certificationLevel ?? null }))
    .filter((x): x is { booking: Booking; level: string } => x.level !== null)
    .sort((a, b) => b.booking.createdAt.localeCompare(a.booking.createdAt));
  return withLevel[0] ?? null;
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { timeZone } = await centerLocale();
  const t = await getT();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const [historyResult, bookingsResult, certsResult, docsResult] = await Promise.allSettled([
    getCustomerDiveHistory(id),
    getBookings({ customerId: id }),
    getCustomerCertifications(id),
    getCustomerDocuments(id),
  ]);
  const bookings = bookingsResult.status === "fulfilled" ? bookingsResult.value : [];
  const recentBookings = [...bookings]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);
  const certs = certsResult.status === "fulfilled" ? certsResult.value : [];
  const declared = selfDeclaredCert(bookings);
  const today = centerNow(timeZone).isoDate;
  const soon = new Date(Date.parse(`${today}T00:00:00Z`) + EXPIRY_WARNING_DAYS * 86_400_000).toISOString().slice(0, 10);
  const hasMedical = Boolean(customer.medicalCertNumber || customer.medicalCertExpiry);
  const hasInsurance = Boolean(customer.insuranceProvider || customer.insurancePolicyNumber || customer.insuranceExpiry);
  const idField = { customerId: customer.id };

  return (
    <main className="space-y-6 p-6 md:p-8">
      <Link href="/dashboard/customers" prefetch={false} className="text-sm text-zinc-600 hover:text-zinc-900">
        {t("← All customers")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            {t("Customer since {date}", { date: dateTime.format(new Date(customer.createdAt)) })}
            {!customer.isApproved && <Pill tone="amber">{t("Not approved")}</Pill>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/dashboard/bookings/new?customer=${customer.id}`} prefetch={false} />}
          >
            {t("New Booking")}
          </Button>
          <Button nativeButton={false} render={<Link href={`/dashboard/customers/${customer.id}/edit`} prefetch={false} />}>
            {t("Edit")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Profile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100">
              <Row label={t("First name")}>{customer.firstName}</Row>
              <Row label={t("Last name")}>{customer.lastName}</Row>
              <Row label={t("Email")}>
                <a href={`mailto:${customer.email}`} className="hover:underline">
                  {customer.email}
                </a>
              </Row>
              <Row label={t("Phone")}>{customer.phone ?? t("Not given")}</Row>
              <Row label={t("Nationality")}>{countryLabel(customer.country)}</Row>
              <Row label={t("Language")}>{LANGUAGE_LABELS[customer.language] ? t(LANGUAGE_LABELS[customer.language]) : customer.language}</Row>
              <Row label={t("Birthdate")}>
                {customer.birthdate ? formatBookingDate(customer.birthdate, "long") : t("Not given")}
              </Row>
              <Row label={t("Gender")}>
                {customer.gender ? (GENDER_LABELS[customer.gender] ? t(GENDER_LABELS[customer.gender]) : customer.gender) : t("Not specified")}
              </Row>
              <Row label={t("Emergency contact")}>
                <EmergencyContact value={customer.emergencyContact} />
              </Row>
              <Row label={t("Loyalty points")}>{customer.loyaltyPoints}</Row>
              <Row label={t("Last updated")}>{dateTime.format(new Date(customer.updatedAt))}</Row>
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("Classification")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-zinc-100">
                <Row label={t("Customer type")}>{CUSTOMER_TYPE_LABELS[customer.customerType] ? t(CUSTOMER_TYPE_LABELS[customer.customerType]) : customer.customerType}</Row>
                <Row label={t("Skill level")}>
                  {customer.centerSkillLevel ? (
                    t(SKILL_LEVEL_LABELS[customer.centerSkillLevel])
                  ) : (
                    <span className="text-zinc-500">{t("Not assessed")}</span>
                  )}
                </Row>
                <Row label={t("Dives logged")}>{customer.totalDives}</Row>
                <Row label={t("Online booking")}>
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    {customer.isApproved ? <Pill tone="green">{t("Approved")}</Pill> : <Pill tone="amber">{t("Not approved")}</Pill>}
                    <ActionButton
                      action={setApproval}
                      fields={{ ...idField, approve: String(!customer.isApproved) }}
                      pendingLabel={t("Saving…")}
                      variant={customer.isApproved ? "outline" : "default"}
                      confirm={customer.isApproved ? t("Revoke this customer's approval to book online?") : undefined}
                    >
                      {customer.isApproved ? t("Revoke") : t("Approve")}
                    </ActionButton>
                  </span>
                </Row>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Equipment preferences")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-zinc-100">
                <Row label={t("Own equipment")}>
                  {customer.ownEquipment ? t("Brings a complete set (tank from the center)") : t("Rents from the center")}
                </Row>
                <Row label={t("Tank")}>{customer.tankSize ?? <span className="text-zinc-500">{t("Not recorded")}</span>}</Row>
                {!customer.ownEquipment &&
                  RENTAL_SIZE_FIELDS.map((f) => (
                    <Row key={f.key} label={t(f.label)}>
                      {customer[f.key] ?? <span className="text-zinc-500">{t("Not recorded")}</span>}
                    </Row>
                  ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Certifications")}</CardTitle>
          <CardDescription>{t("Recorded by staff from the diver's card.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {certsResult.status === "rejected" ? (
            <p role="alert" className="text-sm text-red-700">
              {t("Certifications could not be loaded: {error}", { error: String((certsResult.reason as Error).message) })}
            </p>
          ) : certs.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("None recorded yet.")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Certification")}</TableHead>
                    <TableHead>{t("Card number")}</TableHead>
                    <TableHead>{t("Issued")}</TableHead>
                    <TableHead>{t("Expires")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                    <TableHead className="text-right">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certs.map((c) => {
                    const certFields = { ...idField, certId: c.id };
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {CERT_LABELS[c.level] ? t(CERT_LABELS[c.level]) : c.level}
                          <span className="font-normal text-zinc-500"> · {c.agency}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{c.cardNumber ?? "—"}</TableCell>
                        <TableCell>{c.issueDate ? formatBookingDate(c.issueDate) : "—"}</TableCell>
                        <TableCell>
                          {c.expiryDate ? <Expiry iso={c.expiryDate} today={today} soon={soon} /> : t("No expiry")}
                        </TableCell>
                        <TableCell>
                          <Verified at={c.verifiedAt} by={c.verifiedBy} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start justify-end gap-1">
                            <ActionButton
                              action={setCertificationVerified}
                              fields={{ ...certFields, verified: String(!c.verifiedAt) }}
                              pendingLabel={t("Saving…")}
                              variant={c.verifiedAt ? "ghost" : "outline"}
                            >
                              {c.verifiedAt ? t("Unverify") : t("Verify")}
                            </ActionButton>
                            <ActionButton
                              action={removeCertification}
                              fields={certFields}
                              pendingLabel={t("Removing…")}
                              variant="ghost"
                              className="text-destructive"
                              confirm={t("Remove {certification}? This cannot be undone.", { certification: `${c.agency} ${CERT_LABELS[c.level] ? t(CERT_LABELS[c.level]) : c.level}` })}
                            >
                              {t("Remove")}
                            </ActionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {declared && !certs.some((c) => c.level === declared.level) && (
            <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
              <p className="text-sm font-medium text-amber-900">
                {CERT_LABELS[declared.level] ? t(CERT_LABELS[declared.level]) : declared.level}
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                  {t("Self-declared")}
                </span>
              </p>
              <p className="mt-1 text-xs text-amber-800">
                {t("Stated by the customer when booking online on {date}.", { date: dateTime.format(new Date(declared.booking.createdAt)) })}{" "}
                {t("Not verified: check the certification card before the dive.")}
              </p>
            </div>
          )}
          <AddCertificationForm customerId={customer.id} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Medical certificate")}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasMedical ? (
              <dl className="divide-y divide-zinc-100">
                <Row label={t("Number")}>
                  {customer.medicalCertNumber ? (
                    <span className="font-mono">{customer.medicalCertNumber}</span>
                  ) : (
                    <span className="text-zinc-500">{t("Not recorded")}</span>
                  )}
                </Row>
                <Row label={t("Expires")}>
                  <Expiry iso={customer.medicalCertExpiry} today={today} soon={soon} />
                </Row>
                <Row label={t("Status")}>
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <Verified at={customer.medicalCertVerifiedAt} />
                    <ActionButton
                      action={setDocumentVerified}
                      fields={{ ...idField, kind: "medical", verified: String(!customer.medicalCertVerifiedAt) }}
                      pendingLabel={t("Saving…")}
                      variant={customer.medicalCertVerifiedAt ? "ghost" : "outline"}
                    >
                      {customer.medicalCertVerifiedAt ? t("Unverify") : t("Verify")}
                    </ActionButton>
                  </span>
                </Row>
              </dl>
            ) : (
              <p className="text-sm text-zinc-500">{t("Not recorded. Add it with Edit.")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Diving insurance")}</CardTitle>
          </CardHeader>
          <CardContent>
            {hasInsurance ? (
              <dl className="divide-y divide-zinc-100">
                <Row label={t("Provider")}>{customer.insuranceProvider ?? <span className="text-zinc-500">{t("Not recorded")}</span>}</Row>
                <Row label={t("Policy number")}>
                  {customer.insurancePolicyNumber ? (
                    <span className="font-mono">{customer.insurancePolicyNumber}</span>
                  ) : (
                    <span className="text-zinc-500">{t("Not recorded")}</span>
                  )}
                </Row>
                <Row label={t("Expires")}>
                  <Expiry iso={customer.insuranceExpiry} today={today} soon={soon} />
                </Row>
                <Row label={t("Status")}>
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <Verified at={customer.insuranceVerifiedAt} />
                    <ActionButton
                      action={setDocumentVerified}
                      fields={{ ...idField, kind: "insurance", verified: String(!customer.insuranceVerifiedAt) }}
                      pendingLabel={t("Saving…")}
                      variant={customer.insuranceVerifiedAt ? "ghost" : "outline"}
                    >
                      {customer.insuranceVerifiedAt ? t("Unverify") : t("Verify")}
                    </ActionButton>
                  </span>
                </Row>
              </dl>
            ) : (
              <p className="text-sm text-zinc-500">{t("Not recorded. Add it with Edit.")}</p>
            )}
            <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
              {customer.waiverSignedAt
                ? t("Liability waiver signed on {date}: accepted instead of insurance.", { date: formatBookingDate(customer.waiverSignedAt) })
                : t("No signed liability waiver.")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Notes")}</CardTitle>
          <CardDescription>{t("For staff only.")}</CardDescription>
        </CardHeader>
        <CardContent>
          {customer.notes ? (
            <p className="whitespace-pre-line text-sm text-zinc-900">{customer.notes}</p>
          ) : (
            <p className="text-sm text-zinc-500">{t("No notes.")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Documents")}</CardTitle>
          <CardDescription>{t("Medical certificates, insurance and certification cards the diver has provided.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {docsResult.status === "rejected" ? (
            <p role="alert" className="text-sm text-red-700">
              {t("Documents could not be loaded: {error}", { error: String((docsResult.reason as Error).message) })}
            </p>
          ) : docsResult.value.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("No documents uploaded yet.")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg ring-1 ring-zinc-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Document")}</TableHead>
                    <TableHead>{t("File")}</TableHead>
                    <TableHead className="text-right">{t("Size")}</TableHead>
                    <TableHead>{t("Uploaded")}</TableHead>
                    <TableHead className="text-right">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docsResult.value.map((d) => {
                    const href = `/dashboard/customers/${customer.id}/documents/${d.id}`;
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{t(DOCUMENT_TYPE_LABELS[d.type])}</TableCell>
                        <TableCell className="max-w-72">
                          <a href={href} target="_blank" rel="noopener" className="block truncate text-[#0077b6] hover:underline" title={d.filename}>
                            {d.filename}
                          </a>
                          <span className="text-xs text-zinc-500">{d.mimeType === "application/pdf" ? "PDF" : t("Photo")}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fileSize(d.size)}</TableCell>
                        <TableCell>{formatBookingDate(d.uploadedAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-start justify-end gap-1">
                            <Button size="sm" variant="outline" nativeButton={false} render={<a href={`${href}?download=1`} />}>
                              {t("Download")}
                            </Button>
                            <ActionButton
                              action={removeDocument}
                              fields={{ ...idField, documentId: d.id }}
                              pendingLabel={t("Deleting…")}
                              variant="ghost"
                              className="text-destructive"
                              confirm={t("Delete {name}? This cannot be undone.", { name: d.filename })}
                            >
                              {t("Delete")}
                            </ActionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <UploadDocumentForm customerId={customer.id} />
        </CardContent>
      </Card>

      <Separator />

      <section aria-labelledby="dives" className="space-y-3">
        <h2 id="dives" className="text-lg font-semibold text-zinc-900">{t("Dive history")}</h2>
        {historyResult.status === "rejected" ? (
          <p role="alert" className="text-sm text-red-700">
            {t("Dive history could not be loaded: {error}", { error: String((historyResult.reason as Error).message) })}
          </p>
        ) : historyResult.value.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("No logged dives yet.")}</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead>{t("Log")}</TableHead>
                  <TableHead>{t("Site")}</TableHead>
                  <TableHead className="text-right">{t("Max depth")}</TableHead>
                  <TableHead className="text-right">{t("Duration")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyResult.value.map((d) => (
                  <TableRow key={d.diveLogId}>
                    <TableCell>{formatBookingDate(d.date)}</TableCell>
                    <TableCell className="font-mono text-xs">{d.logNumber}</TableCell>
                    <TableCell>{d.siteName}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.maxDepth} m</TableCell>
                    <TableCell className="text-right tabular-nums">{d.duration} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section aria-labelledby="bookings" className="space-y-3">
        <h2 id="bookings" className="text-lg font-semibold text-zinc-900">{t("Booking history")}</h2>
        {bookingsResult.status === "rejected" ? (
          <p role="alert" className="text-sm text-red-700">
            {t("Bookings could not be loaded: {error}", { error: String((bookingsResult.reason as Error).message) })}
          </p>
        ) : recentBookings.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("No bookings yet.")}</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead>{t("Activity")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link href={`/dashboard/bookings/${b.id}`} prefetch={false} className="hover:underline">
                        {formatBookingDate(b.date)}
                      </Link>
                    </TableCell>
                    <TableCell>{ACTIVITY_LABELS[b.activityType] ? t(ACTIVITY_LABELS[b.activityType]) : b.activityType}</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </main>
  );
}
