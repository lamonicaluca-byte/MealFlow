import { describe, expect, it } from "vitest";

import { applyMealUpdate } from "@/lib/menu/versioning";
import type { Meal, MenuVersion, WeeklyMenu } from "@/types/domain";

const now = "2026-08-31T12:00:00.000Z";

function baseMenu(status: WeeklyMenu["status"]): WeeklyMenu {
  return {
    id: "menu1",
    householdId: "h1",
    weekStartDate: "2026-08-31",
    status,
    currentVersionId: "v1",
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
  };
}

const version: MenuVersion = {
  id: "v1",
  menuId: "menu1",
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

function meal(id: string): Meal {
  return {
    id,
    menuVersionId: "v1",
    day: "lunedi",
    date: "2026-08-31",
    slot: "cena",
    recipeId: "r1",
    recipeSnapshot: null,
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

describe("applyMealUpdate", () => {
  it("aggiorna in place un menu non ancora approvato, senza creare una nuova versione", () => {
    const result = applyMealUpdate({
      menu: baseMenu("pending_approval"),
      currentVersion: version,
      updatedMeals: [meal("m1")],
      changeReason: null,
      actorId: "u1",
      now,
    });
    expect(result.versionWasCreated).toBe(false);
    expect(result.version.id).toBe("v1");
    expect(result.menu.status).toBe("pending_approval");
  });

  it("crea una nuova versione quando si modifica un menu già approvato, preservando quella precedente", () => {
    const result = applyMealUpdate({
      menu: baseMenu("approved"),
      currentVersion: version,
      updatedMeals: [meal("m1")],
      changeReason: "ingrediente non disponibile",
      actorId: "u1",
      now,
    });
    expect(result.versionWasCreated).toBe(true);
    expect(result.version.id).not.toBe("v1");
    expect(result.version.previousVersionId).toBe("v1");
    expect(result.version.versionNumber).toBe(2);
    expect(result.menu.status).toBe("modified_after_approval");
    expect(result.menu.currentVersionId).toBe(result.version.id);
  });
});
