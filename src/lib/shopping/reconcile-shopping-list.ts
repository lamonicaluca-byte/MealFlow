import type { Meal, PantryItem, ShoppingListItem } from "@/types/domain";
import { generateId } from "@/lib/utils";
import { aggregateIngredientLines, type IngredientLine } from "./aggregate-ingredients";

export interface ReconcileResult {
  items: ShoppingListItem[];
  added: string[]; // nomi aggiunti
  keptButNoLongerNeeded: string[]; // nomi mantenuti perché già comprati, ma non più richiesti dal menu
  removed: string[]; // nomi rimossi (non comprati, non più richiesti)
}

/**
 * Ricalcola la lista della spesa quando il menu approvato viene modificato
 * (§13): aggiunge i nuovi ingredienti, segnala quelli non più necessari,
 * conserva SEMPRE gli articoli già comprati (anche se non più richiesti) ed
 * evita duplicati confrontando per nome normalizzato + reparto.
 */
export function reconcileShoppingListWithMeals(params: {
  shoppingListId: string;
  existingItems: ShoppingListItem[];
  meals: Meal[];
  pantryItems: PantryItem[];
  now: string;
}): ReconcileResult {
  const { shoppingListId, existingItems, meals, pantryItems, now } = params;

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
  const pantryByName = new Map(pantryItems.map((p) => [p.normalizedName, p]));

  // Gli articoli manuali non derivano dal menu: si conservano sempre.
  const manualItems = existingItems.filter((i) => i.isManual);
  const menuDerivedItems = existingItems.filter((i) => !i.isManual);

  const aggregatedByKey = new Map(aggregated.map((line) => [`${line.normalizedName}|${line.category}`, line]));
  const existingByKey = new Map(menuDerivedItems.map((item) => [`${item.normalizedName}|${item.category}`, item]));

  const result: ShoppingListItem[] = [...manualItems];
  const added: string[] = [];
  const keptButNoLongerNeeded: string[] = [];
  const removed: string[] = [];

  // 1) aggiorna/mantiene gli articoli già esistenti derivati dal menu
  for (const [key, existing] of existingByKey.entries()) {
    const stillNeeded = aggregatedByKey.get(key);
    if (stillNeeded) {
      result.push({
        ...existing,
        quantity: existing.status === "comprato" ? existing.quantity : stillNeeded.quantity,
        unit: existing.status === "comprato" ? existing.unit : stillNeeded.unit,
        needsReviewReason: stillNeeded.needsReviewReason,
        updatedAt: now,
      });
      continue;
    }
    if (existing.status === "comprato") {
      result.push({
        ...existing,
        needsReviewReason: "Non più necessario per il menu aggiornato, ma già acquistato.",
        updatedAt: now,
      });
      keptButNoLongerNeeded.push(existing.name);
    } else {
      removed.push(existing.name);
    }
  }

  // 2) aggiunge i nuovi ingredienti non ancora presenti
  for (const [key, line] of aggregatedByKey.entries()) {
    if (existingByKey.has(key)) continue;
    const pantryMatch = pantryByName.get(line.normalizedName);
    result.push({
      id: generateId("itm"),
      shoppingListId,
      name: line.name,
      normalizedName: line.normalizedName,
      quantity: line.quantity,
      unit: line.unit,
      category: line.category,
      status: line.needsReviewReason ? "da_verificare" : pantryMatch?.availability === "disponibile" ? "gia_in_casa" : "da_comprare",
      note: null,
      isManual: false,
      sourceMealIds: line.sourceKeys,
      needsReviewReason: line.needsReviewReason,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    });
    added.push(line.name);
  }

  return { items: result, added, keptButNoLongerNeeded, removed };
}
