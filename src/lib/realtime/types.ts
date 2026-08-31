import type { RealtimeEvent } from "@/types/domain";

/**
 * Interfaccia comune del "bus" realtime. In modalità demo è implementata da
 * `DemoRealtimeBus` (EventTarget in-memory, §21 "in modalità demo, simulare
 * il realtime localmente"); quando è configurato Supabase, la stessa
 * interfaccia verrebbe soddisfatta da un adapter che usa
 * `supabase.channel(...)`, così i componenti React non cambiano.
 */
export interface RealtimeBus {
  publish(event: RealtimeEvent): void;
  subscribe(listener: (event: RealtimeEvent) => void): () => void;
}
