import { NextResponse } from "next/server";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * Keep-alive del progetto Supabase free tier: una query leggera e innocua
 * (conta le righe di `households`, tabella sempre presente) che mantiene il
 * database "attivo" per Supabase, che mette in pausa i progetti gratuiti
 * dopo un periodo di inattività prolungato.
 *
 * Chiamata da un Vercel Cron Job (vedi vercel.json), non da un utente: se
 * `CRON_SECRET` è configurato, la richiesta deve portare l'header
 * `Authorization: Bearer <CRON_SECRET>` che Vercel aggiunge automaticamente
 * alle chiamate schedulate quando quella variabile d'ambiente esiste nel
 * progetto — così la route non è invocabile da chiunque la trovi.
 */
export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    // Supabase non configurato (es. anteprima in modalità demo): non c'è
    // nulla da tenere sveglio, si risponde comunque 200 per non far fallire
    // il cron.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await supabase.from("households").select("id").limit(1);
  if (error) {
    console.error("Keep-alive Supabase non riuscito:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
