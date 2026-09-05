/**
 * Lettura centralizzata delle variabili d'ambiente Supabase, con fallback al
 * prefisso creato dall'integrazione Vercel↔Supabase (qui "MEALFLOW_") quando
 * i nomi standard non sono presenti. Vedi la nota in `next.config.mjs` per la
 * parte che riguarda le variabili NEXT_PUBLIC_* (quelle devono comunque
 * chiamarsi così per finire nel bundle client: qui si legge il risultato già
 * "pontato" da Next.js, non direttamente MEALFLOW_SUPABASE_URL).
 */
export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

/** Solo lato server: non esporre mai al client. */
export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.MEALFLOW_SUPABASE_SERVICE_ROLE_KEY;
}
