import { describe, expect, it } from 'vitest';
import { boatsNeeded } from './trip-rules.js';

describe('boatsNeeded', () => {
  it('no divers, no boats', () => {
    expect(boatsNeeded(0, [12, 8])).toEqual({ boats: 0, unseated: 0 });
  });

  it('fills the largest boats first, each with a captain and a guide aboard', () => {
    // 12 places seat 10 divers.
    expect(boatsNeeded(10, [8, 12])).toEqual({ boats: 1, unseated: 0 });
    expect(boatsNeeded(11, [8, 12])).toEqual({ boats: 2, unseated: 0 });
    expect(boatsNeeded(16, [8, 12])).toEqual({ boats: 2, unseated: 0 });
  });

  it('more divers than the fleet can seat: every boat, and the divers left over', () => {
    expect(boatsNeeded(20, [8, 12])).toEqual({ boats: 2, unseated: 4 });
    expect(boatsNeeded(3, [])).toEqual({ boats: 0, unseated: 3 });
  });
});
