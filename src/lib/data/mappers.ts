/**
 * Mapping snake_case (schema Postgres) <-> camelCase (dominio applicativo),
 * usato dai repository Supabase. Ogni funzione è pura e non fa I/O.
 */
import type {
  AppNotification,
  AppUser,
  AuditLogEntry,
  DietaryProfile,
  Household,
  HouseholdMember,
  HouseholdNote,
  HouseholdPreferences,
  HouseholdUserRole,
  Invitation,
  Meal,
  MealFeedback,
  MenuVersion,
  NotificationPreferences,
  Recipe,
  ShoppingItemStatusHistoryEntry,
  ShoppingList,
  ShoppingListItem,
  WeeklyMenu,
} from "@/types/domain";

/**
 * Riga grezza da PostgREST: i tipi di ritorno di @supabase/supabase-js senza
 * generazione automatica dei tipi (che richiederebbe la CLI collegata al
 * progetto) sono `any`; questo alias li isola in un unico punto documentato,
 * invece di propagare `any` in tutte le firme dei mapper.
 */
type Row = Record<string, any>;

export function mapUser(row: Row): AppUser {
  return { id: row.id, email: row.email, displayName: row.display_name, createdAt: row.created_at };
}

export function mapHousehold(row: Row): Household {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    onboardingCompletedAt: row.onboarding_completed_at,
    onboardingStep: row.onboarding_step,
    settings: {
      shoppingDay: row.shopping_day,
      weekStartsOn: row.week_starts_on,
      budgetLevel: row.budget_level,
      maxPrepMinutesWeekday: row.max_prep_minutes_weekday,
      maxPrepMinutesWeekend: row.max_prep_minutes_weekend,
      chalikaCookingDays: row.chalika_cooking_days ?? [],
      varietyLevel: row.variety_level,
    },
  };
}

export function householdSettingsToRow(settings: Partial<Household["settings"]>): Row {
  const row: Row = {};
  if (settings.shoppingDay !== undefined) row.shopping_day = settings.shoppingDay;
  if (settings.weekStartsOn !== undefined) row.week_starts_on = settings.weekStartsOn;
  if (settings.budgetLevel !== undefined) row.budget_level = settings.budgetLevel;
  if (settings.maxPrepMinutesWeekday !== undefined) row.max_prep_minutes_weekday = settings.maxPrepMinutesWeekday;
  if (settings.maxPrepMinutesWeekend !== undefined) row.max_prep_minutes_weekend = settings.maxPrepMinutesWeekend;
  if (settings.chalikaCookingDays !== undefined) row.chalika_cooking_days = settings.chalikaCookingDays;
  if (settings.varietyLevel !== undefined) row.variety_level = settings.varietyLevel;
  return row;
}

export function mapMember(row: Row): HouseholdMember {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    displayName: row.display_name,
    ageGroup: row.age_group,
    age: row.age,
    isDemo: row.is_demo ?? false,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function mapRole(row: Row): HouseholdUserRole {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    role: row.role,
    operationalRole: row.operational_role,
    permissions:
      row.role === "collaborator"
        ? {
            canViewMenu: row.can_view_menu,
            canViewRecipes: row.can_view_recipes,
            canViewOperationalNotes: row.can_view_operational_notes,
            canUpdateShoppingList: row.can_update_shopping_list,
            canMarkPantryItems: row.can_mark_pantry_items,
            canAddManualItems: row.can_add_manual_items,
            canApproveMenu: false,
            canEditAllergies: false,
            canEditRoles: false,
          }
        : null,
    createdAt: row.created_at,
  };
}

export function mapInvitation(row: Row): Invitation {
  return {
    id: row.id,
    householdId: row.household_id,
    email: row.email,
    role: row.role,
    operationalRole: row.operational_role,
    invitedBy: row.invited_by,
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
  };
}

export function mapDietaryProfile(row: Row): DietaryProfile {
  return {
    id: row.id,
    householdId: row.household_id,
    memberId: row.member_id,
    allergies: (row.allergies ?? []).map((a: Row) => ({
      id: a.id,
      allergen: a.allergen,
      severity: a.severity,
      notes: a.notes,
    })),
    intolerances: (row.intolerances ?? []).map((i: Row) => ({ id: i.id, substance: i.substance, notes: i.notes })),
    restrictions: (row.dietary_restrictions ?? []).map((r: Row) => ({
      id: r.id,
      ingredient: r.ingredient,
      reason: r.reason,
    })),
    dislikes: (row.dislikes ?? []).map((d: Row) => ({ id: d.id, ingredientOrDish: d.ingredient_or_dish })),
    preferredDishes: row.preferred_dishes ?? [],
    dislikedTextures: row.disliked_textures ?? [],
    familyNotes: row.family_notes,
    opennessToNewDishes: row.openness_to_new_dishes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPreferences(row: Row): HouseholdPreferences {
  return {
    id: row.id,
    householdId: row.household_id,
    favoriteDishes: row.favorite_dishes ?? [],
    dislikedDishes: row.disliked_dishes ?? [],
    favoriteVegetables: row.favorite_vegetables ?? [],
    favoriteFish: row.favorite_fish ?? [],
    favoriteLegumes: row.favorite_legumes ?? [],
    favoriteBreakfasts: row.favorite_breakfasts ?? [],
    updatedAt: row.updated_at,
  };
}

export function preferencesToRow(patch: Partial<HouseholdPreferences>): Row {
  const row: Row = {};
  if (patch.favoriteDishes !== undefined) row.favorite_dishes = patch.favoriteDishes;
  if (patch.dislikedDishes !== undefined) row.disliked_dishes = patch.dislikedDishes;
  if (patch.favoriteVegetables !== undefined) row.favorite_vegetables = patch.favoriteVegetables;
  if (patch.favoriteFish !== undefined) row.favorite_fish = patch.favoriteFish;
  if (patch.favoriteLegumes !== undefined) row.favorite_legumes = patch.favoriteLegumes;
  if (patch.favoriteBreakfasts !== undefined) row.favorite_breakfasts = patch.favoriteBreakfasts;
  return row;
}

export function mapWeeklyMenu(row: Row): WeeklyMenu {
  return {
    id: row.id,
    householdId: row.household_id,
    weekStartDate: row.week_start_date,
    status: row.status,
    currentVersionId: row.current_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export function mapMenuVersion(row: Row): MenuVersion {
  return {
    id: row.id,
    menuId: row.menu_id,
    versionNumber: row.version_number,
    previousVersionId: row.previous_version_id,
    approvedBy: row.approved_by,
    approvedByName: row.approved_by_name,
    approvedAt: row.approved_at,
    changeReason: row.change_reason,
    createdAt: row.created_at,
    createdBy: row.created_by,
    isImmutable: row.is_immutable,
  };
}

export function mapMeal(row: Row): Meal {
  return {
    id: row.id,
    menuVersionId: row.menu_version_id,
    day: row.day,
    date: row.date,
    slot: row.slot,
    recipeId: row.recipe_id,
    recipeSnapshot: row.recipe_snapshot as Recipe | null,
    isManuallyAdded: row.is_manually_added,
    attendance: {
      type: row.attendance_type,
      absentMemberIds: row.attendance_absent_member_ids ?? [],
      guestsCount: row.attendance_guests_count ?? 0,
      guestsNote: row.attendance_guests_note,
    },
    chalikaNote: row.chalika_note,
    familyNote: row.family_note,
    childAdaptationNote: row.child_adaptation_note,
    usesExistingPantryItems: row.uses_existing_pantry_items ?? [],
    usesLeftovers: row.uses_leftovers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export function mealToRow(meal: Partial<Meal> & { menuVersionId: string; day: string; date: string; slot: string }): Row {
  return {
    menu_version_id: meal.menuVersionId,
    day: meal.day,
    date: meal.date,
    slot: meal.slot,
    recipe_id: meal.recipeId,
    recipe_snapshot: meal.recipeSnapshot,
    is_manually_added: meal.isManuallyAdded ?? false,
    attendance_type: meal.attendance?.type ?? "tutti_presenti",
    attendance_absent_member_ids: meal.attendance?.absentMemberIds ?? [],
    attendance_guests_count: meal.attendance?.guestsCount ?? 0,
    attendance_guests_note: meal.attendance?.guestsNote ?? null,
    chalika_note: meal.chalikaNote ?? null,
    family_note: meal.familyNote ?? null,
    child_adaptation_note: meal.childAdaptationNote ?? null,
    uses_existing_pantry_items: meal.usesExistingPantryItems ?? [],
    uses_leftovers: meal.usesLeftovers ?? false,
    updated_by: meal.updatedBy,
  };
}

export function mapShoppingList(row: Row): ShoppingList {
  return {
    id: row.id,
    householdId: row.household_id,
    menuVersionId: row.menu_version_id,
    weekStartDate: row.week_start_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapShoppingListItem(row: Row): ShoppingListItem {
  return {
    id: row.id,
    shoppingListId: row.shopping_list_id,
    name: row.name,
    normalizedName: row.normalized_name,
    quantity: row.quantity !== null ? Number(row.quantity) : null,
    unit: row.unit,
    category: row.category,
    status: row.status,
    note: row.note,
    isManual: row.is_manual,
    sourceMealIds: row.source_meal_ids ?? [],
    needsReviewReason: row.needs_review_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

export function shoppingListItemToRow(item: Partial<ShoppingListItem> & { shoppingListId: string }): Row {
  const row: Row = { shopping_list_id: item.shoppingListId };
  if (item.name !== undefined) row.name = item.name;
  if (item.normalizedName !== undefined) row.normalized_name = item.normalizedName;
  if (item.quantity !== undefined) row.quantity = item.quantity;
  if (item.unit !== undefined) row.unit = item.unit;
  if (item.category !== undefined) row.category = item.category;
  if (item.status !== undefined) row.status = item.status;
  if (item.note !== undefined) row.note = item.note;
  if (item.isManual !== undefined) row.is_manual = item.isManual;
  if (item.sourceMealIds !== undefined) row.source_meal_ids = item.sourceMealIds;
  if (item.needsReviewReason !== undefined) row.needs_review_reason = item.needsReviewReason;
  if (item.createdBy !== undefined) row.created_by = item.createdBy;
  return row;
}

export function mapShoppingHistory(row: Row): ShoppingItemStatusHistoryEntry {
  return {
    id: row.id,
    itemId: row.item_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedBy: row.changed_by,
    changedByName: row.changed_by_name,
    changedAt: row.changed_at,
  };
}

export function mapNote(row: Row): HouseholdNote {
  return {
    id: row.id,
    householdId: row.household_id,
    scope: row.scope,
    refId: row.ref_id,
    authorId: row.author_id,
    authorName: row.author_name,
    text: row.text,
    createdAt: row.created_at,
  };
}

export function mapNotification(row: Row): AppNotification {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function mapNotificationPreferences(row: Row): NotificationPreferences {
  return {
    userId: row.user_id,
    menuPronto: row.menu_pronto,
    promemoriaApprovazione: row.promemoria_approvazione,
    menuApprovato: row.menu_approvato,
    spesaAggiornata: row.spesa_aggiornata,
    noteAggiunte: row.note_aggiunte,
    canale: row.canale,
  };
}

export function mapAuditLog(row: Row): AuditLogEntry {
  return {
    id: row.id,
    householdId: row.household_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export function mapMealFeedback(row: Row): MealFeedback {
  return {
    id: row.id,
    mealId: row.meal_id,
    householdId: row.household_id,
    createdBy: row.created_by,
    tags: row.tags ?? [],
    note: row.note,
    createdAt: row.created_at,
  };
}

export function dietaryProfileToRow(patch: Partial<DietaryProfile>): Row {
  const row: Row = {};
  if (patch.preferredDishes !== undefined) row.preferred_dishes = patch.preferredDishes;
  if (patch.dislikedTextures !== undefined) row.disliked_textures = patch.dislikedTextures;
  if (patch.familyNotes !== undefined) row.family_notes = patch.familyNotes;
  if (patch.opennessToNewDishes !== undefined) row.openness_to_new_dishes = patch.opennessToNewDishes;
  return row;
}

export function notificationPreferencesToRow(patch: Partial<NotificationPreferences>): Row {
  const row: Row = {};
  if (patch.menuPronto !== undefined) row.menu_pronto = patch.menuPronto;
  if (patch.promemoriaApprovazione !== undefined) row.promemoria_approvazione = patch.promemoriaApprovazione;
  if (patch.menuApprovato !== undefined) row.menu_approvato = patch.menuApprovato;
  if (patch.spesaAggiornata !== undefined) row.spesa_aggiornata = patch.spesaAggiornata;
  if (patch.noteAggiunte !== undefined) row.note_aggiunte = patch.noteAggiunte;
  if (patch.canale !== undefined) row.canale = patch.canale;
  return row;
}

export function invitationToRow(invitation: Invitation): Row {
  return {
    household_id: invitation.householdId,
    email: invitation.email,
    role: invitation.role,
    operational_role: invitation.operationalRole,
    invited_by: invitation.invitedBy,
    token: invitation.token,
    status: invitation.status,
    expires_at: invitation.expiresAt,
  };
}
