import { describe, expect, it } from "vitest";

import { MockMenuProvider } from "@/lib/services/menu-generation/mock-provider";
import { validateGeneratedWeek } from "@/lib/validation/validate-generated-week";
import { DEMO_DIETARY_PROFILES, DEMO_HOUSEHOLD, DEMO_MEMBERS, DEMO_PREFERENCES } from "@/lib/data/demo-household";

describe("MockMenuProvider.generateWeeklyMenu", () => {
  const context = {
    household: DEMO_HOUSEHOLD,
    members: DEMO_MEMBERS,
    dietaryProfiles: DEMO_DIETARY_PROFILES,
    preferences: DEMO_PREFERENCES,
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

  it("propone almeno una cena a base di pesce nella settimana", async () => {
    const provider = new MockMenuProvider();
    const result = await provider.generateWeeklyMenu({ context, weekStartDate: "2026-08-31" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fishDinners = result.data.meals.filter(
      (m) => m.slot === "cena" && m.recipe.mediterraneanTags.includes("pesce"),
    );
    expect(fishDinners.length).toBeGreaterThanOrEqual(1);
  });
});
