import { describe, expect, it } from "vitest";

import { WEEKDAYS, defaultSlotsForDay } from "@/types/domain";
import { validateGeneratedWeek } from "@/lib/validation/validate-generated-week";
import type { GeneratedMeal, GeneratedRecipe, GeneratedWeek } from "@/lib/validation/menu-schema";

let recipeCounter = 0;
function makeRecipe(name?: string): GeneratedRecipe {
  recipeCounter += 1;
  return {
    id: `r-${recipeCounter}`,
    name: name ?? `Piatto ${recipeCounter}`,
    description: "Descrizione di prova",
    mediterraneanTags: ["verdure"],
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 10,
    difficulty: "facile",
    canPrepareAhead: false,
    allergens: [],
    ingredients: [{ name: "olio extravergine di oliva", quantity: 2, unit: "cucchiai", category: "dispensa", optional: false }],
    steps: ["Cuocere e servire."],
    imageEmoji: "🍽️",
    isVegetarian: true,
    isQuickUnder20: true,
    usesLeftovers: false,
    costLevel: "basso",
  };
}

function buildValidWeek(): GeneratedWeek {
  const meals: GeneratedMeal[] = [];
  let dayOffset = 0;
  for (const day of WEEKDAYS) {
    const date = new Date(2026, 7, 31 + dayOffset).toISOString().slice(0, 10); // 2026-08-31 è lunedì
    for (const slot of defaultSlotsForDay(day)) {
      meals.push({
        day,
        date,
        slot,
        recipe: makeRecipe(),
        isManuallyAdded: false,
        chalikaNote: null,
        familyNote: null,
        childAdaptationNote: null,
        usesExistingPantryItems: [],
        usesLeftovers: false,
      });
    }
    dayOffset += 1;
  }
  return { weekStartDate: "2026-08-31", meals };
}

describe("validateGeneratedWeek", () => {
  it("accetta una settimana costruita secondo la struttura dei 16 pasti automatici", () => {
    const result = validateGeneratedWeek(buildValidWeek(), []);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rifiuta un pranzo feriale generato automaticamente", () => {
    const week = buildValidWeek();
    week.meals.push({
      day: "martedi",
      date: "2026-09-01",
      slot: "pranzo",
      recipe: makeRecipe(),
      isManuallyAdded: false,
      chalikaNote: null,
      familyNote: null,
      childAdaptationNote: null,
      usesExistingPantryItems: [],
      usesLeftovers: false,
    });
    const result = validateGeneratedWeek(week, []);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.code === "weekday_lunch_auto_generated")).toBe(true);
  });

  it("accetta un pranzo feriale aggiunto manualmente", () => {
    const week = buildValidWeek();
    week.meals.push({
      day: "martedi",
      date: "2026-09-01",
      slot: "pranzo",
      recipe: makeRecipe(),
      isManuallyAdded: true,
      chalikaNote: null,
      familyNote: null,
      childAdaptationNote: null,
      usesExistingPantryItems: [],
      usesLeftovers: false,
    });
    const result = validateGeneratedWeek(week, []);
    expect(result.isValid).toBe(true);
  });

  it("segnala un pasto mancante", () => {
    const week = buildValidWeek();
    week.meals.shift();
    const result = validateGeneratedWeek(week, []);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.code === "missing_meal_slot")).toBe(true);
  });
});
