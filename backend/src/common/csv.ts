import { BadRequestException } from '@nestjs/common';

// CSV for the bulk imports (customers, tanks). RFC 4180: quoted fields may
// hold commas, line breaks and doubled quotes. Spreadsheets in Spain save
// with ";" between fields, so the separator is whichever of "," and ";"
// the header line uses. A UTF-8 byte order mark is ignored.

export const MAX_IMPORT_ROWS = 2000;

// A file as multer hands it over (memory storage).
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (quoted) throw new BadRequestException('The CSV file has a quote that is never closed');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Blank lines (often at the end) are not rows.
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

// Header names compared loosely: "Serial Number", "serial_number" and
// "serialNumber" are the same column.
export function headerKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// The rows of a CSV upload as objects keyed by headerKey(column), each with
// its line number in the file (the header is line 1).
export function csvRecords(file: UploadedFileData | undefined) {
  if (!file) throw new BadRequestException('Attach a CSV file (field "file")');
  const text = file.buffer.toString('utf8');
  if (text.includes('\u0000')) throw new BadRequestException('The file is not a CSV text file');
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new BadRequestException('The CSV file is empty');
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new BadRequestException(`At most ${MAX_IMPORT_ROWS} rows can be imported at once; split the file`);
  }
  const keys = header.map(headerKey);
  return {
    columns: new Set(keys),
    records: rows.map((cells, i) => ({
      line: i + 2,
      get: (...names: string[]) => {
        for (const name of names) {
          const at = keys.indexOf(headerKey(name));
          if (at >= 0) {
            const value = (cells[at] ?? '').trim();
            return value === '' || value === '-' ? undefined : value;
          }
        }
        return undefined;
      },
    })),
  };
}

// "2026-03-01", "01/03/2026" or "1-3-2026" (day first) → "2026-03-01";
// undefined when it is not a real date.
export function csvDate(value: string): string | undefined {
  let y: number, m: number, d: number;
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (dmy) [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])];
  else return undefined;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return date.toISOString().slice(0, 10);
}

export interface ImportResult {
  imported: number;
  skipped: { line: number; reason: string }[];
  errors: { line: number; message: string }[];
}
