"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Panels are opened by a URL parameter and rendered on the server. They are
// always open while mounted; closing one navigates to closeHref, which drops
// the parameter and unmounts it.
interface PanelProps {
  closeHref: string;
  title: string;
  description?: string;
  wide?: boolean; // dialogs only: room for two-column forms
  children: React.ReactNode;
}

export function RoutedSheet({ closeHref, title, description, children }: PanelProps) {
  const router = useRouter();
  return (
    <Sheet open onOpenChange={(open) => !open && router.push(closeHref, { scroll: false })}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b border-zinc-200 pr-12">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export function RoutedDialog({ closeHref, title, description, wide, children }: PanelProps) {
  const router = useRouter();
  return (
    <Dialog open onOpenChange={(open) => !open && router.push(closeHref, { scroll: false })}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
