import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

/**
 * L'app funziona interamente in modalità demo quando Supabase non è
 * configurato (o quando `NEXT_PUBLIC_FORCE_DEMO_MODE=true`, utile per
 * ambienti di anteprima pubblici che non devono esporre un database reale).
 */
export function isSupabaseConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_FORCE_DEMO_MODE === "true") return false;
  return Boolean(getSupabaseUrl()) && Boolean(getSupabaseAnonKey());
}
