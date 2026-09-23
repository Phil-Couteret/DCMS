'use client';

import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';

// The backend filter is a ceiling: level 2 shows every site an Advanced
// diver can dive, levels 1 and 2 together.
export function CertFilter({
  current,
  label,
  allLabel,
  levelLabels,
}: {
  current?: number;
  label: string;
  allLabel: string;
  levelLabels: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const select = (level?: number) =>
    startTransition(() => {
      router.push(level ? `/sites?cert=${level}` : '/sites', { scroll: false });
    });

  const options: { level?: number; text: string }[] = [
    { level: undefined, text: allLabel },
    ...levelLabels.map((text, i) => ({ level: i + 1, text })),
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div
        role="group"
        aria-label={label}
        className={`flex flex-wrap gap-2 transition-opacity ${pending ? 'opacity-60' : ''}`}
      >
        {options.map(({ level, text }) => {
          const active = level === current;
          return (
            <button
              key={text}
              type="button"
              onClick={() => select(level)}
              aria-pressed={active}
              disabled={pending}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100'
              }`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
