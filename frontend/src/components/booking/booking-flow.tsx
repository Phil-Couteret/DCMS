'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { createGuestBooking } from '@/lib/api';
import {
  ACTIVITIES,
  CERT_LEVELS,
  COUNTRIES,
  EQUIPMENT,
  equipmentTotal,
  isFullPackage,
  type EquipmentKey,
} from '@/lib/booking-catalog';
import { useBookingStore, type EquipmentSelection } from '@/store/booking-store';

const STEP_KEYS = ['activity', 'datetime', 'details', 'equipment', 'review'] as const;

const primaryButton =
  'rounded-full bg-blue-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
  'rounded-full px-6 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100';
const field =
  'mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-blue-700';

function useEur() {
  const format = useFormatter();
  return (amount: number) =>
    format.number(amount, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function selectedActivity(type: string | null) {
  return ACTIVITIES.find((a) => a.type === type) ?? null;
}

function Progress({ step }: { step: number }) {
  const t = useTranslations('booking');
  return (
    <nav aria-label={t('stepOf', { current: step, total: 5 })}>
      <p className="text-sm font-medium text-slate-600">{t('stepOf', { current: step, total: 5 })}</p>
      <ol className="mt-3 grid grid-cols-5 gap-2">
        {STEP_KEYS.map((key, i) => {
          const n = i + 1;
          const state = n < step ? 'done' : n === step ? 'current' : 'todo';
          return (
            <li key={key} aria-current={state === 'current' ? 'step' : undefined}>
              <div
                className={`h-1.5 rounded-full ${
                  state === 'todo' ? 'bg-slate-200' : 'bg-blue-900'
                }`}
              />
              <span
                className={`mt-2 hidden text-xs sm:block ${
                  state === 'current' ? 'font-semibold text-blue-900' : 'text-slate-500'
                }`}
              >
                {t(`steps.${key}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function StepActivity() {
  const t = useTranslations('booking');
  const tItems = useTranslations('pricing.items');
  const eur = useEur();
  const { activityType, selectActivity } = useBookingStore();

  return (
    <StepShell title={t('chooseActivity')}>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ACTIVITIES.map((a) => (
          <li key={a.type}>
            <button
              type="button"
              onClick={() => selectActivity(a.type)}
              aria-pressed={activityType === a.type}
              className={`flex h-full w-full flex-col rounded-xl p-5 text-left ring-1 transition hover:ring-blue-700 ${
                activityType === a.type ? 'bg-sky-50 ring-2 ring-blue-900' : 'bg-white ring-slate-200'
              }`}
            >
              <span className="text-lg font-semibold text-slate-900">{tItems(a.key)}</span>
              <span className="mt-1 text-sm text-slate-600">{t(`activityDescriptions.${a.key}`)}</span>
              <span className="mt-4 text-2xl font-bold text-blue-900">{eur(a.price)}</span>
            </button>
          </li>
        ))}
      </ul>
    </StepShell>
  );
}

function StepDateTime() {
  const t = useTranslations('booking');
  const { date, timeSlot, setDate, setTimeSlot, setStep } = useBookingStore();
  // Computed after mount so the server render and the browser agree on "today".
  const [today, setToday] = useState<string>();
  useEffect(() => {
    const d = new Date();
    setToday(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }, []);

  const slots = [
    { value: 'MORNING', label: t('morning') },
    { value: 'AFTERNOON', label: t('afternoon') },
  ] as const;

  return (
    <StepShell title={t('steps.datetime')}>
      <label className="block max-w-xs text-sm font-medium text-slate-700">
        {t('date')}
        <input
          type="date"
          required
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={field}
        />
      </label>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-slate-700">{t('timeSlot')}</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {slots.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setTimeSlot(s.value)}
              aria-pressed={timeSlot === s.value}
              className={`rounded-lg px-5 py-3 text-sm font-medium ring-1 transition ${
                timeSlot === s.value
                  ? 'bg-blue-900 text-white ring-blue-900'
                  : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => setStep(1)} className={secondaryButton}>
          {t('back')}
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          disabled={!date || !timeSlot || (today !== undefined && date < today)}
          className={primaryButton}
        >
          {t('next')}
        </button>
      </div>
    </StepShell>
  );
}

function StepCustomer() {
  const t = useTranslations('booking');
  const { customer, setCustomer, setStep } = useBookingStore();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStep(4);
  };

  const text = (name: 'firstName' | 'lastName' | 'email' | 'phone', type: string, autoComplete: string) => (
    <label className="block text-sm font-medium text-slate-700">
      {t(`fields.${name}`)}
      <input
        type={type}
        name={name}
        required
        autoComplete={autoComplete}
        value={customer[name]}
        onChange={(e) => setCustomer({ [name]: e.target.value })}
        className={field}
      />
    </label>
  );

  return (
    <StepShell title={t('steps.details')}>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {text('firstName', 'text', 'given-name')}
          {text('lastName', 'text', 'family-name')}
          {text('email', 'email', 'email')}
          {text('phone', 'tel', 'tel')}
          <label className="block text-sm font-medium text-slate-700">
            {t('fields.country')}
            <select
              name="country"
              required
              value={customer.country}
              onChange={(e) => setCustomer({ country: e.target.value })}
              className={field}
            >
              <option value="" disabled>
                {t('select')}
              </option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {t(`countries.${c}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('fields.certificationLevel')}
            <select
              name="certificationLevel"
              required
              value={customer.certificationLevel}
              onChange={(e) => setCustomer({ certificationLevel: e.target.value })}
              className={field}
            >
              <option value="" disabled>
                {t('select')}
              </option>
              {CERT_LEVELS.map((c) => (
                <option key={c} value={c}>
                  {t(`certLevels.${c}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8 flex justify-between">
          <button type="button" onClick={() => setStep(2)} className={secondaryButton}>
            {t('back')}
          </button>
          <button type="submit" className={primaryButton}>
            {t('next')}
          </button>
        </div>
      </form>
    </StepShell>
  );
}

function PriceLines({ activityPrice, equipment }: { activityPrice: number; equipment: EquipmentSelection }) {
  const t = useTranslations('booking');
  const eur = useEur();
  const kit = equipmentTotal(equipment);
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-600">{t('activityPrice')}</dt>
        <dd className="font-medium text-slate-900">{eur(activityPrice)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-slate-600">
          {t('equipmentPrice')}
          {isFullPackage(equipment) && (
            <span className="ml-2 text-xs text-emerald-700">({t('fullPackageApplied')})</span>
          )}
        </dt>
        <dd className="font-medium text-slate-900">{eur(kit)}</dd>
      </div>
      <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
        <dt className="font-semibold text-slate-900">{t('total')}</dt>
        <dd className="font-bold text-blue-900" data-testid="total">
          {eur(activityPrice + kit)}
        </dd>
      </div>
    </dl>
  );
}

function StepEquipment() {
  const t = useTranslations('booking');
  const tItems = useTranslations('pricing.items');
  const eur = useEur();
  const { activityType, equipment, setEquipment, setStep } = useBookingStore();
  const activity = selectedActivity(activityType);
  const full = isFullPackage(equipment);

  const toggle = (key: EquipmentKey, on: boolean) => {
    const item = EQUIPMENT.find((e) => e.key === key)!;
    const next = { ...equipment };
    if (on) next[key] = item.sizes ? item.sizes[Math.floor(item.sizes.length / 2)] : true;
    else delete next[key];
    setEquipment(next);
  };

  const toggleAll = (on: boolean) => {
    if (!on) return setEquipment({});
    const next: EquipmentSelection = {};
    for (const e of EQUIPMENT) {
      next[e.key] = equipment[e.key] ?? (e.sizes ? e.sizes[Math.floor(e.sizes.length / 2)] : true);
    }
    setEquipment(next);
  };

  return (
    <StepShell title={t('steps.equipment')}>
      <label className="flex items-center gap-3 rounded-lg bg-sky-50 p-4 ring-1 ring-sky-200">
        <input
          type="checkbox"
          checked={full}
          onChange={(e) => toggleAll(e.target.checked)}
          className="h-5 w-5 rounded border-slate-300"
        />
        <span className="font-medium text-slate-900">{t('fullPackage')}</span>
        <span className="ml-auto text-sm font-semibold text-slate-900">{eur(35)}</span>
      </label>

      <ul className="mt-4 divide-y divide-slate-200">
        {EQUIPMENT.map((e) => {
          const value = equipment[e.key];
          const checked = value !== undefined;
          return (
            <li key={e.key} className="flex flex-wrap items-center gap-3 py-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(ev) => toggle(e.key, ev.target.checked)}
                  className="h-5 w-5 rounded border-slate-300"
                />
                <span className="text-slate-900">{tItems(e.key)}</span>
              </label>
              {e.sizes && checked && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  {t(e.sizeLabel)}
                  <select
                    value={value as string}
                    onChange={(ev) => setEquipment({ ...equipment, [e.key]: ev.target.value })}
                    className="rounded-md border-0 py-1 pl-2 pr-7 text-sm ring-1 ring-slate-300"
                  >
                    {e.sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <span className="ml-auto text-sm text-slate-600">+{eur(e.price)}</span>
            </li>
          );
        })}
      </ul>

      {activity && (
        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <PriceLines activityPrice={activity.price} equipment={equipment} />
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => setStep(3)} className={secondaryButton}>
          {t('back')}
        </button>
        <button type="button" onClick={() => setStep(5)} className={primaryButton}>
          {t('next')}
        </button>
      </div>
    </StepShell>
  );
}

function StepReview({ onDone }: { onDone: (reference: string) => void }) {
  const t = useTranslations('booking');
  const tItems = useTranslations('pricing.items');
  const locale = useLocale();
  const format = useFormatter();
  const state = useBookingStore();
  const activity = selectedActivity(state.activityType);
  const [status, setStatus] = useState<'idle' | 'sending' | 'noSlots' | 'rateLimited' | 'error'>('idle');

  if (!activity || !state.timeSlot) return null;

  const kit = equipmentTotal(state.equipment);
  const selectedEquipment = EQUIPMENT.filter((e) => state.equipment[e.key] !== undefined).map((e) => {
    const v = state.equipment[e.key];
    return typeof v === 'string' ? `${e.key}:${v}` : e.key;
  });

  const confirm = async () => {
    setStatus('sending');
    const result = await createGuestBooking({
      firstName: state.customer.firstName,
      lastName: state.customer.lastName,
      email: state.customer.email,
      phone: state.customer.phone,
      country: state.customer.country,
      language: locale,
      activityType: activity.type,
      ...(state.siteId && { siteId: state.siteId }),
      timeSlot: state.timeSlot!,
      date: state.date,
      participantCount: 1,
      certificationLevel: state.customer.certificationLevel,
      selectedEquipment,
      totalPrice: activity.price + kit,
    });
    if (result.ok) return onDone(result.reference);
    setStatus(result.status === 409 ? 'noSlots' : result.status === 429 ? 'rateLimited' : 'error');
  };

  const row = (label: string, value: ReactNode) => (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 sm:text-right">{value}</dd>
    </div>
  );

  const dateLabel = format.dateTime(new Date(`${state.date}T12:00:00`), { dateStyle: 'full' });

  return (
    <StepShell title={t('steps.review')}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t('summary')}</h3>
      <dl className="mt-2 divide-y divide-slate-100">
        {row(t('steps.activity'), tItems(activity.key))}
        {row(t('date'), dateLabel)}
        {row(t('timeSlot'), state.timeSlot === 'MORNING' ? t('morning') : t('afternoon'))}
        {row(t('fields.name'), `${state.customer.firstName} ${state.customer.lastName}`)}
        {row(t('fields.email'), state.customer.email)}
        {row(t('fields.phone'), state.customer.phone)}
        {row(t('fields.country'), t(`countries.${state.customer.country}`))}
        {row(t('fields.certificationLevel'), t(`certLevels.${state.customer.certificationLevel}`))}
        {row(
          t('steps.equipment'),
          selectedEquipment.length === 0
            ? t('noEquipment')
            : EQUIPMENT.filter((e) => state.equipment[e.key] !== undefined)
                .map((e) => {
                  const v = state.equipment[e.key];
                  return typeof v === 'string' ? `${tItems(e.key)} (${v})` : tItems(e.key);
                })
                .join(', '),
        )}
      </dl>

      <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {t('priceBreakdown')}
      </h3>
      <div className="mt-3">
        <PriceLines activityPrice={activity.price} equipment={state.equipment} />
      </div>

      <div className="mt-8 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">{t('paymentTitle')}</h3>
        <p className="mt-1 text-sm text-slate-600">{t('paymentNote')}</p>
      </div>

      {(status === 'noSlots' || status === 'rateLimited' || status === 'error') && (
        <p role="alert" className="mt-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-200">
          {status === 'noSlots'
            ? t('errors.noSlots')
            : status === 'rateLimited'
              ? t('rateLimited')
              : t('errors.generic')}
        </p>
      )}

      <div className="mt-8 flex justify-between">
        <button type="button" onClick={() => state.setStep(4)} className={secondaryButton}>
          {t('back')}
        </button>
        <button type="button" onClick={confirm} disabled={status === 'sending'} className={primaryButton}>
          {status === 'sending' ? t('sending') : t('confirm')}
        </button>
      </div>
    </StepShell>
  );
}

function Confirmation({ reference, onRestart }: { reference: string; onRestart: () => void }) {
  const t = useTranslations('booking');
  return (
    <section className="mt-8 rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <h2 className="text-2xl font-bold text-slate-900">{t('success.title')}</h2>
      <p className="mt-4 text-sm text-slate-600">{t('success.reference')}</p>
      <p className="mt-1 break-all font-mono text-lg font-semibold text-blue-900" data-testid="reference">
        {reference}
      </p>
      <p className="mt-6 text-slate-700">{t('success.note')}</p>
      <button type="button" onClick={onRestart} className={`mt-8 ${secondaryButton}`}>
        {t('success.again')}
      </button>
    </section>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function BookingFlow() {
  const t = useTranslations('booking');
  const step = useBookingStore((s) => s.step);
  const reset = useBookingStore((s) => s.reset);
  const setSiteId = useBookingStore((s) => s.setSiteId);
  const [reference, setReference] = useState<string | null>(null);

  // Read on mount rather than through useSearchParams so the page stays
  // statically rendered. Set every time, so a site from an earlier visit is
  // cleared when the page is opened without one. Anything that is not a UUID
  // is ignored rather than sent, since the API would reject it.
  useEffect(() => {
    const site = new URLSearchParams(window.location.search).get('site');
    setSiteId(site && UUID.test(site) ? site : null);
  }, [setSiteId]);

  const onDone = (ref: string) => {
    setReference(ref);
    reset();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{t('title')}</h1>
      {reference ? (
        <Confirmation reference={reference} onRestart={() => setReference(null)} />
      ) : (
        <>
          <div className="mt-8">
            <Progress step={step} />
          </div>
          {step === 1 && <StepActivity />}
          {step === 2 && <StepDateTime />}
          {step === 3 && <StepCustomer />}
          {step === 4 && <StepEquipment />}
          {step === 5 && <StepReview onDone={onDone} />}
        </>
      )}
    </div>
  );
}
