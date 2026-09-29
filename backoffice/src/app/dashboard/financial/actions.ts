"use server";

import { revalidatePath } from "next/cache";
import {
  addExpense,
  addManualIncome,
  ApiError,
  closeDay,
  deleteExpense,
  deleteManualIncome,
  type ExpenseCategory,
} from "@/lib/api";
import { EXPENSE_CATEGORIES } from "@/lib/financial";

export type FinancialFormState = { error?: string; ok?: boolean } | null;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function fail(e: unknown, fallback: string): FinancialFormState {
  return { error: e instanceof ApiError ? e.message : fallback };
}

// Amounts in euros with at most two decimals, entered as text. A comma is
// accepted as the decimal separator.
function money(raw: string, { allowZero = false } = {}) {
  const value = raw.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const n = Number(value);
  return n > 0 || (allowZero && n === 0) ? n : null;
}

function refresh() {
  revalidatePath("/dashboard/financial");
}

export async function addExpenseAction(_prev: FinancialFormState, formData: FormData): Promise<FinancialFormState> {
  const date = text(formData, "date");
  const category = text(formData, "category") as ExpenseCategory;
  const description = text(formData, "description");
  const amount = money(text(formData, "amount"));
  const rawTax = text(formData, "tax");
  const tax = rawTax === "" ? undefined : money(rawTax, { allowZero: true });
  const notes = text(formData, "notes");

  if (!ISO_DATE.test(date)) return { error: "Choose a date" };
  if (!EXPENSE_CATEGORIES.includes(category)) return { error: "Choose a category" };
  if (!description) return { error: "Enter a description" };
  if (amount === null) return { error: "Enter the amount in euros, e.g. 45.50" };
  if (tax === null) return { error: "Enter the tax in euros, e.g. 2.98, or leave it empty" };
  if (tax !== undefined && tax > amount) return { error: "The tax cannot be more than the amount" };

  try {
    await addExpense({ date, category, description, amount, tax, notes: notes || undefined });
  } catch (e) {
    return fail(e, "Could not save the expense");
  }
  refresh();
  return { ok: true };
}

export async function addIncomeAction(_prev: FinancialFormState, formData: FormData): Promise<FinancialFormState> {
  const date = text(formData, "date");
  const description = text(formData, "description");
  const amount = money(text(formData, "amount"));
  const notes = text(formData, "notes");

  if (!ISO_DATE.test(date)) return { error: "Choose a date" };
  if (!description) return { error: "Enter a description" };
  if (amount === null) return { error: "Enter the amount in euros, e.g. 25.00" };

  try {
    await addManualIncome({ date, description, amount, notes: notes || undefined });
  } catch (e) {
    return fail(e, "Could not save the income");
  }
  refresh();
  return { ok: true };
}

export async function deleteEntryAction(_prev: FinancialFormState, formData: FormData): Promise<FinancialFormState> {
  const id = text(formData, "id");
  const kind = text(formData, "kind");
  if (!UUID.test(id) || (kind !== "expense" && kind !== "income")) return { error: "Unknown entry" };
  try {
    await (kind === "expense" ? deleteExpense(id) : deleteManualIncome(id));
  } catch (e) {
    return fail(e, "Could not delete the entry");
  }
  refresh();
  return { ok: true };
}

export async function closeDayAction(_prev: FinancialFormState, formData: FormData): Promise<FinancialFormState> {
  const date = text(formData, "date");
  if (!ISO_DATE.test(date)) return { error: "Choose a date" };
  try {
    await closeDay(date);
  } catch (e) {
    return fail(e, "Could not close the day");
  }
  refresh();
  revalidatePath(`/dashboard/financial/closed/${date}`);
  return { ok: true };
}
