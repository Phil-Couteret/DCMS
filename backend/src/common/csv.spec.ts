import { describe, expect, it } from 'vitest';
import { csvDate, csvRecords, parseCsv } from './csv.js';

describe('parseCsv', () => {
  it('reads quoted fields, doubled quotes, line breaks and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi""\nthere"\n\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
    ]);
  });

  it('uses ";" when the header does, and ignores a byte order mark', () => {
    expect(parseCsv('﻿name;city\nAna;Las Palmas, GC')).toEqual([
      ['name', 'city'],
      ['Ana', 'Las Palmas, GC'],
    ]);
  });

  it('refuses an unclosed quote', () => {
    expect(() => parseCsv('a\n"open')).toThrow(/never closed/);
  });
});

describe('csvRecords', () => {
  it('matches columns loosely and treats "-" and blanks as empty', () => {
    const file = { originalname: 'x.csv', mimetype: 'text/csv', size: 0, buffer: Buffer.from('Serial Number,first_name\nA1,-\n') };
    const { records } = csvRecords(file);
    expect(records[0].line).toBe(2);
    expect(records[0].get('serialNumber')).toBe('A1');
    expect(records[0].get('firstName')).toBeUndefined();
  });
});

describe('csvDate', () => {
  it('reads ISO and day-first dates, and rejects impossible ones', () => {
    expect(csvDate('2026-03-01')).toBe('2026-03-01');
    expect(csvDate('01/03/2026')).toBe('2026-03-01');
    expect(csvDate('1.3.2026')).toBe('2026-03-01');
    expect(csvDate('31/02/2026')).toBeUndefined();
    expect(csvDate('March 1')).toBeUndefined();
  });
});
