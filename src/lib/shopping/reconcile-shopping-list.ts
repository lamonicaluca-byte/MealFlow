import type { Meal, ShoppingListItem } from "@/types/domain";
import { generateId } from "@/lib/utils";
import { aggregateIngredientLines, mergeQuantities, type IngredientLine } from "./aggregate-ingredients";

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
 * evita duplicati confrontando per nome normalizzato + reparto. Un
 * ingrediente richiesto dal menu che coincide (per nome normalizzato) con un
 * articolo già aggiunto a mano viene assorbito lì, sommando le quantità
 * quando possibile: mai due righe per lo stesso prodotto.
 */
export function reconcileShoppingListWithMeals(params: {
  shoppingListId: string;
  existingItems: ShoppingListItem[];
  meals: Meal[];
  now: string;
}): ReconcileResult {
  const { shoppingListId, existingItems, meals, now } = params;

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

  // Gli articoli manuali non derivano dal menu: si conservano sempre.
  const manualItems = existingItems.filter((i) => i.isManual);
  const menuDerivedItems = existingItems.filter((i) => !i.isManual);

  const aggregatedByKey = new Map(aggregated.map((line) => [`${line.normalizedName}|${line.category}`, line]));
  const existingByKey = new Map(menuDerivedItems.map((item) => [`${item.normalizedName}|${item.category}`, item]));
  // Per il controllo incrociato con gli articoli manuali si ignora il
  // reparto (categoria): agli occhi di chi fa la spesa "zucchine" è lo
  // stesso prodotto sia che sia stato scritto a mano sia che arrivi dal
  // menu, anche se per errore finisse in un reparto diverso.
  const manualByNormalizedName = new Map(manualItems.map((item) => [item.normalizedName, item]));

  const result: ShoppingListItem[] = [];
  const added: string[] = [];
  const keptButNoLongerNeeded: string[] = [];
  const removed: string[] = [];
  // Ingredienti del menu già assorbiti in un articolo manuale esistente:
  // non devono generare ANCHE una riga separata al punto 2.
  const absorbedIntoManual = new Set<string>();

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

  // 2) aggiunge i nuovi ingredienti non ancora presenti — a meno che un
  // articolo manuale non copra già lo stesso prodotto: in quel caso si
  // assorbe lì (punto 3), mai una seconda riga per lo stesso ingrediente.
  for (const [key, line] of aggregatedByKey.entries()) {
    if (existingByKey.has(key)) continue;
    if (manualByNormalizedName.has(line.normalizedName)) {
      absorbedIntoManual.add(line.normalizedName);
      continue;
    }
    result.push({
      id: generateId("itm"),
      shoppingListId,
      name: line.name,
      normalizedName: line.normalizedName,
      quantity: line.quantity,
      unit: line.unit,
      category: line.category,
      status: line.needsReviewReason ? "da_verificare" : "da_comprare",
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

  // 3) riporta gli articoli manuali, assorbendo la quantità richiesta dal
  // menu quando coincide con lo stesso prodotto (mai una riga duplicata).
  for (const manual of manualItems) {
    const menuLine = aggregated.find((l) => l.normalizedName === manual.normalizedName);
    if (!menuLine || !absorbedIntoManual.has(manual.normalizedName)) {
      result.push(manual);
      continue;
    }
    const merged = mergeQuantities(manual, menuLine.quantity, menuLine.unit);
    result.push({
      ...manual,
      quantity: merged.quantity,
      unit: merged.unit,
      needsReviewReason: merged.needsReviewReason,
      sourceMealIds: Array.from(new Set([...manual.sourceMealIds, ...menuLine.sourceKeys])),
      updatedAt: now,
    });
  }

  return { items: result, added, keptButNoLongerNeeded, removed };
}
