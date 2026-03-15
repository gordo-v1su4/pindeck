"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void signOut()}>
      <LogOutIcon data-icon="inline-start" />
      Sign out
    </Button>
  );
}
