import { NextResponse } from "next/server";
import { addWeeks, format, startOfWeek } from "date-fns";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { ensureWeeklyMenu } from "@/lib/menu/generate-and-save-week";

const DATE_FMT = "yyyy-MM-dd";

/**
 * Genera in anticipo il menu della settimana SUCCESSIVA per ogni famiglia,
 * in stato "pending_approval" — così chi approva ha tempo di farlo prima
 * del giorno della spesa, senza dover aspettare che qualcuno apra l'app.
 * Schedulata ogni giovedì (vercel.json); usa la stessa logica di
 * `/api/menu/ensure` (bootstrap al primo accesso, per la settimana
 * corrente), tramite `ensureWeeklyMenu` — è già idempotente: se il menu
 * esiste già (es. generato da un accesso utente nel frattempo), non fa
 * nulla.
 */
export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }
  }

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const nextWeekStartDate = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), DATE_FMT);

  const { data: households, error } = await service.from("households").select("id");
  if (error) {
    console.error("Impossibile elencare le famiglie per il cron:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results = [];
  for (const household of households ?? []) {
    const result = await ensureWeeklyMenu(service, household.id, nextWeekStartDate);
    if (!result.ok) {
      console.error(`Generazione menu fallita per la famiglia ${household.id}:`, result.error, result.issues);
    }
    results.push({ householdId: household.id, ...result });
  }

  return NextResponse.json({ ok: true, weekStartDate: nextWeekStartDate, results });
}
