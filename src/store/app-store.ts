"use client";

import { create } from "zustand";

import type {
  AppNotification,
  DietaryProfile,
  HouseholdNote,
  HouseholdPreferences,
  HouseholdRole,
  HouseholdSettings,
  Invitation,
  Meal,
  MealAttendance,
  MealChangeReason,
  MealFeedbackTag,
  MealSlot,
  NotificationPreferences,
  OperationalRole,
  Recipe,
  ShoppingCategory,
  ShoppingItemStatus,
  ShoppingListItem,
  Weekday,
} from "@/types/domain";
import { generateId } from "@/lib/utils";
import { buildDemoState } from "@/lib/data/build-demo-state";
import { getMenuGenerationService } from "@/lib/services/menu-generation";
import type { HouseholdContext, MealAlternative } from "@/lib/services/menu-generation/types";
import { applyMealUpdate } from "@/lib/menu/versioning";
import { reconcileShoppingListWithMeals } from "@/lib/shopping/reconcile-shopping-list";
import { getRoleForUser } from "@/lib/data/demo-household";
import { canApproveMenu as canApproveMenuRole } from "@/lib/auth/permissions";
import { getRealtimeBus } from "@/lib/realtime/demo-bus";
import type { AppState } from "./types";

const STORAGE_KEY = "mealflow-demo-state-v1";

interface Actions {
  initialize: () => Promise<void>;
  loginAs: (userId: string) => void;
  logout: () => void;

  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  updateHouseholdName: (name: string) => void;
  updateHouseholdSettings: (patch: Partial<HouseholdSettings>) => void;
  updateDietaryProfile: (memberId: string, patch: Partial<DietaryProfile>) => void;
  updatePreferences: (patch: Partial<HouseholdPreferences>) => void;

  inviteMember: (email: string, role: HouseholdRole, operationalRole: OperationalRole, actorId: string) => void;
  revokeInvitation: (invitationId: string) => void;

  updateNotificationPreferences: (userId: string, patch: Partial<NotificationPreferences>) => void;

  approveMenu: (menuId: string, actorId: string, actorName: string) => { ok: boolean; message: string };
  updateMealAttendance: (mealId: string, attendance: MealAttendance, actorId: string) => void;
  addMealNote: (mealId: string, text: string, target: "family" | "chalika", actorId: string) => void;
  markMealOut: (mealId: string, actorId: string) => void;
  addManualMeal: (day: Weekday, date: string, slot: MealSlot, dishName: string, actorId: string) => void;
  deleteManualMeal: (mealId: string, actorId: string) => void;
  replaceMeal: (
    mealId: string,
    alternative: MealAlternative,
    reason: MealChangeReason | undefined,
    reasonNote: string | undefined,
    actorId: string,
    actorName: string,
  ) => void;
  regenerateMeal: (mealId: string, actorId: string, actorName: string) => Promise<void>;
  getMealAlternatives: (mealId: string, reason?: MealChangeReason) => Promise<MealAlternative[]>;
  explainMeal: (mealId: string) => Promise<string>;
  submitMealFeedback: (mealId: string, tags: MealFeedbackTag[], note: string | null, actorId: string) => void;

  changeShoppingItemStatus: (itemId: string, status: ShoppingItemStatus, actorId: string, actorName: string) => void;
  updateShoppingItemQuantity: (itemId: string, quantity: number | null, unit: ShoppingListItem["unit"]) => void;
  updateShoppingItemNote: (itemId: string, note: string | null) => void;
  updateShoppingItemCategory: (itemId: string, category: ShoppingCategory) => void;
  addManualShoppingItem: (
    listId: string,
    draft: { name: string; quantity: number | null; unit: ShoppingListItem["unit"]; category: ShoppingCategory },
    actorId: string,
  ) => void;
  deleteManualShoppingItem: (itemId: string) => void;
  undoLastShoppingChange: () => void;

  addHouseholdNote: (text: string, scope: HouseholdNote["scope"], refId: string | null, actorId: string, actorName: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: (userId: string) => void;

  pushActivity: (message: string) => void;
}

function buildContext(state: AppState): HouseholdContext {
  return {
    household: state.household!,
    members: state.members,
    dietaryProfiles: state.dietaryProfiles,
    preferences: state.preferences!,
  };
}

function saveToStorage(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage pieno o non disponibile (es. modalità privata): la sessione
    // resta funzionante in memoria, si perderà solo la persistenza tra reload.
  }
}

function loadFromStorage(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

const initialState: AppState = {
  status: "idle",
  currentUserId: null,
  users: [],
  household: null,
  members: [],
  roles: [],
  invitations: [],
  dietaryProfiles: [],
  preferences: null,
  weeklyMenus: [],
  menuVersions: [],
  meals: [],
  mealFeedback: [],
  shoppingLists: [],
  shoppingListItems: [],
  shoppingItemHistory: [],
  notes: [],
  notifications: [],
  notificationPreferences: [],
  auditLog: [],
  recentActivity: [],
};

let lastShoppingChange: { itemId: string; previous: ShoppingListItem } | null = null;

export const useAppStore = create<AppState & Actions>()((set, get) => ({
  ...initialState,

  async initialize() {
    if (get().status === "ready") return;
    set({ status: "loading" });
    const stored = loadFromStorage();
    if (stored) {
      set({ ...stored, status: "ready" });
      return;
    }
    const fresh = await buildDemoState();
    set({ ...fresh, status: "ready" });
    saveToStorage(get());
  },

  loginAs(userId) {
    set({ currentUserId: userId });
    saveToStorage(get());
  },

  logout() {
    set({ currentUserId: null });
    saveToStorage(get());
  },

  setOnboardingStep(step) {
    const state = get();
    if (!state.household) return;
    set({ household: { ...state.household, onboardingStep: step, updatedAt: new Date().toISOString() } });
    saveToStorage(get());
  },

  completeOnboarding() {
    const state = get();
    if (!state.household) return;
    const now = new Date().toISOString();
    set({ household: { ...state.household, onboardingStep: 4, onboardingCompletedAt: now, updatedAt: now } });
    saveToStorage(get());
  },

  updateHouseholdName(name) {
    const state = get();
    if (!state.household) return;
    set({ household: { ...state.household, name, updatedAt: new Date().toISOString() } });
    saveToStorage(get());
  },

  updateHouseholdSettings(patch) {
    const state = get();
    if (!state.household) return;
    set({
      household: {
        ...state.household,
        settings: { ...state.household.settings, ...patch },
        updatedAt: new Date().toISOString(),
      },
    });
    saveToStorage(get());
  },

  updateDietaryProfile(memberId, patch) {
    const state = get();
    const now = new Date().toISOString();
    set({
      dietaryProfiles: state.dietaryProfiles.map((p) =>
        p.memberId === memberId ? { ...p, ...patch, updatedAt: now } : p,
      ),
    });
    saveToStorage(get());
  },

  updatePreferences(patch) {
    const state = get();
    if (!state.preferences) return;
    set({ preferences: { ...state.preferences, ...patch, updatedAt: new Date().toISOString() } });
    saveToStorage(get());
  },

  inviteMember(email, role, operationalRole, actorId) {
    const state = get();
    if (!state.household) return;
    const now = new Date().toISOString();
    const invitation: Invitation = {
      id: generateId("inv"),
      householdId: state.household.id,
      email,
      role,
      operationalRole,
      invitedBy: actorId,
      token: generateId("tok"),
      status: "pending",
      createdAt: now,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      acceptedAt: null,
    };
    set({ invitations: [invitation, ...state.invitations] });
    saveToStorage(get());
  },

  revokeInvitation(invitationId) {
    const state = get();
    set({
      invitations: state.invitations.map((i) => (i.id === invitationId ? { ...i, status: "revoked" } : i)),
    });
    saveToStorage(get());
  },

  updateNotificationPreferences(userId, patch) {
    const state = get();
    set({
      notificationPreferences: state.notificationPreferences.map((p) => (p.userId === userId ? { ...p, ...patch } : p)),
    });
    saveToStorage(get());
  },

  approveMenu(menuId, actorId, actorName) {
    const state = get();
    const menu = state.weeklyMenus.find((m) => m.id === menuId);
    if (!menu) return { ok: false, message: "Menu non trovato." };
    const role = getRoleForUser(actorId);
    if (!canApproveMenuRole(role)) {
      return { ok: false, message: "Non hai i permessi per approvare il menu." };
    }
    const now = new Date().toISOString();
    const versions = state.menuVersions.map((v) =>
      v.id === menu.currentVersionId
        ? { ...v, approvedBy: actorId, approvedByName: actorName, approvedAt: now, isImmutable: true }
        : v,
    );
    const menus = state.weeklyMenus.map((m) => (m.id === menuId ? { ...m, status: "approved" as const, updatedAt: now } : m));

    // Genera la lista della spesa se non esiste ancora per questa versione.
    const hasList = state.shoppingLists.some((l) => l.menuVersionId === menu.currentVersionId);
    let shoppingLists = state.shoppingLists;
    let shoppingListItems = state.shoppingListItems;
    if (!hasList) {
      const mealsForVersion = state.meals.filter((m) => m.menuVersionId === menu.currentVersionId);
      const listId = generateId("shp");
      const reconciled = reconcileShoppingListWithMeals({
        shoppingListId: listId,
        existingItems: [],
        meals: mealsForVersion,
        now,
      });
      shoppingLists = [
        ...state.shoppingLists,
        { id: listId, householdId: menu.householdId, menuVersionId: menu.currentVersionId, weekStartDate: menu.weekStartDate, createdAt: now, updatedAt: now },
      ];
      shoppingListItems = [...state.shoppingListItems, ...reconciled.items];
    }

    const notifications: AppNotification[] = state.users
      .filter((u) => u.id !== actorId)
      .map((u) => ({
        id: generateId("ntf"),
        householdId: menu.householdId,
        userId: u.id,
        type: "menu_approvato",
        title: "Menu approvato",
        body: `${actorName} ha approvato il menu della settimana.`,
        href: "/menu",
        readAt: null,
        createdAt: now,
      }));

    set({
      weeklyMenus: menus,
      menuVersions: versions,
      shoppingLists,
      shoppingListItems,
      notifications: [...notifications, ...state.notifications],
    });
    getRealtimeBus().publish({
      type: "menu_approved",
      householdId: menu.householdId,
      actorName,
      message: "Il menu è stato approvato.",
      payload: { menuId },
      createdAt: now,
    });
    get().pushActivity(`Il menu è stato approvato da ${actorName}.`);
    saveToStorage(get());
    return { ok: true, message: `APPROVATO DA ${actorName.toUpperCase()}` };
  },

  updateMealAttendance(mealId, attendance, actorId) {
    applyToMeal(get, set, mealId, actorId, (meal) => ({ ...meal, attendance }));
  },

  addMealNote(mealId, text, target, actorId) {
    applyToMeal(get, set, mealId, actorId, (meal) =>
      target === "chalika" ? { ...meal, chalikaNote: text } : { ...meal, familyNote: text },
    );
  },

  markMealOut(mealId, actorId) {
    applyToMeal(get, set, mealId, actorId, (meal) => ({
      ...meal,
      attendance: { ...meal.attendance, type: "fuori_casa" },
    }));
  },

  addManualMeal(day, date, slot, dishName, actorId) {
    const state = get();
    const menu = state.weeklyMenus.find((m) => {
      const version = state.menuVersions.find((v) => v.id === m.currentVersionId);
      return version && state.meals.some((meal) => meal.menuVersionId === version.id && meal.date === date);
    });
    if (!menu) return;
    const now = new Date().toISOString();
    const manualRecipe: Recipe = {
      id: generateId("recipe-manual"),
      name: dishName,
      description: "Pasto aggiunto manualmente.",
      mediterraneanTags: [],
      servings: 4,
      prepMinutes: 0,
      cookMinutes: 0,
      difficulty: "facile",
      canPrepareAhead: false,
      allergens: [],
      ingredients: [],
      steps: [],
      imageEmoji: "🍽️",
      isVegetarian: false,
      isQuickUnder20: true,
      usesLeftovers: false,
      costLevel: "medio",
    };
    const newMeal: Meal = {
      id: generateId("meal"),
      menuVersionId: menu.currentVersionId,
      day,
      date,
      slot,
      recipeId: manualRecipe.id,
      recipeSnapshot: manualRecipe,
      isManuallyAdded: true,
      attendance: { type: "tutti_presenti", absentMemberIds: [], guestsCount: 0, guestsNote: null },
      chalikaNote: null,
      familyNote: null,
      childAdaptationNote: null,
      usesExistingPantryItems: [],
      usesLeftovers: false,
      createdAt: now,
      updatedAt: now,
      updatedBy: actorId,
    };
    set({ meals: [...state.meals, newMeal] });
    get().pushActivity(`È stato aggiunto un pasto manuale: ${dishName}.`);
    saveToStorage(get());
  },

  deleteManualMeal(mealId, actorId) {
    const state = get();
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal || !meal.isManuallyAdded) return;
    void actorId;
    set({ meals: state.meals.filter((m) => m.id !== mealId) });
    saveToStorage(get());
  },

  replaceMeal(mealId, alternative, reason, reasonNote, actorId, actorName) {
    const state = get();
    const previousMeal = state.meals.find((m) => m.id === mealId);
    applyToMeal(get, set, mealId, actorId, (meal) => ({
      ...meal,
      recipeId: alternative.recipe.id,
      recipeSnapshot: alternative.recipe as Recipe,
      chalikaNote: meal.chalikaNote,
    }));
    const now = new Date().toISOString();
    if (reason || reasonNote) {
      // Il motivo viene conservato nell'audit log: alimenta in futuro
      // l'euristica di selezione delle ricette (evitare ciò che "non piace"
      // o "è stato mangiato di recente"), vedi §10.
      set({
        auditLog: [
          {
            id: generateId("audit"),
            householdId: state.household!.id,
            actorId,
            actorName,
            action: "meal.replaced",
            entityType: "meal",
            entityId: mealId,
            metadata: {
              previousRecipeName: previousMeal?.recipeSnapshot?.name ?? null,
              newRecipeName: alternative.recipe.name,
              reason: reason ?? null,
              reasonNote: reasonNote ?? null,
            },
            createdAt: now,
          },
          ...state.auditLog,
        ],
      });
    }
    getRealtimeBus().publish({
      type: "menu_updated",
      householdId: state.household!.id,
      actorName,
      message: `${actorName} ha sostituito un pasto.`,
      payload: { mealId },
      createdAt: now,
    });
    saveToStorage(get());
  },

  async regenerateMeal(mealId, actorId, actorName) {
    const state = get();
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal) return;
    const service = getMenuGenerationService();
    const result = await service.regenerateMeal({
      context: buildContext(state),
      day: meal.day,
      date: meal.date,
      slot: meal.slot,
      currentRecipeName: meal.recipeSnapshot?.name,
    });
    if (!result.ok) return;
    applyToMeal(get, set, mealId, actorId, (m) => ({
      ...m,
      recipeId: result.data.recipe.id,
      recipeSnapshot: result.data.recipe as Recipe,
      chalikaNote: result.data.chalikaNote,
      childAdaptationNote: result.data.childAdaptationNote,
      usesExistingPantryItems: result.data.usesExistingPantryItems,
    }));
    getRealtimeBus().publish({
      type: "menu_updated",
      householdId: state.household!.id,
      actorName,
      message: `${actorName} ha rigenerato un pasto.`,
      payload: { mealId },
      createdAt: new Date().toISOString(),
    });
  },

  async getMealAlternatives(mealId, reason) {
    const state = get();
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal) return [];
    const service = getMenuGenerationService();
    const result = await service.generateMealAlternatives({
      context: buildContext(state),
      day: meal.day,
      slot: meal.slot,
      currentRecipeName: meal.recipeSnapshot?.name,
      reason,
    });
    return result.ok ? result.data : [];
  },

  async explainMeal(mealId) {
    const state = get();
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal || !meal.recipeSnapshot) return "";
    const service = getMenuGenerationService();
    const result = await service.explainMenuChoice({
      context: buildContext(state),
      meal: {
        day: meal.day,
        date: meal.date,
        slot: meal.slot,
        recipe: meal.recipeSnapshot,
        isManuallyAdded: meal.isManuallyAdded,
        chalikaNote: meal.chalikaNote,
        familyNote: meal.familyNote,
        childAdaptationNote: meal.childAdaptationNote,
        usesExistingPantryItems: meal.usesExistingPantryItems,
        usesLeftovers: meal.usesLeftovers,
      },
    });
    return result.ok ? result.data : "Non è stato possibile generare una spiegazione in questo momento.";
  },

  submitMealFeedback(mealId, tags, note, actorId) {
    const state = get();
    const feedback = {
      id: generateId("fb"),
      mealId,
      householdId: state.household!.id,
      createdBy: actorId,
      tags,
      note,
      createdAt: new Date().toISOString(),
    };
    set({ mealFeedback: [feedback, ...state.mealFeedback] });
    saveToStorage(get());
  },

  changeShoppingItemStatus(itemId, status, actorId, actorName) {
    const state = get();
    const item = state.shoppingListItems.find((i) => i.id === itemId);
    if (!item) return;
    lastShoppingChange = { itemId, previous: item };
    const now = new Date().toISOString();
    const items = state.shoppingListItems.map((i) => (i.id === itemId ? { ...i, status, updatedAt: now } : i));
    const historyEntry = {
      id: generateId("hist"),
      itemId,
      previousStatus: item.status,
      newStatus: status,
      changedBy: actorId,
      changedByName: actorName,
      changedAt: now,
    };
    set({ shoppingListItems: items, shoppingItemHistory: [historyEntry, ...state.shoppingItemHistory] });
    if (status === "comprato") {
      getRealtimeBus().publish({
        type: "shopping_item_updated",
        householdId: state.household!.id,
        actorName,
        message: `${actorName} ha segnato "${item.name}" come comprato.`,
        payload: { itemId },
        createdAt: now,
      });
    }
    saveToStorage(get());
  },

  updateShoppingItemQuantity(itemId, quantity, unit) {
    const state = get();
    const now = new Date().toISOString();
    set({
      shoppingListItems: state.shoppingListItems.map((i) => (i.id === itemId ? { ...i, quantity, unit, updatedAt: now } : i)),
    });
    saveToStorage(get());
  },

  updateShoppingItemNote(itemId, note) {
    const state = get();
    set({ shoppingListItems: state.shoppingListItems.map((i) => (i.id === itemId ? { ...i, note } : i)) });
    saveToStorage(get());
  },

  updateShoppingItemCategory(itemId, category) {
    const state = get();
    set({ shoppingListItems: state.shoppingListItems.map((i) => (i.id === itemId ? { ...i, category } : i)) });
    saveToStorage(get());
  },

  addManualShoppingItem(listId, draft, actorId) {
    const state = get();
    const now = new Date().toISOString();
    const item: ShoppingListItem = {
      id: generateId("itm"),
      shoppingListId: listId,
      name: draft.name,
      normalizedName: draft.name.toLowerCase().trim(),
      quantity: draft.quantity,
      unit: draft.unit,
      category: draft.category,
      status: "da_comprare",
      note: null,
      isManual: true,
      sourceMealIds: [],
      needsReviewReason: null,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
    };
    set({ shoppingListItems: [...state.shoppingListItems, item] });
    getRealtimeBus().publish({
      type: "shopping_item_added",
      householdId: state.household!.id,
      actorName: state.users.find((u) => u.id === actorId)?.displayName ?? "Un familiare",
      message: `È stato aggiunto "${draft.name}" alla lista della spesa.`,
      payload: { itemId: item.id },
      createdAt: now,
    });
    saveToStorage(get());
  },

  deleteManualShoppingItem(itemId) {
    const state = get();
    const item = state.shoppingListItems.find((i) => i.id === itemId);
    if (!item?.isManual) return;
    set({ shoppingListItems: state.shoppingListItems.filter((i) => i.id !== itemId) });
    saveToStorage(get());
  },

  undoLastShoppingChange() {
    if (!lastShoppingChange) return;
    const { itemId, previous } = lastShoppingChange;
    const state = get();
    set({ shoppingListItems: state.shoppingListItems.map((i) => (i.id === itemId ? previous : i)) });
    lastShoppingChange = null;
    saveToStorage(get());
  },

  addHouseholdNote(text, scope, refId, actorId, actorName) {
    const state = get();
    const now = new Date().toISOString();
    const note: HouseholdNote = {
      id: generateId("note"),
      householdId: state.household!.id,
      scope,
      refId,
      authorId: actorId,
      authorName: actorName,
      text,
      createdAt: now,
    };
    set({ notes: [note, ...state.notes] });
    getRealtimeBus().publish({
      type: "note_added",
      householdId: state.household!.id,
      actorName,
      message: `${actorName} ha aggiunto una nota.`,
      payload: { noteId: note.id },
      createdAt: now,
    });
    saveToStorage(get());
  },

  markNotificationRead(notificationId) {
    const state = get();
    const now = new Date().toISOString();
    set({
      notifications: state.notifications.map((n) => (n.id === notificationId ? { ...n, readAt: n.readAt ?? now } : n)),
    });
    saveToStorage(get());
  },

  markAllNotificationsRead(userId) {
    const state = get();
    const now = new Date().toISOString();
    set({
      notifications: state.notifications.map((n) => (n.userId === userId && !n.readAt ? { ...n, readAt: now } : n)),
    });
    saveToStorage(get());
  },

  pushActivity(message) {
    const state = get();
    const entry = { id: generateId("act"), message, createdAt: new Date().toISOString() };
    set({ recentActivity: [entry, ...state.recentActivity].slice(0, 20) });
  },
}));

/** Helper condiviso: applica un update puro a un pasto, gestendo il versioning e la riconciliazione della spesa. */
function applyToMeal(
  get: () => AppState & Actions,
  set: (partial: Partial<AppState & Actions>) => void,
  mealId: string,
  actorId: string,
  updater: (meal: Meal) => Meal,
) {
  const state = get();
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;
  const menu = state.weeklyMenus.find((m) => m.currentVersionId === meal.menuVersionId);
  const version = state.menuVersions.find((v) => v.id === meal.menuVersionId);
  if (!menu || !version) return;

  const now = new Date().toISOString();
  const updatedMeal = { ...updater(meal), updatedAt: now, updatedBy: actorId };
  const allMealsForVersion = state.meals
    .filter((m) => m.menuVersionId === version.id)
    .map((m) => (m.id === mealId ? updatedMeal : m));

  const result = applyMealUpdate({
    menu,
    currentVersion: version,
    updatedMeals: allMealsForVersion,
    changeReason: null,
    actorId,
    now,
  });

  const otherMeals = state.meals.filter((m) => m.menuVersionId !== version.id);
  const nextMenus = state.weeklyMenus.map((m) => (m.id === menu.id ? result.menu : m));
  const nextVersions = result.versionWasCreated
    ? [...state.menuVersions, result.version]
    : state.menuVersions.map((v) => (v.id === version.id ? result.version : v));

  let shoppingLists = state.shoppingLists;
  let shoppingListItems = state.shoppingListItems;

  if (result.versionWasCreated) {
    const existingList = state.shoppingLists.find((l) => l.menuVersionId === version.id);
    if (existingList) {
      const reconciled = reconcileShoppingListWithMeals({
        shoppingListId: existingList.id,
        existingItems: state.shoppingListItems.filter((i) => i.shoppingListId === existingList.id),
        meals: result.meals,
        now,
      });
      shoppingLists = state.shoppingLists.map((l) => (l.id === existingList.id ? { ...l, menuVersionId: version.id, updatedAt: now } : l));
      shoppingListItems = [
        ...state.shoppingListItems.filter((i) => i.shoppingListId !== existingList.id),
        ...reconciled.items,
      ];
    }
  }

  set({
    meals: [...otherMeals, ...result.meals],
    weeklyMenus: nextMenus,
    menuVersions: nextVersions,
    shoppingLists,
    shoppingListItems,
  });
  saveToStorage(get());
}
