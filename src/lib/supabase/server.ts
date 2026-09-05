import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

import { isSupabaseConfigured } from "./is-configured";
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

/**
 * Client Supabase per Server Components / Route Handlers / Server Actions.
 * Restituisce `null` in modalità demo. Da usare SOLO lato server: la chiave
 * anon è comunque pubblica per design, ma questo client gestisce anche la
 * sessione via cookie httpOnly, che non deve mai essere manipolata dal
 * client bundle.
 */
export function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = cookies();

  return createServerClient(getSupabaseUrl() as string, getSupabaseAnonKey() as string, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Chiamato da un Server Component: next/headers non permette di
          // scrivere cookie lì. Il refresh sessione avviene nel middleware.
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // vedi nota sopra
        }
      },
    },
  });
}

/**
 * Client con la service_role key: bypassa ogni Row Level Security. Riservato
 * a operazioni server-to-server che non hanno un utente autenticato dietro
 * (login "accesso rapido", generazione schedulata del menu, keep-alive) — MAI
 * importato da un componente client, e mai usato per servire richieste
 * direttamente guidate dall'utente senza aver prima verificato i permessi
 * applicativi (vedi `src/lib/auth/permissions.ts`).
 */
export function createSupabaseServiceRoleClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
