import { WEEKDAYS, defaultSlotsForDay, type MealSlot, type Recipe, type Weekday } from "@/types/domain";
import { BREAKFAST_RECIPES, MAIN_RECIPES } from "@/lib/data/demo-recipes";
import { checkRecipeAgainstAllergies, containsTreeNuts, isTreeNutsAllowed } from "@/lib/validation/allergy-guard";
import { validateGeneratedWeek } from "@/lib/validation/validate-generated-week";
import { avoidedRecipeNames } from "@/lib/menu/feedback-avoidance";
import type { GeneratedMeal, GeneratedRecipe, GeneratedWeek } from "@/lib/validation/menu-schema";
import { createSeededRandom, pickDeterministic } from "./deterministic-random";
import type {
  ExplainMenuChoiceInput,
  GenerateMealAlternativesInput,
  GenerateShoppingListInput,
  GenerateWeeklyMenuInput,
  GeneratedShoppingItemDraft,
  HouseholdContext,
  MealAlternative,
  MenuGenerationService,
  RegenerateDayInput,
  RegenerateMealInput,
  ServiceResult,
} from "./types";

const MEDIAN_CHILD_MEMBER_AGE_GROUP = "bambino_6_10";

function toGeneratedRecipe(recipe: Recipe): GeneratedRecipe {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    mediterraneanTags: recipe.mediterraneanTags,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficulty: recipe.difficulty,
    canPrepareAhead: recipe.canPrepareAhead,
    allergens: recipe.allergens,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      category: i.category,
      optional: i.optional,
    })),
    steps: recipe.steps,
    imageEmoji: recipe.imageEmoji,
    isVegetarian: recipe.isVegetarian,
    isQuickUnder20: recipe.isQuickUnder20,
    usesLeftovers: recipe.usesLeftovers,
    costLevel: recipe.costLevel,
  };
}

function maxPrepTimeFor(day: Weekday, context: HouseholdContext): number {
  const isWeekend = day === "sabato" || day === "domenica";
  return isWeekend
    ? context.household.settings.maxPrepMinutesWeekend
    : context.household.settings.maxPrepMinutesWeekday;
}

/** Ricette esplicitamente sgradite (piatto o singolo ingrediente) dalla famiglia, o segnate "da non riproporre" in un feedback. */
function isDisliked(recipe: Recipe, context: HouseholdContext): boolean {
  const dislikedDishNames = context.preferences.dislikedDishes.map((d) => d.toLowerCase());
  if (dislikedDishNames.includes(recipe.name.toLowerCase())) return true;

  if (avoidedRecipeNames(context.recentFeedback).has(recipe.name.toLowerCase())) return true;

  const dislikedIngredients = context.dietaryProfiles.flatMap((p) =>
    p.dislikes.map((d) => d.ingredientOrDish.toLowerCase()),
  );
  return recipe.ingredients.some((ing) => dislikedIngredients.includes(ing.name.toLowerCase()));
}

/** Filtro di sicurezza + preferenze, applicato SEMPRE prima di qualunque scelta. */
function getEligibleRecipes(
  pool: Recipe[],
  context: HouseholdContext,
  opts: { day: Weekday; excludeNames: Set<string>; relaxSoftConstraints: boolean },
): Recipe[] {
  const treeNutsAllowed = isTreeNutsAllowed(context.dietaryProfiles);
  const maxPrep = maxPrepTimeFor(opts.day, context);

  return pool.filter((recipe) => {
    // Vincoli hard, mai bypassabili nemmeno in fallback.
    const allergyCheck = checkRecipeAgainstAllergies(recipe, context.dietaryProfiles);
    if (!allergyCheck.isSafe) return false;
    if (!treeNutsAllowed && containsTreeNuts(recipe)) return false;
    const forbidden = context.dietaryProfiles.flatMap((p) => p.restrictions.map((r) => r.ingredient.toLowerCase()));
    if (recipe.ingredients.some((ing) => forbidden.some((f) => ing.name.toLowerCase().includes(f)))) return false;

    if (opts.relaxSoftConstraints) return true;

    // Vincoli soft: evitabili in fallback se il pool si esaurisce.
    if (opts.excludeNames.has(recipe.name.toLowerCase())) return false;
    if (isDisliked(recipe, context)) return false;
    if (recipe.prepMinutes + recipe.cookMinutes > maxPrep) return false;
    return true;
  });
}

function pickEligibleWithFallback(
  pool: Recipe[],
  context: HouseholdContext,
  day: Weekday,
  excludeNames: Set<string>,
  rng: () => number,
): Recipe {
  let eligible = getEligibleRecipes(pool, context, { day, excludeNames, relaxSoftConstraints: false });
  if (eligible.length === 0) {
    // fallback 1: ignora i vincoli soft (tempo, gradimento) ma MAI la sicurezza
    eligible = getEligibleRecipes(pool, context, { day, excludeNames, relaxSoftConstraints: true });
  }
  if (eligible.length === 0) {
    throw new Error("Nessuna ricetta disponibile nemmeno relax dei vincoli soft: dataset insufficiente.");
  }
  return pickDeterministic(eligible, rng);
}

function buildChalikaNote(day: Weekday, context: HouseholdContext): string | null {
  if (!context.household.settings.chalikaCookingDays.includes(day)) return null;
  return "Chalika cucina oggi: ricetta pensata per essere semplice, con pochi passaggi.";
}

function buildChildAdaptationNote(recipe: Recipe, context: HouseholdContext): string | null {
  const childMember = context.members.find((m) => m.ageGroup === MEDIAN_CHILD_MEMBER_AGE_GROUP);
  const child = childMember && context.dietaryProfiles.find((p) => p.memberId === childMember.id);
  if (!child || !childMember) return null;

  const problematicIngredient = recipe.ingredients.find((ing) =>
    child.dislikedTextures.some((texture) => ing.name.toLowerCase().includes(texture.split(" ")[0]!.toLowerCase())) ||
    child.dislikes.some((d) => ing.name.toLowerCase().includes(d.ingredientOrDish.toLowerCase())),
  );
  if (!problematicIngredient) return null;

  return `Per ${childMember.displayName}: servire una porzione separata riducendo o omettendo "${problematicIngredient.name}", oppure tritarlo finemente.`;
}

function buildGeneratedMeal(
  recipe: Recipe,
  day: Weekday,
  date: string,
  slot: MealSlot,
  context: HouseholdContext,
): GeneratedMeal {
  return {
    day,
    date,
    slot,
    recipe: toGeneratedRecipe(recipe),
    isManuallyAdded: false,
    chalikaNote: buildChalikaNote(day, context),
    familyNote: null,
    childAdaptationNote: buildChildAdaptationNote(recipe, context),
    // La gestione della dispensa ("In casa") è stata rimossa dall'app: questo
    // campo resta nel modello (usato in passato per la spesa) ma non viene
    // più valorizzato.
    usesExistingPantryItems: [],
    usesLeftovers: recipe.usesLeftovers,
  };
}

function dateForDay(weekStartDate: string, day: Weekday): string {
  // Le date "YYYY-MM-DD" sono date pure: si interpretano e manipolano
  // sempre in UTC, per non dipendere dal fuso orario del server (vedi nota
  // analoga in validate-generated-week.ts).
  const index = WEEKDAYS.indexOf(day);
  const start = new Date(`${weekStartDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() + index);
  return start.toISOString().slice(0, 10);
}

const MIN_FISH_DINNERS_PER_WEEK = 1;

function isFishRecipe(recipe: Pick<Recipe, "mediterraneanTags">): boolean {
  return recipe.mediterraneanTags.includes("pesce");
}

/**
 * Garantisce almeno {@link MIN_FISH_DINNERS_PER_WEEK} cene a base di pesce
 * nella settimana, sostituendo (quando possibile) alcune cene non di pesce
 * già assegnate. Muta l'array `meals` in place. Non forza mai la sostituzione
 * se nessuna ricetta di pesce risulta idonea (es. allergia al pesce in
 * famiglia): la sicurezza alimentare resta sempre prioritaria su questa
 * preferenza nutrizionale.
 */
function ensureMinimumFishDinners(meals: GeneratedMeal[], context: HouseholdContext, rng: () => number): void {
  const dinnerIndices = meals.map((_, i) => i).filter((i) => meals[i]!.slot === "cena");
  let missing =
    MIN_FISH_DINNERS_PER_WEEK - dinnerIndices.filter((i) => isFishRecipe(meals[i]!.recipe)).length;
  if (missing <= 0) return;

  const fishPool = MAIN_RECIPES.filter(isFishRecipe);

  for (const idx of dinnerIndices) {
    if (missing <= 0) break;
    const target = meals[idx]!;
    if (isFishRecipe(target.recipe)) continue;

    const usedNames = new Set(meals.map((m) => m.recipe.name.toLowerCase()));
    let candidates = getEligibleRecipes(fishPool, context, { day: target.day, excludeNames: usedNames, relaxSoftConstraints: false });
    if (candidates.length === 0) {
      candidates = getEligibleRecipes(fishPool, context, { day: target.day, excludeNames: new Set(), relaxSoftConstraints: true });
    }
    if (candidates.length === 0) continue; // nessuna ricetta di pesce sicura per la famiglia: non si forza il vincolo.

    const chosen = pickDeterministic(candidates, rng);
    meals[idx] = buildGeneratedMeal(chosen, target.day, target.date, "cena", context);
    missing -= 1;
  }
}

/**
 * Provider mock, deterministico e completamente offline: pesca dalla
 * libreria di ricette demo rispettando allergie (hard), ingredienti
 * esclusi, gradimento familiare, tempi massimi di preparazione e i giorni in
 * cui cucina Chalika. È il provider di default e garantisce che l'app
 * funzioni interamente in modalità demo, senza alcuna chiave AI.
 */
export class MockMenuProvider implements MenuGenerationService {
  async generateWeeklyMenu(input: GenerateWeeklyMenuInput): Promise<ServiceResult<GeneratedWeek>> {
    try {
      const { context, weekStartDate } = input;
      const rng = createSeededRandom(`${context.household.id}|${weekStartDate}`);
      const usedMainNames = new Set<string>();
      const meals: GeneratedMeal[] = [];

      for (const day of WEEKDAYS) {
        for (const slot of defaultSlotsForDay(day)) {
          const pool = slot === "colazione" ? BREAKFAST_RECIPES : MAIN_RECIPES;
          const exclude = slot === "colazione" ? new Set<string>() : usedMainNames;
          const recipe = pickEligibleWithFallback(pool, context, day, exclude, rng);
          if (slot !== "colazione") usedMainNames.add(recipe.name.toLowerCase());
          meals.push(buildGeneratedMeal(recipe, day, dateForDay(weekStartDate, day), slot, context));
        }
      }

      ensureMinimumFishDinners(meals, context, rng);

      const week: GeneratedWeek = { weekStartDate, meals };
      const validation = validateGeneratedWeek(week, context.dietaryProfiles, memberNameMap(context));
      if (!validation.isValid) {
        return {
          ok: false,
          error: {
            code: "generated_week_invalid",
            message: "Il menu generato non ha superato la validazione di sicurezza/struttura.",
            issues: validation.issues,
          },
        };
      }
      return { ok: true, data: week };
    } catch (error) {
      return { ok: false, error: { code: "generation_failed", message: toErrorMessage(error) } };
    }
  }

  async regenerateMeal(input: RegenerateMealInput): Promise<ServiceResult<GeneratedMeal>> {
    try {
      const { context, day, date, slot, currentRecipeName } = input;
      const rng = createSeededRandom(`${context.household.id}|${date}|${slot}|${Date.now()}`);
      const pool = slot === "colazione" ? BREAKFAST_RECIPES : MAIN_RECIPES;
      const exclude = new Set(currentRecipeName ? [currentRecipeName.toLowerCase()] : []);
      const recipe = pickEligibleWithFallback(pool, context, day, exclude, rng);
      return { ok: true, data: buildGeneratedMeal(recipe, day, date, slot, context) };
    } catch (error) {
      return { ok: false, error: { code: "regeneration_failed", message: toErrorMessage(error) } };
    }
  }

  async regenerateDay(input: RegenerateDayInput): Promise<ServiceResult<GeneratedMeal[]>> {
    try {
      const { context, day, date, slots } = input;
      const rng = createSeededRandom(`${context.household.id}|${date}|day|${Date.now()}`);
      const usedNames = new Set<string>();
      const meals: GeneratedMeal[] = [];
      for (const slot of slots) {
        const pool = slot === "colazione" ? BREAKFAST_RECIPES : MAIN_RECIPES;
        const recipe = pickEligibleWithFallback(pool, context, day, usedNames, rng);
        if (slot !== "colazione") usedNames.add(recipe.name.toLowerCase());
        meals.push(buildGeneratedMeal(recipe, day, date, slot, context));
      }
      return { ok: true, data: meals };
    } catch (error) {
      return { ok: false, error: { code: "regeneration_failed", message: toErrorMessage(error) } };
    }
  }

  async generateMealAlternatives(input: GenerateMealAlternativesInput): Promise<ServiceResult<MealAlternative[]>> {
    try {
      const { context, day, slot, currentRecipeName } = input;
      const rng = createSeededRandom(`${context.household.id}|${day}|${slot}|alt`);
      const pool = slot === "colazione" ? BREAKFAST_RECIPES : MAIN_RECIPES;
      const currentRecipe = pool.find((r) => r.name.toLowerCase() === currentRecipeName?.toLowerCase());

      const eligible = getEligibleRecipes(pool, context, {
        day,
        excludeNames: new Set(currentRecipeName ? [currentRecipeName.toLowerCase()] : []),
        relaxSoftConstraints: false,
      });

      if (eligible.length === 0) {
        return {
          ok: false,
          error: { code: "no_alternatives", message: "Nessuna alternativa disponibile compatibile con le allergie." },
        };
      }

      const chosen: MealAlternative[] = [];
      const usedIds = new Set<string>();

      const takeUnique = (candidates: Recipe[]): Recipe | undefined => {
        const filtered = candidates.filter((r) => !usedIds.has(r.id));
        if (filtered.length === 0) return undefined;
        const picked = pickDeterministic(filtered, rng);
        usedIds.add(picked.id);
        return picked;
      };

      // 1. Simile alla proposta originale (tag in comune)
      const similar =
        currentRecipe &&
        takeUnique(
          [...eligible].sort(
            (a, b) => sharedTagCount(b, currentRecipe) - sharedTagCount(a, currentRecipe),
          ),
        );
      if (similar) chosen.push({ kind: "simile", label: "Simile alla proposta originale", recipe: toGeneratedRecipe(similar) });

      // 2. Più veloce
      const faster = takeUnique([...eligible].sort((a, b) => totalTime(a) - totalTime(b)));
      if (faster) chosen.push({ kind: "piu_veloce", label: "Più veloce", recipe: toGeneratedRecipe(faster) });

      // 3. Diversa ma compatibile
      const different = takeUnique(shuffledCopy(eligible, rng));
      if (different) chosen.push({ kind: "diversa_compatibile", label: "Diversa ma compatibile", recipe: toGeneratedRecipe(different) });

      // Extra, solo se disponibili senza ripetere una ricetta già proposta
      const vegetarian = takeUnique(eligible.filter((r) => r.isVegetarian));
      if (vegetarian) chosen.push({ kind: "vegetariana", label: "Vegetariana", recipe: toGeneratedRecipe(vegetarian) });

      const cheaper = takeUnique(eligible.filter((r) => r.costLevel === "basso"));
      if (cheaper) chosen.push({ kind: "piu_economica", label: "Più economica", recipe: toGeneratedRecipe(cheaper) });

      const quick = takeUnique(eligible.filter((r) => r.isQuickUnder20));
      if (quick) chosen.push({ kind: "sotto_20_minuti", label: "Pronta in meno di 20 minuti", recipe: toGeneratedRecipe(quick) });

      const prepAhead = takeUnique(eligible.filter((r) => r.canPrepareAhead));
      if (prepAhead) {
        chosen.push({ kind: "preparazione_anticipata", label: "Adatta alla preparazione anticipata", recipe: toGeneratedRecipe(prepAhead) });
      }

      return { ok: true, data: chosen };
    } catch (error) {
      return { ok: false, error: { code: "alternatives_failed", message: toErrorMessage(error) } };
    }
  }

  async generateShoppingList(input: GenerateShoppingListInput): Promise<ServiceResult<GeneratedShoppingItemDraft[]>> {
    try {
      const drafts: GeneratedShoppingItemDraft[] = input.meals.flatMap((meal) =>
        meal.recipe.ingredients
          .filter((ing) => !ing.optional)
          .map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category,
            sourceMealKeys: [`${meal.day}|${meal.slot}`],
            needsReviewReason: null,
          })),
      );
      return { ok: true, data: drafts };
    } catch (error) {
      return { ok: false, error: { code: "shopping_list_failed", message: toErrorMessage(error) } };
    }
  }

  async explainMenuChoice(input: ExplainMenuChoiceInput): Promise<ServiceResult<string>> {
    try {
      const { meal } = input;
      const tags = meal.recipe.mediterraneanTags.join(", ");
      const parts = [
        `"${meal.recipe.name}" è stato scelto per ${meal.slot} di ${meal.day} perché valorizza ${tags || "ingredienti mediterranei di stagione"}.`,
      ];
      if (meal.recipe.canPrepareAhead) parts.push("Può essere preparato in anticipo, per alleggerire i giorni più pieni.");
      if (meal.chalikaNote) parts.push(meal.chalikaNote);
      return { ok: true, data: parts.join(" ") };
    } catch (error) {
      return { ok: false, error: { code: "explanation_failed", message: toErrorMessage(error) } };
    }
  }
}

function memberNameMap(context: HouseholdContext): Record<string, string> {
  return Object.fromEntries(context.members.map((m) => [m.id, m.displayName]));
}

function totalTime(recipe: Recipe): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}

function sharedTagCount(a: Recipe, b: Recipe): number {
  const setB = new Set(b.mediterraneanTags);
  return a.mediterraneanTags.filter((t) => setB.has(t)).length;
}

function shuffledCopy(items: Recipe[], rng: () => number): Recipe[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Errore sconosciuto nella generazione del menu.";
}
