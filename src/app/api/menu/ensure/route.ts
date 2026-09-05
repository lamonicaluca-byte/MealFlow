import { NextResponse } from "next/server";
import { format, startOfWeek } from "date-fns";

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { ensureWeeklyMenu } from "@/lib/menu/generate-and-save-week";

const DATE_FMT = "yyyy-MM-dd";

/**
 * Bootstrap: genera (se manca) il weekly_menu della settimana corrente al
 * primo accesso di un utente. La generazione della settimana *successiva*
 * (ogni giovedì) è invece schedulata da `/api/cron/generate-next-week`,
 * indipendentemente da un accesso utente: vedi quella route per i dettagli.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase non configurato." }, { status: 400 });
  }

  const authClient = createSupabaseServerClient();
  const { data: userData } = (await authClient?.auth.getUser()) ?? { data: { user: null } };
  if (!userData?.user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { weekStartDate?: string };
  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return NextResponse.json({ error: "Configurazione server incompleta." }, { status: 500 });
  }

  const { data: roleRow } = await service
    .from("household_user_roles")
    .select("household_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!roleRow) {
    return NextResponse.json({ error: "Nessuna famiglia associata a questo utente." }, { status: 404 });
  }
  const householdId = roleRow.household_id as string;
  const weekStartDate = body.weekStartDate ?? format(startOfWeek(new Date(), { weekStartsOn: 1 }), DATE_FMT);

  const result = await ensureWeeklyMenu(service, householdId, weekStartDate);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, issues: result.issues }, { status: 422 });
  }
  return NextResponse.json({ menuId: result.menuId, created: result.created });
}
