"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

// Opens the print dialog once the page has rendered, with a button to open it
// again (hidden on paper).
export function AutoPrint() {
  const t = useT();
  useEffect(() => {
    const id = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <div className="mb-4 flex justify-end print:hidden">
      <Button variant="outline" onClick={() => window.print()}>
        {t("Print")}
      </Button>
    </div>
  );
}
