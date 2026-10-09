// How long a medical certificate or a dive insurance is valid. With an issue
// date and a number of days, it is valid from the issue date through the last
// of those days (issued 2026-01-01 for 365 days: valid through 2026-12-31);
// otherwise until its expiry date, if one is recorded. null: unknown.
export function validUntil(issuedAt: Date | null, validDays: number | null, expiry: Date | null): Date | null {
  if (issuedAt && validDays) return new Date(issuedAt.getTime() + (validDays - 1) * 86_400_000);
  return expiry;
}

type Dated = {
  medicalCertIssuedAt: Date | null;
  medicalCertValidDays: number | null;
  medicalCertExpiry: Date | null;
  insuranceIssuedAt: Date | null;
  insuranceValidDays: number | null;
  insuranceExpiry: Date | null;
};

export const medicalCertValidUntil = (c: Pick<Dated, 'medicalCertIssuedAt' | 'medicalCertValidDays' | 'medicalCertExpiry'>) =>
  validUntil(c.medicalCertIssuedAt, c.medicalCertValidDays, c.medicalCertExpiry);

export const insuranceValidUntil = (c: Pick<Dated, 'insuranceIssuedAt' | 'insuranceValidDays' | 'insuranceExpiry'>) =>
  validUntil(c.insuranceIssuedAt, c.insuranceValidDays, c.insuranceExpiry);

// The fields to select to work both out.
export const VALIDITY_SELECT = {
  medicalCertIssuedAt: true,
  medicalCertValidDays: true,
  medicalCertExpiry: true,
  insuranceIssuedAt: true,
  insuranceValidDays: true,
  insuranceExpiry: true,
} as const;
