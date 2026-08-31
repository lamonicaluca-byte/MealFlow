"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured } from "./is-configured";

/**
 * Client Supabase per il browser. Restituisce `null` in modalità demo:
 * ogni chiamante deve gestire esplicitamente questo caso invece di assumere
 * sempre un backend reale (vedi `src/lib/data` per il pattern repository che
 * lo usa).
 */
export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
