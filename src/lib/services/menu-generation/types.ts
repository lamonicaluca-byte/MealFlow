import type {
  DietaryProfile,
  Household,
  HouseholdMember,
  HouseholdPreferences,
  MealChangeReason,
  MealFeedbackTag,
  MealSlot,
  Weekday,
} from "@/types/domain";
import type { WeekValidationIssue } from "@/lib/validation/validate-generated-week";
import type { GeneratedMeal, GeneratedRecipe, GeneratedWeek } from "@/lib/validation/menu-schema";

/**
 * Un feedback recente su un pasto già servito, così com'è arrivato dalla
 * famiglia (§15): usato per non riproporre piatti segnati esplicitamente
 * "da non riproporre" (vedi `src/lib/menu/feedback-avoidance.ts`) e, per il
 * provider AI reale, anche come contesto testuale libero (es. una nota che
 * spiega perché a un membro non è piaciuto).
 */
export interface RecipeFeedbackNote {
  recipeName: string;
  tags: MealFeedbackTag[];
  note: string | null;
  submittedByName: string | null;
  createdAt: string;
}

/** Contesto familiare completo necessario per generare o adattare un menu. */
export interface HouseholdContext {
  household: Household;
  members: HouseholdMember[];
  dietaryProfiles: DietaryProfile[];
  preferences: HouseholdPreferences;
  /** Nomi delle ricette proposte nelle 2-3 settimane precedenti, per limitare le ripetizioni. */
  recentRecipeNames?: string[];
  /** Feedback recenti sui pasti della famiglia (§15), più recenti prima. */
  recentFeedback?: RecipeFeedbackNote[];
}

export interface GenerateWeeklyMenuInput {
  context: HouseholdContext;
  weekStartDate: string; // lunedì, YYYY-MM-DD
}

export interface RegenerateMealInput {
  context: HouseholdContext;
  day: Weekday;
  date: string;
  slot: MealSlot;
  currentRecipeName?: string;
  reason?: MealChangeReason;
  reasonNote?: string;
}

export interface RegenerateDayInput {
  context: HouseholdContext;
  day: Weekday;
  date: string;
  slots: MealSlot[];
}

export type AlternativeKind =
  | "simile"
  | "piu_veloce"
  | "diversa_compatibile"
  | "vegetariana"
  | "piu_economica"
  | "sotto_20_minuti"
  | "preparazione_anticipata";

export interface MealAlternative {
  kind: AlternativeKind;
  label: string;
  recipe: GeneratedRecipe;
}

export interface GenerateMealAlternativesInput {
  context: HouseholdContext;
  day: Weekday;
  slot: MealSlot;
  currentRecipeName?: string;
  reason?: MealChangeReason;
  reasonNote?: string;
}

export interface GenerateShoppingListInput {
  context: HouseholdContext;
  meals: GeneratedMeal[];
}

export interface GeneratedShoppingItemDraft {
  name: string;
  quantity: number | null;
  unit: GeneratedRecipe["ingredients"][number]["unit"];
  category: GeneratedRecipe["ingredients"][number]["category"];
  sourceMealKeys: string[]; // "day|slot"
  needsReviewReason: string | null;
}

export interface ExplainMenuChoiceInput {
  context: HouseholdContext;
  meal: GeneratedMeal;
}

/** Risultato esplicito (successo/errore), senza eccezioni non gestite. */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; issues?: WeekValidationIssue[] } };

/**
 * Astrazione centrale per la generazione del menu. Nessun componente React
 * deve chiamare un provider AI direttamente: passa sempre da qui, che si
 * occupa di validazione (Zod + regole deterministiche), error handling e
 * fallback al provider mock in caso di errore del provider reale.
 */
export interface MenuGenerationService {
  generateWeeklyMenu(input: GenerateWeeklyMenuInput): Promise<ServiceResult<GeneratedWeek>>;
  regenerateMeal(input: RegenerateMealInput): Promise<ServiceResult<GeneratedMeal>>;
  regenerateDay(input: RegenerateDayInput): Promise<ServiceResult<GeneratedMeal[]>>;
  generateMealAlternatives(input: GenerateMealAlternativesInput): Promise<ServiceResult<MealAlternative[]>>;
  generateShoppingList(input: GenerateShoppingListInput): Promise<ServiceResult<GeneratedShoppingItemDraft[]>>;
  explainMenuChoice(input: ExplainMenuChoiceInput): Promise<ServiceResult<string>>;
}
