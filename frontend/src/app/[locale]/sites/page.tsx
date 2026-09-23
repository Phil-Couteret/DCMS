import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CertFilter } from '@/components/cert-filter';
import { Navbar } from '@/components/navbar';
import { Link } from '@/i18n/navigation';
import { getDiveSites } from '@/lib/api';
import type { DiveSite } from '@/types/dive-site';

const CERT_BADGE = [
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-amber-100 text-amber-800',
  'bg-orange-100 text-orange-800',
  'bg-rose-100 text-rose-800',
];

const NAME_FIELD = { en: 'nameEn', es: 'nameEs', de: 'nameDe', fr: 'nameFr' } as const;

function localisedName(site: DiveSite, locale: string) {
  const field = NAME_FIELD[locale as keyof typeof NAME_FIELD] ?? 'nameEn';
  return site[field] || site.nameEn;
}

function stringsOnly(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function parseCert(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
}

export default async function SitesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cert?: string | string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const cert = parseCert((await searchParams).cert);
  const t = await getTranslations('sites');
  const certLevels = t.raw('certLevels') as string[];

  let sites: DiveSite[] | null = null;
  try {
    sites = await getDiveSites(locale, { requiredCertLevel: cert });
  } catch (e) {
    console.error('[sites] could not load dive sites:', e);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar className="bg-blue-950" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t('title')}
        </h1>

        <div className="mt-8">
          <CertFilter
            current={cert}
            label={t('filterLabel')}
            allLabel={t('all')}
            levelLabels={certLevels}
          />
        </div>

        {sites === null ? (
          <p role="alert" className="mt-10 rounded-lg bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
            {t('unavailable')}
          </p>
        ) : sites.length === 0 ? (
          <p className="mt-10 text-slate-600">{t('empty')}</p>
        ) : (
          <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => {
              const level = site.requiredCertLevel;
              const marineLife = stringsOnly(site.marineLife).slice(0, 3);
              return (
                <li
                  key={site.id}
                  className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {localisedName(site, locale)}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        CERT_BADGE[level - 1] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {certLevels[level - 1] ?? level}
                    </span>
                  </div>

                  <p
                    className="mt-2 text-amber-500"
                    aria-label={`${t('difficulty')}: ${site.difficultyLevel}/5`}
                  >
                    <span aria-hidden="true">
                      {'★'.repeat(site.difficultyLevel)}
                      <span className="text-slate-300">{'★'.repeat(5 - site.difficultyLevel)}</span>
                    </span>
                  </p>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-slate-500">{t('depth')}</dt>
                    <dd className="font-medium text-slate-900">
                      {site.depthMin}–{site.depthMax} m
                    </dd>
                    <dt className="text-slate-500">{t('current')}</dt>
                    <dd className="font-medium text-slate-900">{site.typicalCurrent}</dd>
                  </dl>

                  {marineLife.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-slate-500">{t('marineLife')}</p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {marineLife.map((animal) => (
                          <li
                            key={animal}
                            className="rounded-md bg-sky-50 px-2 py-0.5 text-xs text-sky-900 ring-1 ring-sky-200"
                          >
                            {animal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link
                    href={`/booking?site=${site.id}`}
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 sm:mt-auto sm:self-start"
                  >
                    {t('bookButton')}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
