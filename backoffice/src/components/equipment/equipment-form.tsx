"use client";

import { useActionState } from "react";
import Link from "next/link";
import { removeEquipment, saveEquipment, type FormState } from "@/app/dashboard/equipment/actions";
import { Button } from "@/components/ui/button";
import type { Equipment } from "@/lib/api";
import { CONDITIONS, CONDITION_LABELS, EQUIPMENT_STATUSES, EQUIPMENT_TYPES, STATUS_LABELS, typeLabel } from "@/lib/equipment";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";

const label = "block text-sm font-medium text-zinc-700";
const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

const day = (iso: string | null | undefined) => iso?.slice(0, 10) ?? "";

// Add (item null) or edit an equipment item. returnTo: the list, with its
// filters, to go back to after saving.
export function EquipmentForm({ item, cancelHref }: { item: Equipment | null; cancelHref: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<FormState>(saveEquipment, null);
  // A stored type outside the list stays selectable, so saving keeps it.
  const types: string[] = item && !EQUIPMENT_TYPES.includes(item.type.toLowerCase() as never)
    ? [...EQUIPMENT_TYPES, item.type]
    : [...EQUIPMENT_TYPES];
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {item && <input type="hidden" name="equipmentId" value={item.id} />}
      <input type="hidden" name="returnTo" value={cancelHref} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("Type")}
          <select name="type" required defaultValue={item?.type.toLowerCase() ?? "bcd"} className={control}>
            {types.map((x) => (
              <option key={x} value={x}>
                {t(typeLabel(x))}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Brand")}
          <input name="brand" required maxLength={80} defaultValue={item?.brand ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Model (optional)")}
          <input name="model" maxLength={80} defaultValue={item?.model ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Size (optional)")}
          <input name="size" maxLength={20} placeholder={t("e.g. M, 42, 12L")} defaultValue={item?.size ?? ""} className={control} />
        </label>
        <label className={label}>
          {t("Serial number (optional)")}
          <input name="serialNumber" maxLength={80} defaultValue={item?.serialNumber ?? ""} className={control} />
          <span className="mt-1 block text-xs font-normal text-zinc-500">{t("Unique within the center.")}</span>
        </label>
        <span />
        <label className={label}>
          {t("Status")}
          <select name="status" defaultValue={item?.status ?? "AVAILABLE"} className={control}>
            {EQUIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(STATUS_LABELS[s])}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Condition")}
          <select name="condition" defaultValue={item?.condition ?? "EXCELLENT"} className={control}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {t(CONDITION_LABELS[c])}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("Purchase date")}
          <input type="date" name="purchaseDate" required defaultValue={day(item?.purchaseDate)} className={control} />
        </label>
        <label className={label}>
          {t("Purchase cost")}
          <input
            name="purchaseCost"
            required
            inputMode="decimal"
            pattern="\d{1,8}([.,]\d{1,2})?"
            defaultValue={item ? Number(item.purchaseCost).toFixed(2) : ""}
            className={control}
          />
        </label>
        <label className={label}>
          {t("Last maintenance (optional)")}
          <input type="date" name="lastMaintenance" defaultValue={day(item?.lastMaintenance)} className={control} />
        </label>
        <label className={label}>
          {t("Next maintenance (optional)")}
          <input type="date" name="nextMaintenance" defaultValue={day(item?.nextMaintenance)} className={control} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("Saving…") : item ? t("Save changes") : t("Add equipment")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} prefetch={false} scroll={false} />}>
          {t("Cancel")}
        </Button>
        {state?.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

export function DeleteEquipmentButton({ item }: { item: Equipment }) {
  const t = useT();
  const [state, action, pending] = useActionState<FormState, FormData>(removeEquipment, null);
  const name = `${t(typeLabel(item.type))} ${item.brand}${item.serialNumber ? ` (${item.serialNumber})` : ""}`;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t("Delete {name}? Its maintenance history is deleted too. This cannot be undone.", { name }))) e.preventDefault();
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      <input type="hidden" name="equipmentId" value={item.id} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive" disabled={pending}>
        {pending ? t("Deleting…") : t("Delete")}
      </Button>
      {state?.error && (
        <p role="alert" className="max-w-48 text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
