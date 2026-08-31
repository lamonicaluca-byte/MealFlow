import { addDays, addWeeks, format, startOfWeek, subDays } from "date-fns";

import type {
  AppNotification,
  AuditLogEntry,
  HouseholdNote,
  LeftoverItem,
  Meal,
  MealFeedback,
  MenuVersion,
  NotificationPreferences,
  Recipe,
  ShoppingList,
  ShoppingListItem,
  WeeklyMenu,
} from "@/types/domain";
import { generateId } from "@/lib/utils";
import { getMenuGenerationService } from "@/lib/services/menu-generation";
import type { HouseholdContext } from "@/lib/services/menu-generation/types";
import type { GeneratedMeal, GeneratedWeek } from "@/lib/validation/menu-schema";
import { aggregateIngredientLines, type IngredientLine } from "@/lib/shopping/aggregate-ingredients";
import { normalizeIngredientName } from "@/lib/shopping/normalize-ingredient";
import {
  DEMO_DIETARY_PROFILES,
  DEMO_HOUSEHOLD,
  DEMO_MEMBERS,
  DEMO_PANTRY_ITEMS,
  DEMO_PREFERENCES,
  DEMO_ROLES,
  DEMO_USERS,
} from "./demo-household";
import { DEMO_USER_IDS } from "./demo-ids";
import type { AppState } from "@/store/types";

const DATE_FMT = "yyyy-MM-dd";

function buildHouseholdContext(): HouseholdContext {
  return {
    household: DEMO_HOUSEHOLD,
    members: DEMO_MEMBERS,
    dietaryProfiles: DEMO_DIETARY_PROFILES,
    preferences: DEMO_PREFERENCES,
    pantryItems: DEMO_PANTRY_ITEMS,
  };
}

function toMeal(generated: GeneratedMeal, menuVersionId: string, createdBy: string, now: string): Meal {
  return {
    id: generateId("meal"),
    menuVersionId,
    day: generated.day,
    date: generated.date,
    slot: generated.slot,
    recipeId: generated.recipe.id,
    recipeSnapshot: generated.recipe as Recipe,
    isManuallyAdded: generated.isManuallyAdded,
    attendance: { type: "tutti_presenti", absentMemberIds: [], guestsCount: 0, guestsNote: null },
    chalikaNote: generated.chalikaNote,
    familyNote: generated.familyNote,
    childAdaptationNote: generated.childAdaptationNote,
    usesExistingPantryItems: generated.usesExistingPantryItems,
    usesLeftovers: generated.usesLeftovers,
    createdAt: now,
    updatedAt: now,
    updatedBy: createdBy,
  };
}

function buildShoppingListFromMeals(
  meals: Meal[],
  householdId: string,
  menuVersionId: string,
  weekStartDate: string,
  now: string,
): { list: ShoppingList; items: ShoppingListItem[] } {
  const pantryByName = new Map(DEMO_PANTRY_ITEMS.map((p) => [p.normalizedName, p]));

  const lines: IngredientLine[] = meals.flatMap((meal) =>
    (meal.recipeSnapshot?.ingredients ?? [])
      .filter((ing) => !ing.optional)
      .map((ing) => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        sourceKey: `${meal.day}|${meal.slot}`,
      })),
  );

  const aggregated = aggregateIngredientLines(lines);
  const listId = generateId("shp");

  const items: ShoppingListItem[] = aggregated.map((line, index) => {
    const pantryMatch = pantryByName.get(normalizeIngredientName(line.name));
    let status: ShoppingListItem["status"];
    if (line.needsReviewReason) {
      status = "da_verificare";
    } else if (pantryMatch?.availability === "disponibile") {
      status = "gia_in_casa";
    } else {
      // Alterna comprato/da comprare per simulare una spesa già in corso.
      status = index % 2 === 0 ? "comprato" : "da_comprare";
    }

    return {
      id: generateId("itm"),
      shoppingListId: listId,
      name: line.name,
      normalizedName: line.normalizedName,
      quantity: line.quantity,
      unit: line.unit,
      category: line.category,
      status,
      note: null,
      isManual: false,
      sourceMealIds: line.sourceKeys,
      needsReviewReason: line.needsReviewReason,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    };
  });

  // Un paio di articoli manuali, per mostrare la funzionalità "aggiungi prodotto".
  items.push(
    {
      id: generateId("itm"),
      shoppingListId: listId,
      name: "Detersivo piatti",
      normalizedName: "detersivo piatti",
      quantity: 1,
      unit: "pz",
      category: "casa",
      status: "da_comprare",
      note: "Quasi finito",
      isManual: true,
      sourceMealIds: [],
      needsReviewReason: null,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_IDS.chalika,
    },
    {
      id: generateId("itm"),
      shoppingListId: listId,
      name: "Tovaglioli di carta",
      normalizedName: "tovaglioli di carta",
      quantity: 2,
      unit: "pz",
      category: "altro",
      status: "comprato",
      note: null,
      isManual: true,
      sourceMealIds: [],
      needsReviewReason: null,
      createdAt: now,
      updatedAt: now,
      createdBy: DEMO_USER_IDS.luca,
    },
  );

  const list: ShoppingList = {
    id: listId,
    householdId,
    menuVersionId,
    weekStartDate,
    createdAt: now,
    updatedAt: now,
  };

  return { list, items };
}

/**
 * Costruisce lo stato demo completo, calcolato SEMPRE rispetto alla data
 * odierna (mai hardcoded): la settimana corrente è approvata (con spesa
 * parzialmente fatta), la settimana successiva è generata e in attesa di
 * approvazione. Questo garantisce che la demo sia sempre significativa,
 * indipendentemente dal giorno in cui viene aperta — la Home resta libera di
 * calcolare le proprie priorità in base al giorno reale (§17).
 */
export async function buildDemoState(): Promise<AppState> {
  const service = getMenuGenerationService();
  const context = buildHouseholdContext();

  const today = new Date();
  const currentWeekStartDate = format(startOfWeek(today, { weekStartsOn: 1 }), DATE_FMT);
  const nextWeekStartDate = format(addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1), DATE_FMT);

  const [currentResult, nextResult] = await Promise.all([
    service.generateWeeklyMenu({ context, weekStartDate: currentWeekStartDate }),
    service.generateWeeklyMenu({ context, weekStartDate: nextWeekStartDate }),
  ]);

  if (!currentResult.ok || !nextResult.ok) {
    throw new Error("Impossibile generare i dati demo: il MockMenuProvider ha restituito un errore.");
  }

  const now = today.toISOString();
  const approvedAt = subDays(startOfWeek(today, { weekStartsOn: 1 }), 3).toISOString(); // giovedì precedente

  // --- Settimana corrente: approvata ---------------------------------------
  const currentMenuId = generateId("menu");
  const currentVersionId = generateId("ver");
  const currentMeals = (currentResult.data as GeneratedWeek).meals.map((m) =>
    toMeal(m, currentVersionId, "system", approvedAt),
  );

  const currentVersion: MenuVersion = {
    id: currentVersionId,
    menuId: currentMenuId,
    versionNumber: 1,
    previousVersionId: null,
    approvedBy: DEMO_USER_IDS.moglie,
    approvedByName: "Moglie di Luca",
    approvedAt,
    changeReason: null,
    createdAt: approvedAt,
    createdBy: "system",
    isImmutable: true,
  };

  const currentMenu: WeeklyMenu = {
    id: currentMenuId,
    householdId: DEMO_HOUSEHOLD.id,
    weekStartDate: currentWeekStartDate,
    status: "approved",
    currentVersionId,
    createdAt: approvedAt,
    updatedAt: approvedAt,
    createdBy: "system",
  };

  const { list: currentShoppingList, items: currentShoppingItems } = buildShoppingListFromMeals(
    currentMeals,
    DEMO_HOUSEHOLD.id,
    currentVersionId,
    currentWeekStartDate,
    approvedAt,
  );

  // --- Settimana successiva: generata, in attesa di approvazione -----------
  const nextMenuId = generateId("menu");
  const nextVersionId = generateId("ver");
  const nextMeals = ((nextResult.data as GeneratedWeek).meals).map((m) => toMeal(m, nextVersionId, "system", now));

  const nextVersion: MenuVersion = {
    id: nextVersionId,
    menuId: nextMenuId,
    versionNumber: 1,
    previousVersionId: null,
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    changeReason: null,
    createdAt: now,
    createdBy: "system",
    isImmutable: false,
  };

  const nextMenu: WeeklyMenu = {
    id: nextMenuId,
    householdId: DEMO_HOUSEHOLD.id,
    weekStartDate: nextWeekStartDate,
    status: "pending_approval",
    currentVersionId: nextVersionId,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
  };

  const leftovers: LeftoverItem[] = [
    {
      id: generateId("lo"),
      householdId: DEMO_HOUSEHOLD.id,
      dishOrIngredient: "Parmigiana di melanzane",
      quantity: "circa 2 porzioni",
      loggedOn: format(subDays(today, 1), DATE_FMT),
      expiresOn: format(addDays(today, 1), DATE_FMT),
      note: "In frigorifero, contenitore blu.",
      status: "disponibile",
      createdAt: now,
      createdBy: DEMO_USER_IDS.moglie,
    },
    {
      id: generateId("lo"),
      householdId: DEMO_HOUSEHOLD.id,
      dishOrIngredient: "Riso in bianco",
      quantity: "una ciotola",
      loggedOn: format(subDays(today, 2), DATE_FMT),
      expiresOn: null,
      note: null,
      status: "disponibile",
      createdAt: now,
      createdBy: DEMO_USER_IDS.chalika,
    },
  ];

  const notes: HouseholdNote[] = [
    {
      id: generateId("note"),
      householdId: DEMO_HOUSEHOLD.id,
      scope: "spesa",
      refId: currentShoppingList.id,
      authorId: DEMO_USER_IDS.chalika,
      authorName: "Chalika",
      text: "Le zucchine erano quasi finite: ne ho prese in più per la settimana.",
      createdAt: now,
    },
    {
      id: generateId("note"),
      householdId: DEMO_HOUSEHOLD.id,
      scope: "menu",
      refId: nextMenuId,
      authorId: DEMO_USER_IDS.luca,
      authorName: "Luca",
      text: "Giovedì prossimo potrebbe venire a cena un ospite: controlliamo le porzioni.",
      createdAt: now,
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: generateId("ntf"),
      householdId: DEMO_HOUSEHOLD.id,
      userId: DEMO_USER_IDS.luca,
      type: "menu_pronto",
      title: "Il menu è pronto",
      body: "Il menu della prossima settimana è pronto. Bastano pochi minuti per controllarlo.",
      href: "/menu/approvazione",
      readAt: null,
      createdAt: now,
    },
    {
      id: generateId("ntf"),
      householdId: DEMO_HOUSEHOLD.id,
      userId: DEMO_USER_IDS.moglie,
      type: "menu_pronto",
      title: "Il menu è pronto",
      body: "Il menu della prossima settimana è pronto. Bastano pochi minuti per controllarlo.",
      href: "/menu/approvazione",
      readAt: null,
      createdAt: now,
    },
  ];

  const notificationPreferences: NotificationPreferences[] = DEMO_USERS.map((u) => ({
    userId: u.id,
    menuPronto: true,
    promemoriaApprovazione: true,
    menuApprovato: true,
    spesaAggiornata: u.id !== DEMO_USER_IDS.chalika,
    noteAggiunte: true,
    canale: "app",
  }));

  const auditLog: AuditLogEntry[] = [
    {
      id: generateId("audit"),
      householdId: DEMO_HOUSEHOLD.id,
      actorId: DEMO_USER_IDS.moglie,
      actorName: "Moglie di Luca",
      action: "menu.approved",
      entityType: "weekly_menu",
      entityId: currentMenuId,
      metadata: { weekStartDate: currentWeekStartDate },
      createdAt: approvedAt,
    },
    {
      id: generateId("audit"),
      householdId: DEMO_HOUSEHOLD.id,
      actorId: DEMO_USER_IDS.luca,
      actorName: "Luca",
      action: "role.assigned",
      entityType: "household_user_role",
      entityId: DEMO_USER_IDS.chalika,
      metadata: { role: "collaborator", operationalRole: "editor" },
      createdAt: DEMO_HOUSEHOLD.createdAt,
    },
  ];

  const firstMeal = currentMeals[0];
  const mealFeedback: MealFeedback[] = firstMeal
    ? [
        {
          id: generateId("fb"),
          mealId: firstMeal.id,
          householdId: DEMO_HOUSEHOLD.id,
          createdBy: DEMO_USER_IDS.luca,
          tags: ["piaciuto_a_tutti", "da_riproporre"],
          note: null,
          createdAt: now,
        },
      ]
    : [];

  return {
    status: "ready",
    currentUserId: null,
    users: DEMO_USERS,
    household: DEMO_HOUSEHOLD,
    members: DEMO_MEMBERS,
    roles: DEMO_ROLES,
    invitations: [],
    dietaryProfiles: DEMO_DIETARY_PROFILES,
    preferences: DEMO_PREFERENCES,
    weeklyMenus: [currentMenu, nextMenu],
    menuVersions: [currentVersion, nextVersion],
    meals: [...currentMeals, ...nextMeals],
    mealFeedback,
    shoppingLists: [currentShoppingList],
    shoppingListItems: currentShoppingItems,
    shoppingItemHistory: [],
    pantryItems: DEMO_PANTRY_ITEMS,
    leftoverItems: leftovers,
    notes,
    notifications,
    notificationPreferences,
    auditLog,
    recentActivity: [],
  };
}
