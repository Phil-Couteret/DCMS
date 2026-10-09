"use client";

import { useState } from "react";
import { uploadDocument, type DocumentUploadState } from "@/app/dashboard/customers/actions";
import { Button } from "@/components/ui/button";
import { DOCUMENT_ACCEPT, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/documents";
import { useT } from "@/lib/i18n/client";
import { useFormAction } from "@/lib/use-form-action";

const control =
  "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900";
const label = "block text-sm font-medium text-zinc-700";

export function UploadDocumentForm({ customerId }: { customerId: string }) {
  const t = useT();
  const [state, onSubmit, pending] = useFormAction<DocumentUploadState>(uploadDocument, null);
  const [tooBig, setTooBig] = useState(false);
  const done = state?.uploaded;
  // A fresh form after each upload (the key), so the file is not sent twice.
  return (
    <form
      key={done ?? "new"}
      onSubmit={(e) => {
        if (tooBig) e.preventDefault();
        else onSubmit(e);
      }}
      className="space-y-3 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200"
    >
      <input type="hidden" name="customerId" value={customerId} />
      <p className="text-sm font-medium text-zinc-900">{t("Upload a document")}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(10rem,14rem)_1fr_auto] sm:items-end">
        <label className={label}>
          {t("Document")}
          <select name="type" required defaultValue="MEDICAL_CERT" className={control}>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(DOCUMENT_TYPE_LABELS[type])}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("File (PDF or photo, up to 10 MB)")}
          <input
            type="file"
            name="file"
            required
            accept={DOCUMENT_ACCEPT}
            onChange={(e) => setTooBig((e.target.files?.[0]?.size ?? 0) > MAX_DOCUMENT_BYTES)}
            className={`${control} file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1`}
          />
        </label>
        <Button type="submit" disabled={pending || tooBig}>
          {pending ? t("Uploading…") : t("Upload")}
        </Button>
      </div>
      {tooBig && (
        <p role="alert" className="text-sm text-destructive">
          {t("This file is over 10 MB. Scan it at a lower resolution, or save the photo smaller.")}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {done && <p className="text-sm text-emerald-700">{t("Uploaded.")}</p>}
    </form>
  );
}
