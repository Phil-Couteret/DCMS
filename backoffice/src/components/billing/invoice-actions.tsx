"use client";

import { useActionState, useRef, useState } from "react";
import { emailInvoice } from "@/app/dashboard/billing/actions";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

// Print, Download PDF and Email for one invoice. All three use the same PDF
// (/dashboard/billing/{id}/pdf), so what is printed is what is sent.
export function InvoiceActions({ invoiceId, customerEmail }: { invoiceId: string; customerEmail: string | null }) {
  const t = useT();
  const pdfUrl = `/dashboard/billing/${invoiceId}/pdf`;
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [printing, setPrinting] = useState(false);
  const [state, action, pending] = useActionState(emailInvoice, null);

  // Loads the PDF in a hidden frame and opens the print dialog on it; where
  // the browser cannot (no built-in PDF viewer), opens it in a new tab.
  const print = () => {
    setPrinting(true);
    frame.current?.remove();
    const f = document.createElement("iframe");
    f.style.position = "fixed";
    f.style.width = "0";
    f.style.height = "0";
    f.style.border = "0";
    f.src = pdfUrl;
    f.onload = () => {
      setPrinting(false);
      try {
        f.contentWindow?.focus();
        f.contentWindow?.print();
      } catch {
        window.open(pdfUrl, "_blank", "noopener");
      }
    };
    document.body.appendChild(f);
    frame.current = f;
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={print} disabled={printing}>
          {printing ? t("Preparing…") : t("Print")}
        </Button>
        <Button variant="outline" nativeButton={false} render={<a href={`${pdfUrl}?download=1`} />}>
          {t("Download PDF")}
        </Button>
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm(t("Email this invoice to {email}?", { email: customerEmail ?? "" }))) e.preventDefault();
          }}
        >
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <Button
            type="submit"
            variant="outline"
            disabled={pending || !customerEmail}
            title={customerEmail ? t("Send the PDF to {email}", { email: customerEmail }) : t("This customer has no email address")}
          >
            {pending ? t("Sending…") : t("Email")}
          </Button>
        </form>
      </div>
      {state?.error && (
        <p role="alert" className="max-w-sm text-right text-xs text-destructive">
          {state.error}
        </p>
      )}
      {state?.message && !state.error && (
        <p role="status" className="text-xs text-green-700">
          {state.message}
        </p>
      )}
    </div>
  );
}
