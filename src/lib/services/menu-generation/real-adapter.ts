import { GeneratedWeekSchema } from "@/lib/validation/menu-schema";
import { validateGeneratedWeek } from "@/lib/validation/validate-generated-week";
import { MockMenuProvider } from "./mock-provider";
import type {
  ExplainMenuChoiceInput,
  GenerateMealAlternativesInput,
  GenerateShoppingListInput,
  GenerateWeeklyMenuInput,
  GeneratedShoppingItemDraft,
  HouseholdContext,
  LeftoverSuggestion,
  MealAlternative,
  MenuGenerationService,
  RegenerateDayInput,
  RegenerateMealInput,
  ServiceResult,
  SuggestLeftoverReuseInput,
} from "./types";
import type { GeneratedMeal, GeneratedWeek } from "@/lib/validation/menu-schema";

/**
 * Adapter predisposto per un provider AI reale (es. Anthropic). NON viene mai
 * chiamato direttamente dai componenti React: passa sempre da
 * `getMenuGenerationService()`.
 *
 * Comportamento:
 * 1. Se non è configurata alcuna chiave (`MEALFLOW_AI_PROVIDER` diverso da
 *    "mock" ma senza `ANTHROPIC_API_KEY`), delega interamente al
 *    `MockMenuProvider`: l'app deve funzionare anche senza provider AI reale.
 * 2. Se configurato, l'idea è che questo adapter costruisca un prompt che
 *    richieda ESPLICITAMENTE un output JSON conforme a `GeneratedWeekSchema`
 *    (structured output / JSON mode del provider), lo validi con Zod e poi lo
 *    passi comunque a `validateGeneratedWeek` (le regole di sicurezza — in
 *    primis le allergie — non sono MAI delegate al modello).
 * 3. Qualunque errore (rete, timeout, output non conforme) fa fallback al
 *    `MockMenuProvider` piuttosto che rompere l'esperienza utente.
 *
 * La generazione effettiva della chiamata HTTP è lasciata come TODO
 * documentato: implementarla richiede una chiave reale e un endpoint, che
 * questo progetto demo non possiede né deve possedere.
 */
export class RealMenuGenerationAdapter implements MenuGenerationService {
  private readonly fallback = new MockMenuProvider();
  private readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.MEALFLOW_AI_PROVIDER !== "mock";
  }

  async generateWeeklyMenu(input: GenerateWeeklyMenuInput): Promise<ServiceResult<GeneratedWeek>> {
    if (!this.isConfigured) return this.fallback.generateWeeklyMenu(input);
    try {
      const raw = await this.callProvider("generateWeeklyMenu", input);
      const parsed = GeneratedWeekSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: { code: "invalid_ai_output", message: parsed.error.message } };
      }
      const validation = validateGeneratedWeek(parsed.data, input.context.dietaryProfiles);
      if (!validation.isValid) {
        return {
          ok: false,
          error: { code: "generated_week_invalid", message: "Output AI non conforme alle regole di sicurezza.", issues: validation.issues },
        };
      }
      return { ok: true, data: parsed.data };
    } catch {
      // Fallback silenzioso e tracciabile: mai bloccare l'utente per un errore del provider esterno.
      return this.fallback.generateWeeklyMenu(input);
    }
  }

  async regenerateMeal(input: RegenerateMealInput): Promise<ServiceResult<GeneratedMeal>> {
    if (!this.isConfigured) return this.fallback.regenerateMeal(input);
    try {
      await this.callProvider("regenerateMeal", input);
      // Percorso irraggiungibile finché il provider reale non è collegato:
      // `callProvider` lancia sempre (vedi TODO), quindi si finisce nel catch.
      throw new Error("unreachable");
    } catch {
      return this.fallback.regenerateMeal(input);
    }
  }

  async regenerateDay(input: RegenerateDayInput): Promise<ServiceResult<GeneratedMeal[]>> {
    if (!this.isConfigured) return this.fallback.regenerateDay(input);
    return this.fallback.regenerateDay(input);
  }

  async generateMealAlternatives(input: GenerateMealAlternativesInput): Promise<ServiceResult<MealAlternative[]>> {
    if (!this.isConfigured) return this.fallback.generateMealAlternatives(input);
    return this.fallback.generateMealAlternatives(input);
  }

  async generateShoppingList(input: GenerateShoppingListInput): Promise<ServiceResult<GeneratedShoppingItemDraft[]>> {
    if (!this.isConfigured) return this.fallback.generateShoppingList(input);
    return this.fallback.generateShoppingList(input);
  }

  async suggestLeftoverReuse(input: SuggestLeftoverReuseInput): Promise<ServiceResult<LeftoverSuggestion[]>> {
    if (!this.isConfigured) return this.fallback.suggestLeftoverReuse(input);
    return this.fallback.suggestLeftoverReuse(input);
  }

  async explainMenuChoice(input: ExplainMenuChoiceInput): Promise<ServiceResult<string>> {
    if (!this.isConfigured) return this.fallback.explainMenuChoice(input);
    return this.fallback.explainMenuChoice(input);
  }

  /**
   * TODO(provider reale): sostituire con una chiamata HTTP reale al
   * provider AI configurato, richiedendo output JSON strutturato conforme a
   * `GeneratedWeekSchema` (o allo schema pertinente al metodo). Qui si lancia
   * volutamente un errore per far scattare il fallback finché non viene
   * collegato un provider vero: mai inviare dati reali della famiglia a un
   * endpoint non implementato.
   */
  private async callProvider(_method: string, _input: unknown): Promise<never> {
    throw new Error("Provider AI reale non ancora collegato: fallback al provider mock.");
  }
}
