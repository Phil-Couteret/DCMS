"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      disabled={pending}
      onClick={() => {
        setPending(true);
        signOut({ redirectTo: "/login" });
      }}
    >
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
