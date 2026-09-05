"use client";

import { createBrowserClient } from "@supabase/ssr";

import { isSupabaseConfigured } from "./is-configured";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * Client Supabase per il browser. Restituisce `null` in modalità demo:
 * ogni chiamante deve gestire esplicitamente questo caso invece di assumere
 * sempre un backend reale (vedi `src/lib/data` per il pattern repository che
 * lo usa).
 */
export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(getSupabaseUrl() as string, getSupabaseAnonKey() as string);
}
