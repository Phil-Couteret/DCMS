import { describe, expect, it } from 'vitest';
import { BreachStatus } from '../generated/prisma/enums.js';
import { canMove, isOverdue, reportingDeadline } from './breach-rules.js';

const { DETECTED, ASSESSED, REPORTED, RESOLVED } = BreachStatus;
const detectedAt = new Date('2026-10-01T10:00:00Z');
const hoursLater = (h: number) => new Date(detectedAt.getTime() + h * 3_600_000);

describe('canMove', () => {
  it('moves forward, skipping steps if needed', () => {
    expect(canMove(DETECTED, ASSESSED)).toBe(true);
    expect(canMove(DETECTED, REPORTED)).toBe(true);
    expect(canMove(ASSESSED, RESOLVED)).toBe(true);
    expect(canMove(REPORTED, RESOLVED)).toBe(true);
  });

  it('never moves back or stays put', () => {
    expect(canMove(ASSESSED, DETECTED)).toBe(false);
    expect(canMove(RESOLVED, REPORTED)).toBe(false);
    expect(canMove(REPORTED, REPORTED)).toBe(false);
  });
});

describe('isOverdue', () => {
  const breach = (status: BreachStatus, reportedToAuthority = false) => ({ status, detectedAt, reportedToAuthority });

  it('gives 72 hours from detection', () => {
    expect(reportingDeadline(detectedAt).toISOString()).toBe('2026-10-04T10:00:00.000Z');
    expect(isOverdue(breach(DETECTED), hoursLater(72))).toBe(false);
    expect(isOverdue(breach(DETECTED), hoursLater(72.01))).toBe(true);
    expect(isOverdue(breach(ASSESSED), hoursLater(100))).toBe(true);
  });

  it('is never overdue once reported or resolved', () => {
    expect(isOverdue(breach(REPORTED, true), hoursLater(100))).toBe(false);
    expect(isOverdue(breach(RESOLVED), hoursLater(100))).toBe(false);
    expect(isOverdue(breach(ASSESSED, true), hoursLater(100))).toBe(false);
  });
});
