import { mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

// Where customer documents are kept: UPLOAD_DIR (default: "uploads" beside
// the backend folder, /data/dcms/app/uploads here), then
// {tenantId}/{customerId}/{documentId}{extension}. Names on disk come from
// ids only; the uploaded name is kept in the database for display.

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export function uploadRoot() {
  return resolve(process.env.UPLOAD_DIR || resolve(process.cwd(), '..', 'uploads'));
}

// The absolute path of a stored document, refusing anything outside the
// upload folder.
export function documentPath(storagePath: string) {
  const root = uploadRoot();
  const full = resolve(root, storagePath);
  const rel = relative(root, full);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Document path outside the upload folder: ${storagePath}`);
  return full;
}

export async function saveDocument(storagePath: string, data: Buffer) {
  const full = documentPath(storagePath);
  await mkdir(join(full, '..'), { recursive: true, mode: 0o700 });
  // "wx": never replaces a file.
  await writeFile(full, data, { flag: 'wx', mode: 0o600 });
}

export async function deleteDocumentFile(storagePath: string) {
  await unlink(documentPath(storagePath)).catch((e: NodeJS.ErrnoException) => {
    if (e.code !== 'ENOENT') throw e;
  });
}

// A customer's folder, when the customer is deleted.
export async function deleteCustomerFolder(tenantId: string, customerId: string) {
  await rm(documentPath(join(tenantId, customerId)), { recursive: true, force: true });
}

// The document's type from its first bytes; the browser's claim is not used.
// PDFs and photos (JPEG, PNG, WebP) only.
const KINDS = [
  { mimeType: 'application/pdf', ext: '.pdf', test: (b: Buffer) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { mimeType: 'image/jpeg', ext: '.jpg', test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mimeType: 'image/png',
    ext: '.png',
    test: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimeType: 'image/webp',
    ext: '.webp',
    test: (b: Buffer) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

export function documentKind(data: Buffer) {
  return KINDS.find((k) => k.test(data)) ?? null;
}

// The uploaded name, for display and downloads: no folders, no control
// characters, at most 200 characters (keeping the extension).
export function displayName(name: string | undefined, ext: string) {
  const base = [...((name ?? '').split(/[\\/]/).pop() ?? '')]
    .filter((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f && c !== '"')
    .join('')
    .trim();
  if (!base) return `document${ext}`;
  if (base.length <= 200) return base;
  const dot = base.lastIndexOf('.');
  const tail = dot > 0 && base.length - dot <= 10 ? base.slice(dot) : '';
  return base.slice(0, 200 - tail.length) + tail;
}
