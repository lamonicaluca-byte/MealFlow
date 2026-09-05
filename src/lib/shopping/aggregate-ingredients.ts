import type { IngredientUnit, ShoppingCategory } from "@/types/domain";
import { normalizeIngredientName } from "./normalize-ingredient";

export interface IngredientLine {
  name: string;
  quantity: number | null;
  unit: IngredientUnit | null;
  category: ShoppingCategory;
  sourceKey: string; // es. "lunedi|cena"
}

export interface AggregatedIngredientLine {
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: IngredientUnit | null;
  category: ShoppingCategory;
  sourceKeys: string[];
  needsReviewReason: string | null;
}

export type UnitFamily = "peso" | "volume" | "pezzo" | "cucchiaio" | "cucchiaino" | "qb";

export function unitFamily(unit: IngredientUnit | null): UnitFamily {
  switch (unit) {
    case "g":
    case "kg":
      return "peso";
    case "ml":
    case "l":
      return "volume";
    case "pz":
      return "pezzo";
    case "cucchiai":
      return "cucchiaio";
    case "cucchiaini":
      return "cucchiaino";
    case "q.b.":
    default:
      return "qb";
  }
}

/** Converte una quantità nella unità "base" della sua famiglia (g per il peso, ml per il volume). */
export function toBaseQuantity(quantity: number, unit: IngredientUnit): number {
  if (unit === "kg") return quantity * 1000;
  if (unit === "l") return quantity * 1000;
  return quantity;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Riconverte una quantità "base" nell'unità più leggibile per la famiglia. */
export function fromBaseQuantity(family: UnitFamily, baseQuantity: number): { quantity: number | null; unit: IngredientUnit | null } {
  switch (family) {
    case "peso":
      return baseQuantity >= 1000
        ? { quantity: round(baseQuantity / 1000, 2), unit: "kg" }
        : { quantity: round(baseQuantity, 0), unit: "g" };
    case "volume":
      return baseQuantity >= 1000
        ? { quantity: round(baseQuantity / 1000, 2), unit: "l" }
        : { quantity: round(baseQuantity, 0), unit: "ml" };
    case "pezzo":
      return { quantity: round(baseQuantity, 0), unit: "pz" };
    case "cucchiaio":
      return { quantity: round(baseQuantity, 1), unit: "cucchiai" };
    case "cucchiaino":
      return { quantity: round(baseQuantity, 1), unit: "cucchiaini" };
    case "qb":
    default:
      return { quantity: null, unit: "q.b." };
  }
}

/**
 * Aggrega righe ingrediente equivalenti in voci uniche della lista della
 * spesa. Regole (§12):
 * - stessi ingredienti con nomi equivalenti (es. zucchina/zucchine) diventano
 *   una riga sola;
 * - quantità nella stessa "famiglia" di unità (peso: g/kg, volume: ml/l)
 *   vengono sommate e riportate nell'unità più leggibile;
 * - NESSUNA conversione incerta: se per lo stesso ingrediente compaiono
 *   famiglie di unità diverse (es. "pz" e "g"), si generano più righe e le si
 *   marca "da verificare" così l'utente sa che deve controllare a mano.
 */
export function aggregateIngredientLines(lines: IngredientLine[]): AggregatedIngredientLine[] {
  // 1) raggruppa per nome normalizzato
  const byName = new Map<string, IngredientLine[]>();
  for (const line of lines) {
    const key = normalizeIngredientName(line.name);
    const bucket = byName.get(key) ?? [];
    bucket.push(line);
    byName.set(key, bucket);
  }

  const result: AggregatedIngredientLine[] = [];

  for (const [normalizedName, group] of byName.entries()) {
    // 2) dentro il gruppo, sotto-raggruppa per famiglia di unità
    const byFamily = new Map<UnitFamily, IngredientLine[]>();
    for (const line of group) {
      const family = unitFamily(line.unit);
      const bucket = byFamily.get(family) ?? [];
      bucket.push(line);
      byFamily.set(family, bucket);
    }

    const multipleFamilies = byFamily.size > 1;
    const displayName = group[0]!.name;
    const category = group[0]!.category;

    for (const [family, familyLines] of byFamily.entries()) {
      const sourceKeys = Array.from(new Set(familyLines.flatMap((l) => l.sourceKey)));

      if (family === "qb") {
        result.push({
          name: displayName,
          normalizedName,
          quantity: null,
          unit: "q.b.",
          category,
          sourceKeys,
          needsReviewReason: multipleFamilies
            ? "Presente anche con quantità specifiche in altre ricette: verifica il totale."
            : null,
        });
        continue;
      }

      const hasAllQuantities = familyLines.every((l) => l.quantity !== null && l.unit !== null);
      if (!hasAllQuantities) {
        result.push({
          name: displayName,
          normalizedName,
          quantity: null,
          unit: null,
          category,
          sourceKeys,
          needsReviewReason: "Quantità mancante in una delle ricette: verifica manualmente.",
        });
        continue;
      }

      const totalBase = familyLines.reduce(
        (sum, l) => sum + toBaseQuantity(l.quantity as number, l.unit as IngredientUnit),
        0,
      );
      const { quantity, unit } = fromBaseQuantity(family, totalBase);

      result.push({
        name: displayName,
        normalizedName,
        quantity,
        unit,
        category,
        sourceKeys,
        needsReviewReason: multipleFamilies
          ? "Ingrediente presente anche in un'altra unità di misura: verifica il totale."
          : null,
      });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/**
 * Somma la quantità di un articolo già in lista con quella di un nuovo
 * inserimento manuale dello STESSO prodotto (stesso `normalizedName`),
 * invece di creare una seconda riga duplicata (§12: la lista non deve mai
 * avere due voci per lo stesso prodotto). Stessa regola prudente
 * dell'aggregazione dal menu: somma solo se le due quantità sono nella
 * stessa famiglia di unità di misura, altrimenti segnala "da verificare"
 * invece di tentare una conversione incerta.
 */
export function mergeQuantities(
  existing: { quantity: number | null; unit: IngredientUnit | null },
  addQuantity: number | null,
  addUnit: IngredientUnit | null,
): { quantity: number | null; unit: IngredientUnit | null; needsReviewReason: string | null } {
  if (existing.quantity === null || addQuantity === null) {
    const bothMissing = existing.quantity === null && addQuantity === null;
    return {
      quantity: existing.quantity,
      unit: existing.unit,
      needsReviewReason: bothMissing ? null : "Aggiunto di nuovo senza quantità precisa: verifica il totale.",
    };
  }

  const existingFamily = unitFamily(existing.unit);
  const addFamily = unitFamily(addUnit);
  if (existingFamily !== addFamily) {
    return {
      quantity: existing.quantity,
      unit: existing.unit,
      needsReviewReason: "Aggiunto di nuovo con un'unità di misura diversa: verifica il totale.",
    };
  }
  if (existingFamily === "qb") {
    return { quantity: null, unit: "q.b.", needsReviewReason: null };
  }

  const totalBase =
    toBaseQuantity(existing.quantity, existing.unit as IngredientUnit) + toBaseQuantity(addQuantity, addUnit as IngredientUnit);
  const { quantity, unit } = fromBaseQuantity(existingFamily, totalBase);
  return { quantity, unit, needsReviewReason: null };
}
