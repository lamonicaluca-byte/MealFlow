"use client";

import * as React from "react";

import { useAppStore } from "@/store/app-store";
import { getRealtimeBus } from "@/lib/realtime/demo-bus";
import { useToast } from "@/hooks/use-toast";

/**
 * Inizializza lo stato applicativo (demo o, in futuro, repository Supabase)
 * una sola volta al mount e sottoscrive il bus realtime per mostrare un
 * toast discreto quando arriva un aggiornamento (§21): in modalità demo il
 * bus è alimentato dalle azioni dello stesso utente, ma l'architettura
 * pub/sub è la stessa che userebbe Supabase Realtime con più dispositivi.
 */
export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAppStore((s) => s.initialize);
  const { toast } = useToast();

  React.useEffect(() => {
    void initialize();
  }, [initialize]);

  React.useEffect(() => {
    const unsubscribe = getRealtimeBus().subscribe((event) => {
      toast({ title: "Aggiornamento in tempo reale", description: event.message });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
