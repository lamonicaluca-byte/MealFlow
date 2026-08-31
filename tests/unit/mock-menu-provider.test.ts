import { describe, expect, it } from "vitest";

import { MockMenuProvider } from "@/lib/services/menu-generation/mock-provider";
import { validateGeneratedWeek } from "@/lib/validation/validate-generated-week";
import { containsTreeNuts } from "@/lib/validation/allergy-guard";
import {
  DEMO_DIETARY_PROFILES,
  DEMO_HOUSEHOLD,
  DEMO_MEMBERS,
  DEMO_PANTRY_ITEMS,
  DEMO_PREFERENCES,
} from "@/lib/data/demo-household";
import { DEMO_MEMBER_IDS } from "@/lib/data/demo-ids";

describe("MockMenuProvider.generateWeeklyMenu", () => {
  const context = {
    household: DEMO_HOUSEHOLD,
    members: DEMO_MEMBERS,
    dietaryProfiles: DEMO_DIETARY_PROFILES,
    preferences: DEMO_PREFERENCES,
    pantryItems: DEMO_PANTRY_ITEMS,
  };

  it("genera una settimana valida secondo tutte le regole deterministiche", async () => {
    const provider = new MockMenuProvider();
    const result = await provider.generateWeeklyMenu({ context, weekStartDate: "2026-08-31" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const validation = validateGeneratedWeek(result.data, context.dietaryProfiles);
    expect(validation.issues).toEqual([]);
    expect(validation.isValid).toBe(true);
  });

  it("non propone mai la frutta secca, per l'allergia di Amelia", async () => {
    const provider = new MockMenuProvider();
    const result = await provider.generateWeeklyMenu({ context, weekStartDate: "2026-08-31" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const meal of result.data.meals) {
      expect(containsTreeNuts(meal.recipe)).toBe(false);
    }
  });

  it("è deterministico: la stessa settimana genera sempre lo stesso risultato", async () => {
    const provider = new MockMenuProvider();
    const first = await provider.generateWeeklyMenu({ context, weekStartDate: "2026-08-31" });
    const second = await provider.generateWeeklyMenu({ context, weekStartDate: "2026-08-31" });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.data.meals.map((m) => m.recipe.name)).toEqual(second.data.meals.map((m) => m.recipe.name));
  });

  it("genera alternative per un pasto, sempre almeno 3", async () => {
    const provider = new MockMenuProvider();
    const result = await provider.generateMealAlternatives({
      context,
      day: "martedi",
      slot: "cena",
      currentRecipeName: "Pasta con pomodorini e basilico",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThanOrEqual(3);
    const kinds = result.data.map((a) => a.kind);
    expect(kinds).toContain("simile");
    expect(kinds).toContain("piu_veloce");
    expect(kinds).toContain("diversa_compatibile");
  });

  it("non propone mai un'alternativa con frutta secca", async () => {
    const provider = new MockMenuProvider();
    const result = await provider.generateMealAlternatives({ context, day: "lunedi", slot: "colazione" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const alt of result.data) {
      expect(containsTreeNuts(alt.recipe)).toBe(false);
    }
  });

  it("propone almeno due cene a base di pesce nella settimana", async () => {
    const provider = new MockMenuProvider();
    const result = await provider.generateWeeklyMenu({ context, weekStartDate: "2026-08-31" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fishDinners = result.data.meals.filter(
      (m) => m.slot === "cena" && m.recipe.mediterraneanTags.includes("pesce"),
    );
    expect(fishDinners.length).toBeGreaterThanOrEqual(2);
  });

  it("include sempre il membro con allergia tra i profili verificati (integrità dei dati demo)", () => {
    const figliaProfile = DEMO_DIETARY_PROFILES.find((p) => p.memberId === DEMO_MEMBER_IDS.figlia);
    expect(figliaProfile?.allergies.some((a) => a.allergen === "frutta a guscio")).toBe(true);
  });
});
