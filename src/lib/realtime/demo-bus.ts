import type { RealtimeEvent } from "@/types/domain";
import type { RealtimeBus } from "./types";

/**
 * Implementazione del realtime per la modalità demo: un pub/sub in-memory,
 * condiviso da tutta la scheda del browser (singleton). Simula ciò che in
 * produzione arriverebbe da Supabase Realtime (postgres_changes / broadcast)
 * senza richiedere alcuna rete: utile anche per gli storybook/i test.
 */
class DemoRealtimeBus implements RealtimeBus {
  private listeners = new Set<(event: RealtimeEvent) => void>();

  publish(event: RealtimeEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  subscribe(listener: (event: RealtimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

let instance: DemoRealtimeBus | null = null;

export function getRealtimeBus(): RealtimeBus {
  if (!instance) instance = new DemoRealtimeBus();
  return instance;
}
