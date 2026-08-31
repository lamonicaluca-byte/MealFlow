import { describe, expect, it } from "vitest";

import { getNextMeal, groupMealsByDay } from "@/lib/selectors/menu-selectors";
import type { Meal } from "@/types/domain";

function makeMeal(partial: Partial<Meal>): Meal {
  return {
    id: partial.id ?? "m1",
    menuVersionId: "v1",
    day: "lunedi",
    date: "2026-08-31",
    slot: "colazione",
    recipeId: "r1",
    recipeSnapshot: null,
    isManuallyAdded: false,
    attendance: { type: "tutti_presenti", absentMemberIds: [], guestsCount: 0, guestsNote: null },
    chalikaNote: null,
    familyNote: null,
    childAdaptationNote: null,
    usesExistingPantryItems: [],
    usesLeftovers: false,
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    updatedBy: "system",
    ...partial,
  };
}

describe("groupMealsByDay", () => {
  it("raggruppa e ordina i pasti per data e poi per slot", () => {
    const meals = [
      makeMeal({ id: "a", date: "2026-09-01", slot: "cena", day: "martedi" }),
      makeMeal({ id: "b", date: "2026-08-31", slot: "cena", day: "lunedi" }),
      makeMeal({ id: "c", date: "2026-08-31", slot: "colazione", day: "lunedi" }),
    ];
    const grouped = groupMealsByDay(meals);
    expect(grouped.map((g) => g.date)).toEqual(["2026-08-31", "2026-09-01"]);
    expect(grouped[0]?.meals.map((m) => m.id)).toEqual(["c", "b"]);
  });
});

describe("getNextMeal", () => {
  it("ignora i pasti già passati e trova il prossimo", () => {
    const now = new Date("2026-08-31T12:00:00"); // lunedì mezzogiorno: colazione già passata
    const meals = [
      makeMeal({ id: "colazione-lun", date: "2026-08-31", slot: "colazione" }),
      makeMeal({ id: "cena-lun", date: "2026-08-31", slot: "cena" }),
    ];
    const next = getNextMeal(meals, now);
    expect(next?.id).toBe("cena-lun");
  });

  it("restituisce null se non ci sono pasti futuri", () => {
    const now = new Date("2026-09-10T12:00:00");
    const meals = [makeMeal({ id: "a", date: "2026-08-31", slot: "cena" })];
    expect(getNextMeal(meals, now)).toBeNull();
  });
});
