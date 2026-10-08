import { BreachStatus } from '../generated/prisma/enums.js';

// GDPR Art. 33: report to the supervisory authority within 72 hours of
// becoming aware of the breach.
export const REPORTING_DEADLINE_HOURS = 72;

export const DATA_TYPES = [
  'customer_data',
  'booking_data',
  'financial_data',
  'equipment_data',
  'staff_data',
  'certification_data',
  'medical_data',
] as const;

export const STATUS_ORDER: BreachStatus[] = [
  BreachStatus.DETECTED,
  BreachStatus.ASSESSED,
  BreachStatus.REPORTED,
  BreachStatus.RESOLVED,
];

// Forward only; steps may be skipped.
export function canMove(from: BreachStatus, to: BreachStatus) {
  return STATUS_ORDER.indexOf(to) > STATUS_ORDER.indexOf(from);
}

export function reportingDeadline(detectedAt: Date) {
  return new Date(detectedAt.getTime() + REPORTING_DEADLINE_HOURS * 3_600_000);
}

// Still DETECTED or ASSESSED, not reported, and past the 72 hours.
export function isOverdue(
  breach: { status: BreachStatus; detectedAt: Date; reportedToAuthority: boolean },
  now = new Date(),
) {
  return (
    (breach.status === BreachStatus.DETECTED || breach.status === BreachStatus.ASSESSED) &&
    !breach.reportedToAuthority &&
    now > reportingDeadline(breach.detectedAt)
  );
}
