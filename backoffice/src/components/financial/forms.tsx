"use client";

import { useEffect, useRef, useState } from "react";
import {
  addExpenseAction,
  addIncomeAction,
  closeDayAction,
  deleteEntryAction,
  type FinancialFormState,
} from "@/app/dashboard/financial/actions";
import { Button } from "@/components/ui/button";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/financial";
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
  return (
    <AddPanel label="Add expense">
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
  const { state, onSubmit, pending, form } = useResettingForm(addExpenseAction);
  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium text-zinc-700">
          Date
          <input type="date" name="date" required defaultValue={date} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Category
          <select name="category" required defaultValue="GASOLINE" className={control}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Amount ({currency}, {taxName} included)
          <input name="amount" required inputMode="decimal" placeholder="0.00" className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {taxName} in the amount ({currency})
          <input name="tax" inputMode="decimal" placeholder={`${Number(taxRate)}% if empty`} className={control} />
        </label>
      </div>
      <label className="block text-sm font-medium text-zinc-700">
        Description
        <input name="description" required maxLength={200} placeholder="e.g. Fuel for White Magic" className={control} />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Notes (optional)
        <textarea name="notes" rows={2} maxLength={1000} className={control} />
      </label>
      <p className="text-xs text-zinc-500">
        Copy the {taxName} from the supplier&apos;s receipt. Left empty, it is worked out at {Number(taxRate)}%.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save expense"}
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          Close
        </Button>
        <Feedback state={state} success="Expense saved." />
      </div>
    </form>
  );
}

export function AddIncomeForm({ date, currency }: { date: string; currency: string }) {
  return <AddPanel label="Add income">{(close) => <IncomeFields date={date} currency={currency} close={close} />}</AddPanel>;
}

function IncomeFields({ date, currency, close }: { date: string; currency: string; close: () => void }) {
  const { state, onSubmit, pending, form } = useResettingForm(addIncomeAction);
  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr_10rem]">
        <label className="block text-sm font-medium text-zinc-700">
          Date
          <input type="date" name="date" required defaultValue={date} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Description
          <input name="description" required maxLength={200} placeholder="e.g. Equipment sale, service fee" className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Amount ({currency})
          <input name="amount" required inputMode="decimal" placeholder="0.00" className={control} />
        </label>
      </div>
      <label className="block text-sm font-medium text-zinc-700">
        Notes (optional)
        <textarea name="notes" rows={2} maxLength={1000} className={control} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save income"}
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          Close
        </Button>
        <Feedback state={state} success="Income saved." />
      </div>
    </form>
  );
}

export function DeleteEntryButton({ id, kind, label }: { id: string; kind: "expense" | "income"; label: string }) {
  const [state, onSubmit, pending] = useFormAction<FinancialFormState>(deleteEntryAction, null);
  return (
    <form
      onSubmit={(e) => {
        if (!confirm(`Delete this ${kind === "expense" ? "expense" : "income entry"}: ${label}?`)) {
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
        {pending ? "Deleting…" : "Delete"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function CloseDayButton({ date, closed }: { date: string; closed: boolean }) {
  const [state, onSubmit, pending] = useFormAction<FinancialFormState>(closeDayAction, null);
  return (
    <form
      onSubmit={(e) => {
        const message = closed
          ? "This day is already closed. Close it again and replace the stored report with today's figures?"
          : "Close the day and store its report?";
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
        {pending ? "Closing…" : closed ? "Close again" : "Close the day"}
      </Button>
      <Feedback state={state} />
    </form>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      {label}
    </Button>
  );
}
