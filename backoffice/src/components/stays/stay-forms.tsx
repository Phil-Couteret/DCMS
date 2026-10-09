"use client";

import { useEffect, useState } from "react";
import { billStayAction, deleteCostAction, saveCostAction, type StayFormState } from "@/app/dashboard/stays/actions";
import { Button } from "@/components/ui/button";
import type { StayCost, StayCostCategory } from "@/lib/api";
import { money } from "@/lib/billing";
import { STAY_COST_CATEGORIES, STAY_COST_LABELS } from "@/lib/stays";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

function ErrorText({ state }: { state: StayFormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  );
}

// Adds a cost, or edits one when `cost` is given. Prices are net: the invoice
// adds tax.
function CostForm({
  customerId,
  cost,
  today,
  taxName,
  currency,
  onDone,
}: {
  customerId: string;
  cost?: StayCost;
  today: string;
  taxName: string;
  currency: string;
  onDone: () => void;
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<StayFormState>(saveCostAction, null);
  const [category, setCategory] = useState<StayCostCategory>(cost?.category ?? "INSURANCE");
  const [quantity, setQuantity] = useState(String(cost?.quantity ?? 1));
  const [unitPrice, setUnitPrice] = useState(cost?.unitPrice ?? "");
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const total = Number(unitPrice.replace(",", ".")) * Number(quantity);
  const beverages = category === "BEVERAGES";
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200">
      <p className="text-sm font-medium text-zinc-900">{cost ? t("Edit cost") : t("Add a cost")}</p>
      <input type="hidden" name="customerId" value={customerId} />
      {cost && <input type="hidden" name="costId" value={cost.id} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-sm font-medium text-zinc-700">
          {t("Date")}
          <input type="date" name="date" required defaultValue={cost?.date.slice(0, 10) ?? today} className={control} />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Category")}
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as StayCostCategory)}
            className={control}
          >
            {STAY_COST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(STAY_COST_LABELS[c])}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-zinc-700 lg:col-span-3">
          {beverages ? t("Description (optional)") : t("Description")}
          <input
            name="description"
            required={!beverages}
            maxLength={200}
            defaultValue={cost && cost.description !== STAY_COST_LABELS[cost.category] ? cost.description : ""}
            placeholder={beverages ? t("e.g. Water, soda, beer") : t("e.g. Dive insurance, T-shirt")}
            className={control}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Quantity")}
          <input
            name="quantity"
            type="number"
            min={1}
            max={999}
            step={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={control}
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          {t("Unit price ({currency}, before {tax})", { currency, tax: taxName })}
          <input
            name="unitPrice"
            required
            inputMode="decimal"
            placeholder="0.00"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className={control}
          />
        </label>
        <div className="text-sm font-medium text-zinc-700">
          {t("Total")}
          <p className="mt-1 py-2 text-zinc-900">{Number.isFinite(total) ? money(total, currency) : "—"}</p>
        </div>
        <label className="block text-sm font-medium text-zinc-700 sm:col-span-2">
          {t("Notes (optional)")}
          <input name="notes" maxLength={1000} defaultValue={cost?.notes ?? ""} className={control} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : cost ? t("Update cost") : t("Add cost")}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <ErrorText state={state} />
      </div>
    </form>
  );
}

function DeleteCostButton({ cost, currency }: { cost: StayCost; currency: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<StayFormState>(deleteCostAction, null);
  return (
    <form
      onSubmit={(e) => {
        if (!confirm(t('Delete "{description}" ({amount})?', { description: cost.description, amount: money(cost.total, currency) }))) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
    >
      <input type="hidden" name="costId" value={cost.id} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending} className="text-red-700 hover:text-red-800">
        {pending ? t("Deleting…") : t("Delete")}
      </Button>
      <ErrorText state={state} />
    </form>
  );
}

// The extra-costs table with its add and edit forms.
export function StayCosts({
  customerId,
  costs,
  total,
  today,
  taxName,
  currency,
}: {
  customerId: string;
  costs: StayCost[];
  total: string;
  today: string;
  taxName: string;
  currency: string;
}) {
  // "new", a cost id being edited, or null.
  const t = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const close = () => setEditing(null);
  const th = "px-3 py-2 font-medium";
  const td = "px-3 py-2";
  return (
    <div className="space-y-3">
      {costs.length === 0 ? (
        <p className="text-sm italic text-zinc-500">{t("No extra costs recorded yet.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className={th}>{t("Date")}</th>
                <th className={th}>{t("Category")}</th>
                <th className={th}>{t("Description")}</th>
                <th className={`${th} text-right`}>{t("Qty")}</th>
                <th className={`${th} text-right`}>{t("Unit price")}</th>
                <th className={`${th} text-right`}>{t("Total")}</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {costs.map((c) =>
                editing === c.id ? (
                  <tr key={c.id}>
                    <td colSpan={7} className="py-2">
                      <CostForm customerId={customerId} cost={c} today={today} taxName={taxName} currency={currency} onDone={close} />
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id}>
                    <td className={td}>
                      {new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(
                        new Date(c.date),
                      )}
                    </td>
                    <td className={td}>
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">{t(STAY_COST_LABELS[c.category])}</span>
                    </td>
                    <td className={td}>
                      {/* Descriptions the system writes (dive insurance) are translated; staff's own text is shown as typed. */}
                      {t(c.description)}
                      {c.notes && <span className="block text-xs text-zinc-500">{c.notes}</span>}
                    </td>
                    <td className={`${td} text-right`}>{c.quantity}</td>
                    <td className={`${td} text-right`}>{money(c.unitPrice, currency)}</td>
                    <td className={`${td} text-right`}>{money(c.total, currency)}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(c.id)} disabled={editing !== null}>
                          {t("Edit")}
                        </Button>
                        <DeleteCostButton cost={c} currency={currency} />
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
      {editing === "new" ? (
        <CostForm customerId={customerId} today={today} taxName={taxName} currency={currency} onDone={close} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing("new")} disabled={editing !== null}>
            {t("Add cost")}
          </Button>
          {costs.length > 0 && <p className="text-sm font-semibold text-zinc-900">{t("Total extra costs: {amount}", { amount: money(total, currency) })}</p>}
        </div>
      )}
    </div>
  );
}

export function BillStayButton({
  customerId,
  name,
  total,
  disabledReason,
  currency,
  pack,
}: {
  customerId: string;
  name: string;
  total: string;
  disabledReason?: string;
  currency: string;
  // Bill with this dive pack instead of the stay rate.
  pack?: { diveCount: number };
}) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<StayFormState>(billStayAction, null);
  return (
    <form
      onSubmit={(e) => {
        const amount = money(total, currency);
        const question = pack
          ? t("End {name}'s stay and create an invoice with the {count}-dive pack for {amount}?", { name, count: pack.diveCount, amount })
          : t("End {name}'s stay and create an invoice for {amount}?", { name, amount });
        if (!confirm(question)) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="customerId" value={customerId} />
      {pack && <input type="hidden" name="usePack" value="1" />}
      <Button
        type="submit"
        disabled={pending || Boolean(disabledReason)}
        title={disabledReason}
        variant={pack ? "outline" : "default"}
        className={
          pack
            ? "border-green-700 text-green-800 disabled:pointer-events-auto disabled:cursor-not-allowed"
            : "bg-green-700 text-white hover:bg-green-800 disabled:pointer-events-auto disabled:cursor-not-allowed"
        }
      >
        {pending
          ? t("Creating invoice…")
          : pack
            ? t("Bill with {count}-dive pack · {amount}", { count: pack.diveCount, amount: money(total, currency) })
            : t("End stay & generate bill")}
      </Button>
      {disabledReason && <p className="text-xs text-zinc-500">{disabledReason}</p>}
      <ErrorText state={state} />
    </form>
  );
}
