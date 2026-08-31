"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Skeleton } from "@/components/ui/skeleton";

/** Protegge le route dell'area applicativa: senza sessione demo attiva, reindirizza al login. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAppStore((s) => s.status);
  const { isAuthenticated } = useCurrentUser();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "ready" && !isAuthenticated) {
      router.replace("/login");
    }
  }, [status, isAuthenticated, router]);

  if (status !== "ready" || !isAuthenticated) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 p-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
