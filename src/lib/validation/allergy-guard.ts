import type { DietaryProfile } from "@/types/domain";

/**
 * Forma minima necessaria per i controlli di sicurezza alimentare: usa una
 * struttura strutturale invece di `Pick<Recipe, ...>` così da accettare sia
 * `Recipe` (con `id` sugli ingredienti) sia `GeneratedRecipe` (l'output Zod
 * del `MenuGenerationService`, senza `id`) senza conversioni superflue.
 */
export interface AllergyCheckableRecipe {
  allergens: string[];
  ingredients: Array<{ name: string }>;
}

/**
 * Guardia di sicurezza alimentare deterministica, lato server.
 *
 * Le allergie hanno priorità assoluta (requisito §7): il controllo NON è mai
 * affidato esclusivamente al modello AI / provider di generazione. Questa
 * funzione è pura, senza I/O, e viene invocata sia dal `MenuGenerationService`
 * prima di salvare qualunque pasto, sia dalle route API come ultima barriera
 * prima della persistenza — indipendentemente da cosa abbia proposto l'UI.
 */
export interface AllergyViolation {
  memberId: string;
  memberName: string;
  allergen: string;
  severity: "lieve" | "moderata" | "grave";
  matchedIngredient: string;
}

export interface AllergyCheckResult {
  isSafe: boolean;
  violations: AllergyViolation[];
}

/** Normalizza una stringa per il confronto (minuscolo, senza accenti/plurali banali). */
// Range Unicode "Combining Diacritical Marks" (U+0300–U+036F), costruito da
// code point per evitare di incorporare caratteri combinanti letterali nel
// sorgente (rischiosi con editor/encoding diversi).
const DIACRITICS_PATTERN = new RegExp(`[\\u0300-\\u036f]`, "g");

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(DIACRITICS_PATTERN, "").trim();
}

/** Alcuni allergeni si presentano con più nomi/sinonimi nelle ricette. */
const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  "frutta a guscio": ["noci", "nocciole", "mandorle", "pistacchi", "anacardi", "noce", "nocciola", "mandorla"],
  latte: ["latticini", "formaggio", "burro", "panna", "yogurt"],
  glutine: ["farina di grano", "pasta", "pane", "orzo", "farro", "cous cous", "grano"],
  uova: ["uovo"],
  pesce: ["merluzzo", "salmone", "sgombro", "acciughe", "alici", "tonno"],
  molluschi: ["polpo", "seppia", "calamari", "cozze", "vongole"],
  crostacei: ["gamberi", "gamberetti", "scampi", "granchio"],
  sesamo: ["tahin"],
  soia: ["salsa di soia", "tofu"],
};

function ingredientMatchesAllergen(ingredientName: string, allergen: string): boolean {
  const normalizedIngredient = normalize(ingredientName);
  const normalizedAllergen = normalize(allergen);
  if (normalizedIngredient.includes(normalizedAllergen)) return true;
  const synonyms = ALLERGEN_SYNONYMS[normalizedAllergen] ?? [];
  return synonyms.some((syn) => normalizedIngredient.includes(normalize(syn)));
}

/**
 * Verifica se una ricetta è compatibile con le allergie di tutti i membri
 * della famiglia che partecipano al pasto. `presentMemberIds` è opzionale:
 * se omesso, si verifica contro TUTTI i profili (comportamento più
 * prudente, usato in fase di generazione automatica).
 */
export function checkRecipeAgainstAllergies(
  recipe: AllergyCheckableRecipe,
  profiles: DietaryProfile[],
  options?: { presentMemberIds?: string[]; memberNames?: Record<string, string> },
): AllergyCheckResult {
  const violations: AllergyViolation[] = [];
  const relevantProfiles = options?.presentMemberIds
    ? profiles.filter((p) => options.presentMemberIds!.includes(p.memberId))
    : profiles;

  for (const profile of relevantProfiles) {
    for (const allergy of profile.allergies) {
      // 1) confronto diretto con la lista dichiarata di allergeni della ricetta
      const declaredMatch = recipe.allergens.some((a) => normalize(a) === normalize(allergy.allergen));
      // 2) confronto ingrediente per ingrediente (copre ricette senza lista allergeni dichiarata)
      const ingredientMatch = recipe.ingredients.find((ing) =>
        ingredientMatchesAllergen(ing.name, allergy.allergen),
      );

      if (declaredMatch || ingredientMatch) {
        violations.push({
          memberId: profile.memberId,
          memberName: options?.memberNames?.[profile.memberId] ?? profile.memberId,
          allergen: allergy.allergen,
          severity: allergy.severity,
          matchedIngredient: ingredientMatch?.name ?? allergy.allergen,
        });
      }
    }
  }

  return { isSafe: violations.length === 0, violations };
}

/** Verifica se un ingrediente contiene frutta secca (regola esplicita del brief). */
export function containsTreeNuts(recipe: AllergyCheckableRecipe): boolean {
  return (
    recipe.allergens.some((a) => normalize(a) === "frutta a guscio") ||
    recipe.ingredients.some((ing) => ingredientMatchesAllergen(ing.name, "frutta a guscio"))
  );
}

/**
 * Regola: la frutta secca può comparire nel menu SOLO se nessun membro della
 * famiglia ha un'allergia dichiarata alla frutta a guscio. Usata sia in
 * generazione sia in validazione finale.
 */
export function isTreeNutsAllowed(profiles: DietaryProfile[]): boolean {
  return !profiles.some((p) => p.allergies.some((a) => normalize(a.allergen) === "frutta a guscio"));
}
