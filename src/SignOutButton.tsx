"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { LogOutIcon } from "lucide-react";
import { api } from "../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  onBeforeSignOut?: () => void;
}

export function SignOutButton({ onBeforeSignOut }: SignOutButtonProps) {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {loggedInUser?.isAnonymous ? (
        <Badge variant="outline" className="border-amber-400/25 bg-amber-400/10 text-amber-300">
          Guest
        </Badge>
      ) : loggedInUser?.email ? (
        <Badge variant="outline" className="pd-user-email-badge max-w-[16rem] truncate">
          {loggedInUser.email}
        </Badge>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onBeforeSignOut?.();
          void signOut();
        }}
      >
        <LogOutIcon data-icon="inline-start" />
        Sign out
      </Button>
    </div>
  );
}
