import { describe, expect, it } from "vitest";

import { reconcileShoppingListWithMeals } from "@/lib/shopping/reconcile-shopping-list";
import type { Meal, ShoppingListItem } from "@/types/domain";

const now = "2026-09-01T00:00:00.000Z";

function mealWithIngredient(id: string, ingredientName: string, quantity: number): Meal {
  return {
    id,
    menuVersionId: "v1",
    day: "martedi",
    date: "2026-09-01",
    slot: "cena",
    recipeId: "r1",
    recipeSnapshot: {
      id: "r1",
      name: "Piatto di prova",
      description: "",
      mediterraneanTags: [],
      servings: 4,
      prepMinutes: 10,
      cookMinutes: 10,
      difficulty: "facile",
      canPrepareAhead: false,
      allergens: [],
      ingredients: [{ id: "i1", name: ingredientName, quantity, unit: "g", category: "frutta_verdura", optional: false }],
      steps: [],
      imageEmoji: "🍽️",
      isVegetarian: true,
      isQuickUnder20: true,
      usesLeftovers: false,
      costLevel: "basso",
    },
    isManuallyAdded: false,
    attendance: { type: "tutti_presenti", absentMemberIds: [], guestsCount: 0, guestsNote: null },
    chalikaNote: null,
    familyNote: null,
    childAdaptationNote: null,
    usesExistingPantryItems: [],
    usesLeftovers: false,
    createdAt: now,
    updatedAt: now,
    updatedBy: "system",
  };
}

describe("reconcileShoppingListWithMeals", () => {
  it("conserva un articolo già comprato anche se non più richiesto dal menu aggiornato", () => {
    const boughtItem: ShoppingListItem = {
      id: "itm1",
      shoppingListId: "list1",
      name: "zucchine",
      normalizedName: "zucchine",
      quantity: 300,
      unit: "g",
      category: "frutta_verdura",
      status: "comprato",
      note: null,
      isManual: false,
      sourceMealIds: ["martedi|cena"],
      needsReviewReason: null,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    };

    const result = reconcileShoppingListWithMeals({
      shoppingListId: "list1",
      existingItems: [boughtItem],
      meals: [mealWithIngredient("m1", "carote", 200)], // le zucchine non servono più
      now,
    });

    const kept = result.items.find((i) => i.normalizedName === "zucchine");
    expect(kept).toBeDefined();
    expect(kept?.status).toBe("comprato");
    expect(kept?.needsReviewReason).toMatch(/non più necessario/i);
    expect(result.items.some((i) => i.normalizedName === "carote")).toBe(true);
  });

  it("rimuove un articolo non comprato se non più richiesto dal menu", () => {
    const notBoughtItem: ShoppingListItem = {
      id: "itm2",
      shoppingListId: "list1",
      name: "carote",
      normalizedName: "carote",
      quantity: 200,
      unit: "g",
      category: "frutta_verdura",
      status: "da_comprare",
      note: null,
      isManual: false,
      sourceMealIds: [],
      needsReviewReason: null,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    };

    const result = reconcileShoppingListWithMeals({
      shoppingListId: "list1",
      existingItems: [notBoughtItem],
      meals: [mealWithIngredient("m1", "zucchine", 300)],
      now,
    });

    expect(result.items.some((i) => i.normalizedName === "carote")).toBe(false);
    expect(result.removed).toContain("carote");
  });

  it("non tocca mai gli articoli manuali", () => {
    const manualItem: ShoppingListItem = {
      id: "itm3",
      shoppingListId: "list1",
      name: "Detersivo piatti",
      normalizedName: "detersivo piatti",
      quantity: 1,
      unit: "pz",
      category: "casa",
      status: "da_comprare",
      note: null,
      isManual: true,
      sourceMealIds: [],
      needsReviewReason: null,
      createdAt: now,
      updatedAt: now,
      createdBy: "user1",
    };

    const result = reconcileShoppingListWithMeals({
      shoppingListId: "list1",
      existingItems: [manualItem],
      meals: [],
      now,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("itm3");
  });
});
