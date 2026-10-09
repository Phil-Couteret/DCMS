"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const t = useT();
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full border-white/40 bg-transparent text-white hover:bg-white/20 hover:text-white"
      disabled={pending}
      onClick={() => {
        setPending(true);
        signOut({ redirectTo: "/login" });
      }}
    >
      {pending ? t("Signing out…") : t("Sign out")}
    </Button>
  );
}
