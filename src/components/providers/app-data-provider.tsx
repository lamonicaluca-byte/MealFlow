"use client";

import * as React from "react";

import { useAppStore } from "@/store/app-store";
import { getRealtimeBus } from "@/lib/realtime/demo-bus";
import { useToast } from "@/hooks/use-toast";

/**
 * Inizializza lo stato applicativo (demo o Supabase) una sola volta al mount
 * e sottoscrive il bus realtime per mostrare un toast discreto quando arriva
 * un aggiornamento (§21). In modalità demo il bus è alimentato dalle azioni
 * dello stesso utente (nessuna rete); in produzione `subscribeRealtime()`
 * collega Supabase Realtime allo stesso bus, così i componenti React non
 * distinguono le due modalità: un cambiamento fatto da un altro dispositivo
 * (es. "Chalika ha segnato le zucchine come comprate") arriva qui allo
 * stesso modo.
 */
export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAppStore((s) => s.initialize);
  const subscribeRealtime = useAppStore((s) => s.subscribeRealtime);
  const { toast } = useToast();

  React.useEffect(() => {
    void initialize();
  }, [initialize]);

  React.useEffect(() => {
    const unsubscribeDemoBus = getRealtimeBus().subscribe((event) => {
      toast({ title: "Aggiornamento in tempo reale", description: event.message });
    });
    const unsubscribeRealtime = subscribeRealtime();
    return () => {
      unsubscribeDemoBus();
      unsubscribeRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
