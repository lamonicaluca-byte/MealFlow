import { format, startOfWeek } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppState } from "@/store/types";
import {
  mapAuditLog,
  mapDietaryProfile,
  mapHousehold,
  mapInvitation,
  mapMeal,
  mapMealFeedback,
  mapMember,
  mapMenuVersion,
  mapNote,
  mapNotification,
  mapNotificationPreferences,
  mapPreferences,
  mapRole,
  mapShoppingHistory,
  mapShoppingList,
  mapShoppingListItem,
  mapUser,
  mapWeeklyMenu,
} from "./mappers";

const DATE_FMT = "yyyy-MM-dd";
const RECENT_WEEKS_LIMIT = 8;

/**
 * Carica lo stato applicativo completo da Supabase per l'utente autenticato
 * corrente, equivalente in produzione a `buildDemoState()`. Presuppone che il
 * chiamante abbia già una sessione valida (i cookie/JWT gestiscono
 * l'autenticazione; le query rispettano sempre le Row Level Security).
 */
export async function buildProductionState(supabase: SupabaseClient, userId: string): Promise<AppState> {
  const { data: roleRow, error: roleError } = await supabase
    .from("household_user_roles")
    .select("household_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleError || !roleRow) {
    throw new Error("Nessuna famiglia associata a questo account. Contatta chi ti ha invitato.");
  }
  const householdId = roleRow.household_id as string;

  const currentWeekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), DATE_FMT);

  // Bootstrap: garantisce che esista almeno il menu della settimana corrente
  // (lato server, con la service role key — mai eseguito dal browser).
  try {
    const ensureRes = await fetch("/api/menu/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStartDate: currentWeekStartDate }),
    });
    if (!ensureRes.ok) {
      const body = await ensureRes.json().catch(() => ({}));
      console.error("Bootstrap del menu non riuscito:", ensureRes.status, body);
    }
  } catch (error) {
    // Se il bootstrap fallisce (es. rete assente), si prosegue comunque con
    // ciò che è già presente nel database: l'utente vedrà semplicemente
    // ancora nessun menu, senza bloccare il resto dell'app.
    console.error("Bootstrap del menu non raggiungibile:", error);
  }

  const [usersRes, householdRes, membersRes, rolesRes, invitationsRes, profilesRes, preferencesRes] =
    await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("households").select("*").eq("id", householdId).single(),
      supabase.from("household_members").select("*").eq("household_id", householdId).is("deleted_at", null),
      supabase.from("household_user_roles").select("*").eq("household_id", householdId),
      supabase.from("invitations").select("*").eq("household_id", householdId),
      supabase
        .from("dietary_profiles")
        .select("*, allergies(*), intolerances(*), dietary_restrictions(*), dislikes(*)")
        .eq("household_id", householdId),
      supabase.from("preferences").select("*").eq("household_id", householdId).maybeSingle(),
    ]);

  const household = householdRes.data ? mapHousehold(householdRes.data) : null;

  const { data: menuRows } = await supabase
    .from("weekly_menus")
    .select("*")
    .eq("household_id", householdId)
    .order("week_start_date", { ascending: false })
    .limit(RECENT_WEEKS_LIMIT);
  const weeklyMenus = (menuRows ?? []).map(mapWeeklyMenu);
  const versionIds = weeklyMenus.map((m) => m.currentVersionId).filter(Boolean);

  const [versionsRes, mealsRes] = await Promise.all([
    versionIds.length
      ? supabase.from("menu_versions").select("*").in("id", versionIds)
      : Promise.resolve({ data: [] as unknown[] }),
    versionIds.length
      ? supabase.from("meals").select("*").in("menu_version_id", versionIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  const menuVersions = (versionsRes.data ?? []).map(mapMenuVersion);
  const meals = (mealsRes.data ?? []).map(mapMeal);
  const mealIds = meals.map((m) => m.id);

  const { data: shoppingListRows } = versionIds.length
    ? await supabase.from("shopping_lists").select("*").in("menu_version_id", versionIds)
    : { data: [] as unknown[] };
  const shoppingLists = (shoppingListRows ?? []).map(mapShoppingList);
  const shoppingListIds = shoppingLists.map((l) => l.id);

  const { data: shoppingItemRows } = shoppingListIds.length
    ? await supabase.from("shopping_list_items").select("*").in("shopping_list_id", shoppingListIds)
    : { data: [] as unknown[] };
  const shoppingListItems = (shoppingItemRows ?? []).map(mapShoppingListItem);
  const shoppingItemIds = shoppingListItems.map((i) => i.id);

  const [historyRes, notesRes, notificationsRes, notifPrefsRes, auditRes, feedbackRes] = await Promise.all([
    shoppingItemIds.length
      ? supabase.from("shopping_item_status_history").select("*").in("item_id", shoppingItemIds)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase.from("household_notes").select("*").eq("household_id", householdId).order("created_at", { ascending: false }).limit(50),
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("audit_logs").select("*").eq("household_id", householdId).order("created_at", { ascending: false }).limit(50),
    mealIds.length
      ? supabase.from("meal_feedback").select("*").in("meal_id", mealIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  return {
    status: "ready",
    currentUserId: userId,
    users: (usersRes.data ?? []).map(mapUser),
    household,
    members: (membersRes.data ?? []).map(mapMember),
    roles: (rolesRes.data ?? []).map(mapRole),
    invitations: (invitationsRes.data ?? []).map(mapInvitation),
    dietaryProfiles: (profilesRes.data ?? []).map(mapDietaryProfile),
    preferences: preferencesRes.data ? mapPreferences(preferencesRes.data) : null,
    weeklyMenus,
    menuVersions,
    meals,
    mealFeedback: (feedbackRes.data ?? []).map(mapMealFeedback),
    shoppingLists,
    shoppingListItems,
    shoppingItemHistory: (historyRes.data ?? []).map(mapShoppingHistory),
    notes: (notesRes.data ?? []).map(mapNote),
    notifications: (notificationsRes.data ?? []).map(mapNotification),
    notificationPreferences: notifPrefsRes.data ? [mapNotificationPreferences(notifPrefsRes.data)] : [],
    auditLog: (auditRes.data ?? []).map(mapAuditLog),
    recentActivity: [],
  };
}
