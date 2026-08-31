import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { isSupabaseConfigured } from "./is-configured";

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

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
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
