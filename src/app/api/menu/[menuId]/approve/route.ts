import { NextResponse } from "next/server";

import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { canApproveMenu } from "@/lib/auth/permissions";
import { mapRole } from "@/lib/data/mappers";
import { aggregateIngredientLines, type IngredientLine } from "@/lib/shopping/aggregate-ingredients";

/**
 * Approva un menu, lato server, in un'unica richiesta atomica dal punto di
 * vista del client: a differenza delle altre mutazioni (che vengono
 * sincronizzate in modo "fire and forget"), l'approvazione comporta più
 * passaggi in sequenza (versione, stato del menu, creazione della lista
 * della spesa) — se il client navigasse via subito dopo l'azione, una
 * scrittura fire-and-forget rischierebbe di essere interrotta a metà.
 * Il client attende questa risposta prima di considerare l'approvazione
 * completata (vedi `approveMenu` in `src/store/app-store.ts`).
 */
export async function POST(request: Request, { params }: { params: { menuId: string } }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase non configurato." }, { status: 400 });
  }

  const authClient = createSupabaseServerClient();
  const { data: userData } = (await authClient?.auth.getUser()) ?? { data: { user: null } };
  if (!userData?.user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const service = createSupabaseServiceRoleClient();
  if (!service) {
    return NextResponse.json({ error: "Configurazione server incompleta." }, { status: 500 });
  }

  const { data: menuRow } = await service.from("weekly_menus").select("*").eq("id", params.menuId).maybeSingle();
  if (!menuRow) {
    return NextResponse.json({ error: "Menu non trovato." }, { status: 404 });
  }

  const { data: roleRow } = await service
    .from("household_user_roles")
    .select("*")
    .eq("household_id", menuRow.household_id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!roleRow || !canApproveMenu(mapRole(roleRow))) {
    return NextResponse.json({ error: "Non hai i permessi per approvare il menu." }, { status: 403 });
  }

  const { data: userRow } = await service.from("users").select("display_name").eq("id", userData.user.id).single();
  const actorName = userRow?.display_name ?? "Un familiare";
  const now = new Date().toISOString();

  const versionUpdate = await service
    .from("menu_versions")
    .update({ approved_by: userData.user.id, approved_by_name: actorName, approved_at: now, is_immutable: true })
    .eq("id", menuRow.current_version_id);
  if (versionUpdate.error) {
    return NextResponse.json({ error: versionUpdate.error.message }, { status: 500 });
  }

  const menuUpdate = await service.from("weekly_menus").update({ status: "approved" }).eq("id", params.menuId);
  if (menuUpdate.error) {
    return NextResponse.json({ error: menuUpdate.error.message }, { status: 500 });
  }

  const { data: existingList } = await service
    .from("shopping_lists")
    .select("id")
    .eq("menu_version_id", menuRow.current_version_id)
    .maybeSingle();

  if (!existingList) {
    const { data: mealRows } = await service.from("meals").select("*").eq("menu_version_id", menuRow.current_version_id);
    const lines: IngredientLine[] = (mealRows ?? []).flatMap((meal) =>
      (meal.recipe_snapshot?.ingredients ?? [])
        .filter((ing: { optional: boolean }) => !ing.optional)
        .map((ing: { name: string; quantity: number | null; unit: string | null; category: string }) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category,
          sourceKey: `${meal.day}|${meal.slot}`,
        })),
    );
    const aggregated = aggregateIngredientLines(lines as IngredientLine[]);

    const { data: newList, error: listError } = await service
      .from("shopping_lists")
      .insert({
        household_id: menuRow.household_id,
        menu_version_id: menuRow.current_version_id,
        week_start_date: menuRow.week_start_date,
      })
      .select("id")
      .single();
    if (listError || !newList) {
      return NextResponse.json({ error: listError?.message ?? "Impossibile creare la lista della spesa." }, { status: 500 });
    }

    if (aggregated.length > 0) {
      // A differenza del seed demo (che simula una spesa già parzialmente
      // fatta), in produzione un menu appena approvato genera una lista
      // interamente da comprare: nessuno stato viene inventato.
      const itemsPayload = aggregated.map((line) => ({
        shopping_list_id: newList.id,
        name: line.name,
        normalized_name: line.normalizedName,
        quantity: line.quantity,
        unit: line.unit,
        category: line.category,
        status: line.needsReviewReason ? "da_verificare" : "da_comprare",
        needs_review_reason: line.needsReviewReason,
        source_meal_ids: line.sourceKeys,
        created_by: null,
      }));
      const itemsInsert = await service.from("shopping_list_items").insert(itemsPayload);
      if (itemsInsert.error) {
        return NextResponse.json({ error: itemsInsert.error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true, approvedByName: actorName });
}
