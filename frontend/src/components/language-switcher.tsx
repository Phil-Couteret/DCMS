'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

// Keeps the reader on the same page when switching language: /es/sites?cert=2
// becomes /de/sites?cert=2. usePathname returns the path without the locale.
function SwitcherLinks({ current, query }: { current: string; query: string }) {
  const pathname = usePathname();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <div className="flex gap-1">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={href}
          locale={l}
          aria-current={l === current ? 'true' : undefined}
          className={`rounded px-2 py-1 text-xs font-semibold uppercase transition-colors ${
            l === current
              ? 'bg-white text-blue-900'
              : 'text-white/80 hover:bg-white/15 hover:text-white'
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

function WithQuery({ current }: { current: string }) {
  const query = useSearchParams().toString();
  return <SwitcherLinks current={current} query={query} />;
}

// useSearchParams needs a Suspense boundary on statically rendered pages; the
// fallback keeps the path and adds the query string once the page hydrates.
export function LanguageSwitcher({ current }: { current: string }) {
  return (
    <Suspense fallback={<SwitcherLinks current={current} query="" />}>
      <WithQuery current={current} />
    </Suspense>
  );
}
