// Deep Blue Diving sample data (from 002_sample_data.sql), adapted to the
// NestJS/Prisma schema. Safe to run repeatedly: existing records are skipped.
//
// Run from the backend directory (it reads the backend .env):
//   cd /data/dcms/app/backend && node scripts/seed-sample-data.mjs
//
// Records go through the API (API_URL, default http://localhost:4000). The only
// direct SQL is giving staff accounts the INSTRUCTOR role, which no endpoint does.
// New accounts get the password SEED_PASSWORD (default DeepBlue2025!).

import 'dotenv/config';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const API = process.env.API_URL ?? 'http://localhost:4000';
const PASSWORD = process.env.SEED_PASSWORD ?? 'DeepBlue2025!';

// Not in the original data: the schema requires a registration number.
const BOATS = ['White Magic', 'Grey Magic', 'Black Magic', 'Blue Magic'].map((name) => ({
  name,
  capacity: 10,
  status: 'active',
  registrationNumber: `TBD-${name.toUpperCase().replace(' ', '-')}`,
}));

// Coordinates, visibility in metres, water temperatures and travel times are
// approximations; the original data only gave depth, difficulty, current and a
// visibility grade. requiredCertLevel: 0 Open Water, 1 Advanced.
const SITES = [
  {
    name: 'Castillo Reef', depthMin: 5, depthMax: 18, difficultyLevel: 3, requiredCertLevel: 0,
    typicalCurrent: 'moderate', typicalVisibility: 20, latitude: 28.3905, longitude: -13.8520, travelTimeMinutes: 10,
  },
  {
    name: 'Salinas Reef', depthMin: 8, depthMax: 25, difficultyLevel: 3, requiredCertLevel: 1,
    typicalCurrent: 'moderate', typicalVisibility: 30, latitude: 28.3700, longitude: -13.8600, travelTimeMinutes: 15,
  },
  {
    name: 'Nuevo Horizonte Reef', depthMin: 10, depthMax: 30, difficultyLevel: 4, requiredCertLevel: 1,
    typicalCurrent: 'strong', typicalVisibility: 20, latitude: 28.4100, longitude: -13.8450, travelTimeMinutes: 20,
  },
  {
    name: 'Las Playitas', depthMin: 5, depthMax: 20, difficultyLevel: 1, requiredCertLevel: 0,
    typicalCurrent: 'weak', typicalVisibility: 30, latitude: 28.2290, longitude: -13.9850, travelTimeMinutes: 0,
    accessibility: 'shore',
  },
  {
    name: 'Gran Trajaral', depthMin: 12, depthMax: 35, difficultyLevel: 4, requiredCertLevel: 1,
    typicalCurrent: 'strong', typicalVisibility: 20, latitude: 28.2080, longitude: -14.0180, travelTimeMinutes: 30,
  },
];

const CURRENT = {
  weak: { es: 'corriente débil', en: 'weak current', de: 'schwache Strömung', fr: 'courant faible' },
  moderate: { es: 'corriente moderada', en: 'moderate current', de: 'mäßige Strömung', fr: 'courant modéré' },
  strong: { es: 'corriente fuerte', en: 'strong current', de: 'starke Strömung', fr: 'courant fort' },
};

function siteDto(s) {
  const c = CURRENT[s.typicalCurrent];
  const d = `${s.depthMin}–${s.depthMax} m`;
  return {
    nameEs: s.name, nameEn: s.name, nameDe: s.name, nameFr: s.name,
    descriptionEs: `Inmersión en Fuerteventura, ${d}, ${c.es}.`,
    descriptionEn: `Fuerteventura dive, ${d}, ${c.en}.`,
    descriptionDe: `Tauchplatz auf Fuerteventura, ${d}, ${c.de}.`,
    descriptionFr: `Plongée à Fuerteventura, ${d}, ${c.fr}.`,
    latitude: s.latitude, longitude: s.longitude,
    depthMin: s.depthMin, depthMax: s.depthMax,
    requiredCertLevel: s.requiredCertLevel, difficultyLevel: s.difficultyLevel,
    typicalVisibility: s.typicalVisibility, typicalCurrent: s.typicalCurrent,
    waterTempRange: { min: 18, max: 23 },
    marineLife: [], pointsOfInterest: [], bestSeason: [], facilities: [],
    travelTimeMinutes: s.travelTimeMinutes, maxDiversPerTrip: 10,
    accessibility: s.accessibility ?? 'boat_only',
  };
}

// Original roles: instructor → TRAINER, divemaster → GUIDE. hireDate is not in
// the original data; the sample data's date (October 2025) is used.
const STAFF = [
  { email: 'instructor@deep-blue-diving.com', firstName: 'Deep', lastName: 'Blue', phone: '+34 606 275 468', type: 'TRAINER' },
  { email: 'instructor2@deep-blue-diving.com', firstName: 'Instructor', lastName: 'Staff', phone: '+34 653 512 638', type: 'TRAINER' },
  { email: 'divemaster@deep-blue-diving.com', firstName: 'Divemaster', lastName: 'Helper', phone: '+34 678 901 234', type: 'GUIDE' },
];

const CUSTOMERS = [
  {
    email: 'john.smith@example.com', firstName: 'John', lastName: 'Smith', phone: '+44 7700 900123',
    birthdate: '1985-05-15', country: 'GB', language: 'EN', customerType: 'TOURIST',
    certifications: [{ agency: 'SSI', level: 'openWater', cardNumber: 'SSI-12345', issueDate: '2022-06-10' }],
  },
  {
    email: 'maria.garcia@example.com', firstName: 'Maria', lastName: 'Garcia', phone: '+34 612 345 678',
    birthdate: '1990-08-20', country: 'ES', language: 'ES', customerType: 'LOCAL',
    certifications: [{ agency: 'SSI', level: 'advanced', cardNumber: 'SSI-67890', issueDate: '2021-08-15' }],
  },
  {
    email: 'hans.mueller@example.com', firstName: 'Hans', lastName: 'Mueller', phone: '+49 151 234 5678',
    birthdate: '1988-03-10', country: 'DE', language: 'DE', customerType: 'RECURRENT',
    certifications: [],
  },
];

const db = new pg.Client({ connectionString: process.env.DATABASE_URL.split('?')[0] });
await db.connect();

// Authenticate as an existing admin (no password needed: sign with JWT_SECRET).
const admin = (await db.query(`SELECT id, email, role FROM "User" WHERE role = 'ADMIN' LIMIT 1`)).rows[0];
if (!admin) throw new Error('No ADMIN user in the database');
const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '10m' });

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const log = (what, name, created) => console.log(`${created ? 'created' : 'exists '}  ${what.padEnd(9)} ${name}`);

// The account for an email, registered with PASSWORD if it does not exist.
async function userFor(email, name) {
  const found = (await db.query(`SELECT id, role FROM "User" WHERE email = $1`, [email])).rows[0];
  if (found) {
    log('user', email, false);
    return found;
  }
  const { user } = await api('POST', '/auth/register', { email, password: PASSWORD, name });
  log('user', email, true);
  return user;
}

const boats = await api('GET', '/boats');
for (const b of BOATS) {
  const exists = boats.some((x) => x.name === b.name);
  if (!exists) await api('POST', '/boats', b);
  log('boat', b.name, !exists);
}

const sites = await api('GET', '/dive-sites');
for (const s of SITES) {
  const exists = sites.some((x) => x.nameEn === s.name);
  if (!exists) await api('POST', '/dive-sites', siteDto(s));
  log('dive site', s.name, !exists);
}

const staff = await api('GET', '/staff');
for (const { email, ...s } of STAFF) {
  const user = await userFor(email, `${s.firstName} ${s.lastName}`);
  // Staff log in to the backoffice; never downgrade an ADMIN.
  if (user.role === 'CUSTOMER') {
    await db.query(`UPDATE "User" SET role = 'INSTRUCTOR', "updatedAt" = now() WHERE id = $1`, [user.id]);
  }
  const exists = staff.some((x) => x.userId === user.id);
  if (!exists) await api('POST', '/staff', { ...s, userId: user.id, hireDate: '2025-10-01' });
  log('staff', `${s.firstName} ${s.lastName}`, !exists);
}

const customers = await api('GET', '/customers');
for (const { email, certifications, ...c } of CUSTOMERS) {
  const user = await userFor(email, `${c.firstName} ${c.lastName}`);
  let customer = customers.find((x) => x.userId === user.id);
  if (!customer) customer = await api('POST', '/customers', { ...c, userId: user.id });
  log('customer', `${c.firstName} ${c.lastName}`, !customers.includes(customer));

  const certs = await api('GET', `/customers/${customer.id}/certifications`);
  for (const cert of certifications) {
    const exists = certs.some((x) => x.cardNumber === cert.cardNumber);
    if (!exists) await api('POST', `/customers/${customer.id}/certifications`, cert);
    log('cert', `${cert.agency} ${cert.level} (${c.firstName} ${c.lastName})`, !exists);
  }
}

await db.end();
