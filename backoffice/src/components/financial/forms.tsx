"use client";

import { useEffect, useRef, useState } from "react";
import {
  addExpenseAction,
  addIncomeAction,
  closeDayAction,
  deleteEntryAction,
  emailReportAction,
  type FinancialFormState,
} from "@/app/dashboard/financial/actions";
import { Button } from "@/components/ui/button";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/financial";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

function Feedback({ state, success }: { state: FinancialFormState; success?: string }) {
  if (state?.error) return <p role="alert" className="text-sm text-destructive">{state.error}</p>;
  if (state?.ok && success) return <p role="status" className="text-sm text-green-700">{success}</p>;
  return null;
}

// A form that clears itself after a successful save.
function useResettingForm(action: typeof addExpenseAction) {
  const [state, onSubmit, pending] = useFormAction<FinancialFormState>(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return { state, onSubmit, pending, form };
}

// Shown behind a button so the day's figures stay at the top of the page.
function AddPanel({ label, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="print:hidden">
        {label}
      </Button>
    );
  }
  return (
    <div className="w-full rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200 print:hidden">{children(() => setOpen(false))}</div>
  );
}

export function AddExpenseForm({
  date,
  taxName,
  taxRate,
  currency,
}: {
  date: string;
  taxName: string;
  taxRate: string;
  currency: string;
}) {
  const t = useT();
  return (
    <AddPanel label={t("Add expense")}>
      {(close) => <ExpenseFields date={date} taxName={taxName} taxRate={taxRate} currency={currency} close={close} />}
    </AddPanel>
  );
}

function ExpenseFields({
  date,
  taxName,
  taxRate,
  currency,
  close,
}: {
  date: string;
  taxName: string;
  taxRate: string;
  currency: string;
  close: () => void;
}) {
  const t = useT();
  const { state, onSubmit, pending, form } = useResettingForm(addExpenseAction);
  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium text-zinc-700">
          {t("Date")}
          <input type="date" name="date" required defaultValue={date} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Category")}
          <select name="category" required defaultValue="GASOLINE" className={control}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(EXPENSE_CATEGORY_LABELS[c])}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Amount ({currency}, {tax} included)", { currency, tax: taxName })}
          <input name="amount" required inputMode="decimal" placeholder="0.00" className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("{tax} in the amount ({currency})", { tax: taxName, currency })}
          <input name="tax" inputMode="decimal" placeholder={t("{rate}% if empty", { rate: Number(taxRate) })} className={control} />
        </label>
      </div>
      <label className="block text-sm font-medium text-zinc-700">
        {t("Description")}
        <input name="description" required maxLength={200} placeholder={t("e.g. Fuel for White Magic")} className={control} />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        {t("Notes (optional)")}
        <textarea name="notes" rows={2} maxLength={1000} className={control} />
      </label>
      <p className="text-xs text-zinc-500">
        {t("Copy the {tax} from the supplier's receipt. Left empty, it is worked out at {rate}%.", { tax: taxName, rate: Number(taxRate) })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : t("Save expense")}
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          {t("Close")}
        </Button>
        <Feedback state={state} success={t("Expense saved.")} />
      </div>
    </form>
  );
}

export function AddIncomeForm({ date, currency }: { date: string; currency: string }) {
  const t = useT();
  return <AddPanel label={t("Add income")}>{(close) => <IncomeFields date={date} currency={currency} close={close} />}</AddPanel>;
}

function IncomeFields({ date, currency, close }: { date: string; currency: string; close: () => void }) {
  const t = useT();
  const { state, onSubmit, pending, form } = useResettingForm(addIncomeAction);
  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_10rem]">
        <label className="block text-sm font-medium text-zinc-700">
          {t("Date")}
          <input type="date" name="date" required defaultValue={date} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Description")}
          <input name="description" required maxLength={200} placeholder={t("e.g. Equipment sale, service fee")} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Amount ({currency})", { currency })}
          <input name="amount" required inputMode="decimal" placeholder="0.00" className={control} />
        </label>
      </div>
      <label className="block text-sm font-medium text-zinc-700">
        {t("Notes (optional)")}
        <textarea name="notes" rows={2} maxLength={1000} className={control} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : t("Save income")}
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          {t("Close")}
        </Button>
        <Feedback state={state} success={t("Income saved.")} />
      </div>
    </form>
  );
}

export function DeleteEntryButton({ id, kind, label }: { id: string; kind: "expense" | "income"; label: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<FinancialFormState>(deleteEntryAction, null);
  return (
    <form
      onSubmit={(e) => {
        if (!confirm(kind === "expense" ? t("Delete this expense: {label}?", { label }) : t("Delete this income entry: {label}?", { label }))) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="print:hidden"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending} className="text-red-700 hover:text-red-800">
        {pending ? t("Deleting…") : t("Delete")}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function CloseDayButton({ date, closed }: { date: string; closed: boolean }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<FinancialFormState>(closeDayAction, null);
  return (
    <form
      onSubmit={(e) => {
        const message = closed
          ? t("This day is already closed. Close it again and replace the stored report with today's figures?")
          : t("Close the day and store its report?");
        if (!confirm(message)) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="date" value={date} />
      <Button type="submit" disabled={pending}>
        {pending ? t("Closing…") : closed ? t("Close again") : t("Close the day")}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

// A closed day's report: download it as an HTML file, or email it to the
// center's address or the signed-in user's own.
export function ReportExport({ date, compact = false }: { date: string; compact?: boolean }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<FinancialFormState>(emailReportAction, null);
  return (
    <div className={`flex flex-col gap-1 ${compact ? "items-end" : "items-start"}`}>
      <form onSubmit={onSubmit} className="flex flex-wrap items-center justify-end gap-1.5">
        <input type="hidden" name="date" value={date} />
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={`/dashboard/financial/closed/${date}/report`} download />}
        >
          {t("Download HTML")}
        </Button>
        <select
          name="to"
          aria-label={t("Send the report to")}
          defaultValue="center"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
        >
          <option value="center">{t("The center's email")}</option>
          <option value="me">{t("My email")}</option>
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? t("Sending…") : t("Email report")}
        </Button>
      </form>
      {state?.error && (
        <p role="alert" className="max-w-80 text-xs text-destructive">
          {state.error}
        </p>
      )}
      {state?.message && <p role="status" className="text-xs text-green-700">{state.message}</p>}
    </div>
  );
}

export function PrintButton({ label }: { label?: string }) {
  const t = useT();
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      {label ?? t("Print")}
    </Button>
  );
}
