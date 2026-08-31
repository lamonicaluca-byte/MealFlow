"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";

/** Splash screen (§16.1): breve schermata di brand, poi smista verso login o home. */
export default function SplashPage() {
  const status = useAppStore((s) => s.status);
  const { isAuthenticated } = useCurrentUser();
  const router = useRouter();

  React.useEffect(() => {
    if (status !== "ready") return;
    const timeout = setTimeout(() => {
      router.replace(isAuthenticated ? "/home" : "/login");
    }, 700);
    return () => clearTimeout(timeout);
  }, [status, isAuthenticated, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="font-display text-5xl font-semibold tracking-tight text-foreground">MealFlow</span>
      <p className="text-eyebrow">Meno decisioni, più tempo insieme.</p>
      <div className="mt-8 h-1 w-24 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-shimmer bg-[linear-gradient(90deg,transparent,hsl(var(--crimson)),transparent)] bg-[length:200%_100%]" />
      </div>
    </div>
  );
}
