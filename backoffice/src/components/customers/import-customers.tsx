"use client";

import Link from "next/link";
import { importCustomersCsv, type CustomerImportState } from "@/app/dashboard/customers/actions";
import { ImportResultView } from "@/components/import-result";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";

export function ImportCustomersForm({ closeHref }: { closeHref: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<CustomerImportState>(importCustomersCsv, null);
  if (state?.result) {
    return (
      <div className="space-y-4">
        <ImportResultView result={state.result} noun={["customer", "customers"]} />
        <Button nativeButton={false} render={<Link href={closeHref} prefetch={false} scroll={false} />}>
          {t("Done")}
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 text-sm">
      <div className="space-y-2 text-zinc-700">
        <p>{t("A CSV file with a header row and one customer per row. Columns:")}</p>
        <p className="rounded-md bg-zinc-50 p-2 font-mono text-xs leading-relaxed ring-1 ring-zinc-200">
          firstName, lastName, email, phone, dob, nationality, gender, customerType, centerSkillLevel, certificationLevel, certificationAgency
        </p>
        <ul className="list-disc space-y-1 pl-5 text-zinc-600">
          <li>
            {t("Required:")} <strong>firstName</strong>, <strong>lastName</strong>, <strong>email</strong> {t("and")} <strong>nationality</strong>{" "}
            {t("(as you write it: Spanish, German, ES…; it is kept as the customer's country).")}
          </li>
          <li>{t("dob: DD/MM/YYYY or YYYY-MM-DD. customerType: TOURIST, LOCAL or RECURRENT. centerSkillLevel: BEGINNER, INTERMEDIATE, ADVANCED or EXPERT.")}</li>
          <li>{t("A certification is added when both its level and agency are given.")}</li>
          <li>{t("Rows whose email is already a customer are skipped; rows with a problem are listed, and the rest are still imported.")}</li>
        </ul>
        <a href="/templates/customers-import.csv" download className="inline-block font-medium text-[#0077b6] underline">
          {t("Download the template")}
        </a>
      </div>
      <label className="block text-sm font-medium text-zinc-700">
        {t("CSV file")}
        <input type="file" name="file" required accept=".csv,text/csv" className={`${control} file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1`} />
      </label>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("Importing…") : t("Import")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href={closeHref} prefetch={false} scroll={false} />}>
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
