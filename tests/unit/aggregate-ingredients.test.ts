import { describe, expect, it } from "vitest";

import { aggregateIngredientLines, type IngredientLine } from "@/lib/shopping/aggregate-ingredients";

function line(partial: Partial<IngredientLine>): IngredientLine {
  return {
    name: "ingrediente",
    quantity: null,
    unit: null,
    category: "dispensa",
    sourceKey: "lunedi|cena",
    ...partial,
  };
}

describe("aggregateIngredientLines", () => {
  it('unifica "zucchina" e "zucchine" in una sola riga', () => {
    const result = aggregateIngredientLines([
      line({ name: "zucchina", quantity: 200, unit: "g", category: "frutta_verdura" }),
      line({ name: "zucchine", quantity: 300, unit: "g", category: "frutta_verdura" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity).toBe(500);
    expect(result[0]?.unit).toBe("g");
  });

  it("somma 1 kg + 500 g in 1,5 kg", () => {
    const result = aggregateIngredientLines([
      line({ name: "farina", quantity: 1, unit: "kg", category: "dispensa" }),
      line({ name: "farina", quantity: 500, unit: "g", category: "dispensa" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity).toBe(1.5);
    expect(result[0]?.unit).toBe("kg");
  });

  it("somma 1 litro + 500 ml in 1,5 litri", () => {
    const result = aggregateIngredientLines([
      line({ name: "latte", quantity: 1, unit: "l", category: "latticini_uova" }),
      line({ name: "latte", quantity: 500, unit: "ml", category: "latticini_uova" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity).toBe(1.5);
    expect(result[0]?.unit).toBe("l");
  });

  it("non converte unità incompatibili: mantiene righe separate e le marca da verificare", () => {
    const result = aggregateIngredientLines([
      line({ name: "pane", quantity: 4, unit: "pz", category: "pane_forno" }),
      line({ name: "pane", quantity: 300, unit: "g", category: "pane_forno" }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.needsReviewReason)).toBe(true);
  });

  it("mantiene distinte righe di ingredienti diversi", () => {
    const result = aggregateIngredientLines([
      line({ name: "pomodorini", quantity: 300, unit: "g", category: "frutta_verdura" }),
      line({ name: "pomodori", quantity: 300, unit: "g", category: "frutta_verdura" }),
    ]);
    expect(result).toHaveLength(2);
  });
});
