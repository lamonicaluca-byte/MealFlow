import type { SupabaseClient } from "@supabase/supabase-js";

import { getMenuGenerationService } from "@/lib/services/menu-generation";
import type { HouseholdContext, RecipeFeedbackNote } from "@/lib/services/menu-generation/types";
import type { GeneratedWeek } from "@/lib/validation/menu-schema";
import type { WeekValidationIssue } from "@/lib/validation/validate-generated-week";
import { mapDietaryProfile, mapHousehold, mapMember, mapPreferences } from "@/lib/data/mappers";

export type EnsureWeeklyMenuResult =
  | { ok: true; menuId: string; created: boolean }
  | { ok: false; error: string; issues?: WeekValidationIssue[] };

/**
 * Genera (se manca) il weekly_menu di una famiglia per la settimana
 * richiesta e lo salva sul database, in stato "pending_approval": nessuna
 * approvazione viene mai simulata automaticamente in produzione. Usata sia
 * da `/api/menu/ensure` (bootstrap al primo accesso, per la settimana
 * corrente) sia da `/api/cron/generate-next-week` (schedulato ogni giovedì,
 * per la settimana successiva): stessa logica, stesso client service-role,
 * cambia solo chi la richiama e quale settimana passa.
 */
export async function ensureWeeklyMenu(
  service: SupabaseClient,
  householdId: string,
  weekStartDate: string,
): Promise<EnsureWeeklyMenuResult> {
  const { data: existing } = await service
    .from("weekly_menus")
    .select("id")
    .eq("household_id", householdId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (existing) {
    return { ok: true, menuId: existing.id, created: false };
  }

  const [{ data: householdRow }, { data: memberRows }, { data: profileRows }, { data: preferencesRow }, { data: feedbackRows }] =
    await Promise.all([
      service.from("households").select("*").eq("id", householdId).single(),
      service.from("household_members").select("*").eq("household_id", householdId).is("deleted_at", null),
      service
        .from("dietary_profiles")
        .select("*, allergies(*), intolerances(*), dietary_restrictions(*), dislikes(*)")
        .eq("household_id", householdId),
      service.from("preferences").select("*").eq("household_id", householdId).maybeSingle(),
      // Feedback recente (§15): usato per non riproporre piatti segnati "da
      // non riproporre", sia dal provider mock che dal prompt AI reale.
      service
        .from("meal_feedback")
        .select("tags, note, created_at, meals(recipe_snapshot), users(display_name)")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (!householdRow || !memberRows) {
    return { ok: false, error: "Dati della famiglia incompleti." };
  }

  const context: HouseholdContext = {
    household: mapHousehold(householdRow),
    members: memberRows.map(mapMember),
    dietaryProfiles: (profileRows ?? []).map(mapDietaryProfile),
    preferences: preferencesRow
      ? mapPreferences(preferencesRow)
      : {
          id: "",
          householdId,
          favoriteDishes: [],
          dislikedDishes: [],
          favoriteVegetables: [],
          favoriteFish: [],
          favoriteLegumes: [],
          favoriteBreakfasts: [],
          updatedAt: new Date().toISOString(),
        },
    recentFeedback: mapFeedbackRows(feedbackRows ?? []),
  };

  const menuService = await getMenuGenerationService();
  const result = await menuService.generateWeeklyMenu({ context, weekStartDate });
  if (!result.ok) {
    return { ok: false, error: result.error.message, issues: result.error.issues };
  }
  const week = result.data as GeneratedWeek;

  const now = new Date().toISOString();
  const { data: menuRow, error: menuError } = await service
    .from("weekly_menus")
    .insert({
      household_id: householdId,
      week_start_date: weekStartDate,
      status: "pending_approval",
      created_by: null,
    })
    .select("id")
    .single();
  if (menuError || !menuRow) {
    return { ok: false, error: menuError?.message ?? "Impossibile creare il menu." };
  }

  const { data: versionRow, error: versionError } = await service
    .from("menu_versions")
    .insert({ menu_id: menuRow.id, version_number: 1, is_immutable: false })
    .select("id")
    .single();
  if (versionError || !versionRow) {
    return { ok: false, error: versionError?.message ?? "Impossibile creare la versione." };
  }

  const { error: updateMenuError } = await service
    .from("weekly_menus")
    .update({ current_version_id: versionRow.id })
    .eq("id", menuRow.id);
  if (updateMenuError) {
    return { ok: false, error: updateMenuError.message };
  }

  const mealsPayload = week.meals.map((m) => ({
    menu_version_id: versionRow.id,
    day: m.day,
    date: m.date,
    slot: m.slot,
    // recipe_id resta null: il catalogo `recipes` non è popolato con le
    // ricette demo (che vivono come dati TS in demo-recipes.ts, con id
    // testuali non-UUID). La fotografia completa della ricetta — l'unica
    // fonte di verità per questo pasto — è recipe_snapshot.
    recipe_snapshot: m.recipe,
    is_manually_added: m.isManuallyAdded,
    chalika_note: m.chalikaNote,
    family_note: m.familyNote,
    child_adaptation_note: m.childAdaptationNote,
    uses_existing_pantry_items: m.usesExistingPantryItems,
    uses_leftovers: m.usesLeftovers,
    updated_at: now,
  }));
  const { error: mealsError } = await service.from("meals").insert(mealsPayload);
  if (mealsError) {
    return { ok: false, error: mealsError.message };
  }

  return { ok: true, menuId: menuRow.id, created: true };
}

/**
 * Riga grezza di `meal_feedback` con le risorse annidate (`meals`, `users`)
 * incluse dalla select PostgREST: senza tipi generati dalla CLI, il client
 * Supabase non sa distinguere una relazione to-one da una to-many, quindi
 * resta `any` (stesso confine deliberato documentato in `mappers.ts`).
 */
type FeedbackRow = Record<string, any>;

/** Normalizza una risorsa annidata PostgREST, che a seconda dei tipi generati può arrivare come oggetto singolo o array di un elemento. */
function firstOrSelf<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function mapFeedbackRows(rows: FeedbackRow[]): RecipeFeedbackNote[] {
  const notes: RecipeFeedbackNote[] = [];
  for (const row of rows) {
    const meal = firstOrSelf(row.meals);
    const recipeName = meal?.recipe_snapshot?.name;
    if (!recipeName) continue;
    const user = firstOrSelf(row.users);
    notes.push({
      recipeName,
      tags: row.tags ?? [],
      note: row.note,
      submittedByName: user?.display_name ?? null,
      createdAt: row.created_at,
    });
  }
  return notes;
}
