import { describe, expect, it } from "vitest";

import { checkRecipeAgainstAllergies, containsTreeNuts, isTreeNutsAllowed } from "@/lib/validation/allergy-guard";
import type { DietaryProfile, Recipe } from "@/types/domain";

const nutAllergyProfile: DietaryProfile = {
  id: "p1",
  householdId: "h1",
  memberId: "figlia",
  allergies: [{ id: "a1", allergen: "frutta a guscio", severity: "moderata", notes: null }],
  intolerances: [],
  restrictions: [],
  dislikes: [],
  preferredDishes: [],
  dislikedTextures: [],
  familyNotes: null,
  opennessToNewDishes: "bassa",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function recipeWith(ingredientName: string, allergens: string[] = []): Pick<Recipe, "allergens" | "ingredients"> {
  return {
    allergens,
    ingredients: [{ id: "i1", name: ingredientName, quantity: 100, unit: "g", category: "colazione", optional: false }],
  };
}

describe("checkRecipeAgainstAllergies", () => {
  it("blocca una ricetta con noci se un membro è allergico alla frutta a guscio", () => {
    const result = checkRecipeAgainstAllergies(recipeWith("noci sgusciate"), [nutAllergyProfile]);
    expect(result.isSafe).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.allergen).toBe("frutta a guscio");
  });

  it("consente una ricetta senza allergeni in comune", () => {
    const result = checkRecipeAgainstAllergies(recipeWith("zucchine"), [nutAllergyProfile]);
    expect(result.isSafe).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("riconosce l'allergene anche dichiarato esplicitamente in recipe.allergens", () => {
    const result = checkRecipeAgainstAllergies(recipeWith("crema misteriosa", ["frutta a guscio"]), [nutAllergyProfile]);
    expect(result.isSafe).toBe(false);
  });
});

describe("isTreeNutsAllowed / containsTreeNuts", () => {
  it("non permette la frutta secca se qualcuno è allergico", () => {
    expect(isTreeNutsAllowed([nutAllergyProfile])).toBe(false);
  });

  it("permette la frutta secca se nessuno è allergico", () => {
    expect(isTreeNutsAllowed([])).toBe(true);
  });

  it("rileva la frutta secca negli ingredienti", () => {
    expect(containsTreeNuts(recipeWith("mandorle a lamelle"))).toBe(true);
    expect(containsTreeNuts(recipeWith("riso"))).toBe(false);
  });
});
