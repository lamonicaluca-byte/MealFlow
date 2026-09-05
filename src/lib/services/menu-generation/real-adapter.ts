import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

import {
  GeneratedAlternativesSchema,
  GeneratedMealSchema,
  GeneratedWeekSchema,
} from "@/lib/validation/menu-schema";
import { validateGeneratedWeek } from "@/lib/validation/validate-generated-week";
import { MockMenuProvider } from "./mock-provider";
import { buildAlternativesUserPrompt, buildHouseholdRulesText, buildRegenerateMealUserPrompt, buildWeeklyMenuUserPrompt } from "./prompts";
import type {
  ExplainMenuChoiceInput,
  GenerateMealAlternativesInput,
  GenerateShoppingListInput,
  GenerateWeeklyMenuInput,
  GeneratedShoppingItemDraft,
  MealAlternative,
  MenuGenerationService,
  RegenerateDayInput,
  RegenerateMealInput,
  ServiceResult,
} from "./types";
import type { GeneratedMeal, GeneratedWeek } from "@/lib/validation/menu-schema";

const DEFAULT_MODEL = "claude-sonnet-5";

/** Converte uno schema Zod in JSON Schema per il campo `input_schema` di un tool Claude. */
function toInputSchema(schema: z.ZodTypeAny): Anthropic.Tool.InputSchema {
  const json = zodToJsonSchema(schema, { target: "openApi3" });
  return json as Anthropic.Tool.InputSchema;
}

/**
 * Adapter reale collegato ad Anthropic (Claude). Attivo quando
 * `MEALFLOW_AI_PROVIDER` non è "mock" ed è presente `ANTHROPIC_API_KEY`.
 *
 * Comportamento:
 * 1. Se non configurato, delega interamente al `MockMenuProvider`: l'app deve
 *    funzionare anche senza provider AI reale.
 * 2. Se configurato, chiama Claude forzando l'uso di un tool con
 *    `input_schema` generato dallo stesso schema Zod (`GeneratedWeekSchema` /
 *    `GeneratedMealSchema` / `GeneratedAlternativesSchema`) usato per la
 *    validazione: garantisce output strutturato, mai testo libero da fare il
 *    parsing "a mano".
 * 3. L'output viene comunque validato con Zod e poi con `validateGeneratedWeek`
 *    (le regole di sicurezza — in primis le allergie — non sono MAI delegate
 *    al modello, nemmeno quando il prompt le richiede esplicitamente).
 * 4. Qualunque errore (rete, timeout, output non conforme) fa fallback al
 *    `MockMenuProvider` piuttosto che rompere l'esperienza utente.
 *
 * Non viene mai istanziato/chiamato dal browser con una chiave reale:
 * `ANTHROPIC_API_KEY` non ha il prefisso `NEXT_PUBLIC_`, quindi in un
 * bundle client vale sempre `undefined` e `isConfigured` resta `false`
 * (fallback automatico al mock, vedi anche `getMenuGenerationService`).
 */
export class RealMenuGenerationAdapter implements MenuGenerationService {
  private readonly fallback = new MockMenuProvider();
  private readonly isConfigured: boolean;
  private readonly model: string;
  private client: Anthropic | null = null;

  constructor() {
    this.isConfigured = Boolean(process.env.ANTHROPIC_API_KEY) && process.env.MEALFLOW_AI_PROVIDER !== "mock";
    this.model = process.env.MEALFLOW_ANTHROPIC_MODEL || DEFAULT_MODEL;
  }

  private getClient(): Anthropic {
    if (!this.client) this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return this.client;
  }

  /** Chiama Claude forzando l'uso di un unico tool, e ne restituisce l'input grezzo (non ancora validato). */
  private async callTool(params: {
    system: string;
    user: string;
    maxTokens: number;
    tool: { name: string; description: string; schema: z.ZodTypeAny };
  }): Promise<unknown> {
    const response = await this.getClient().messages.create({
      model: this.model,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: [{ role: "user", content: params.user }],
      tools: [{ name: params.tool.name, description: params.tool.description, input_schema: toInputSchema(params.tool.schema) }],
      tool_choice: { type: "tool", name: params.tool.name },
    });
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse) throw new Error("Claude non ha restituito l'output strutturato atteso.");
    return toolUse.input;
  }

  async generateWeeklyMenu(input: GenerateWeeklyMenuInput): Promise<ServiceResult<GeneratedWeek>> {
    if (!this.isConfigured) return this.fallback.generateWeeklyMenu(input);
    try {
      const raw = await this.callTool({
        system:
          "Sei lo chef di famiglia di MealFlow: proponi un menu settimanale mediterraneo, vario ed equilibrato, rispettando rigorosamente le regole di sicurezza alimentare indicate.",
        user: buildWeeklyMenuUserPrompt(input.context, input.weekStartDate),
        maxTokens: 8192,
        tool: {
          name: "genera_menu_settimanale",
          description: "Restituisce il menu completo della settimana richiesta.",
          schema: GeneratedWeekSchema,
        },
      });
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
    } catch (error) {
      // Fallback silenzioso e tracciabile: mai bloccare l'utente per un errore del provider esterno.
      console.error("Generazione AI del menu settimanale fallita, uso il fallback mock:", error);
      return this.fallback.generateWeeklyMenu(input);
    }
  }

  async regenerateMeal(input: RegenerateMealInput): Promise<ServiceResult<GeneratedMeal>> {
    if (!this.isConfigured) return this.fallback.regenerateMeal(input);
    try {
      const raw = await this.callTool({
        system: "Sei lo chef di famiglia di MealFlow: proponi una singola ricetta mediterranea, rispettando rigorosamente le regole di sicurezza alimentare indicate.",
        user: buildRegenerateMealUserPrompt(input),
        maxTokens: 2048,
        tool: {
          name: "genera_pasto",
          description: "Restituisce un singolo pasto (giorno, slot, ricetta).",
          schema: GeneratedMealSchema,
        },
      });
      const parsed = GeneratedMealSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: { code: "invalid_ai_output", message: parsed.error.message } };
      }
      return { ok: true, data: parsed.data };
    } catch (error) {
      console.error("Rigenerazione AI del pasto fallita, uso il fallback mock:", error);
      return this.fallback.regenerateMeal(input);
    }
  }

  async regenerateDay(input: RegenerateDayInput): Promise<ServiceResult<GeneratedMeal[]>> {
    // Non collegata a nessuna azione dell'interfaccia: il fallback al mock è
    // sufficiente finché non viene esposta una vera funzionalità utente.
    if (!this.isConfigured) return this.fallback.regenerateDay(input);
    return this.fallback.regenerateDay(input);
  }

  async generateMealAlternatives(input: GenerateMealAlternativesInput): Promise<ServiceResult<MealAlternative[]>> {
    if (!this.isConfigured) return this.fallback.generateMealAlternatives(input);
    try {
      const raw = await this.callTool({
        system: "Sei lo chef di famiglia di MealFlow: proponi alternative mediterranee variate, rispettando rigorosamente le regole di sicurezza alimentare indicate.",
        user: buildAlternativesUserPrompt(input),
        maxTokens: 4096,
        tool: {
          name: "genera_alternative",
          description: "Restituisce un elenco di alternative per il pasto richiesto.",
          schema: GeneratedAlternativesSchema,
        },
      });
      const parsed = GeneratedAlternativesSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: { code: "invalid_ai_output", message: parsed.error.message } };
      }
      return { ok: true, data: parsed.data.alternatives };
    } catch (error) {
      console.error("Generazione AI delle alternative fallita, uso il fallback mock:", error);
      return this.fallback.generateMealAlternatives(input);
    }
  }

  async generateShoppingList(input: GenerateShoppingListInput): Promise<ServiceResult<GeneratedShoppingItemDraft[]>> {
    // La lista della spesa non è mai generata dall'AI: è sempre ricalcolata
    // deterministicamente dagli ingredienti dei pasti (vedi
    // `src/lib/shopping/reconcile-shopping-list.ts`). Questo metodo resta
    // per completezza dell'interfaccia ma non è mai chiamato dall'app.
    return this.fallback.generateShoppingList(input);
  }

  async explainMenuChoice(input: ExplainMenuChoiceInput): Promise<ServiceResult<string>> {
    if (!this.isConfigured) return this.fallback.explainMenuChoice(input);
    try {
      const response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: 300,
        system: "Sei lo chef di famiglia di MealFlow: spiega in 2-3 frasi, in italiano, in tono caldo e diretto, perché un piatto è stato scelto per la famiglia.",
        messages: [
          {
            role: "user",
            content: [
              buildHouseholdRulesText(input.context),
              "",
              `Spiega perché "${input.meal.recipe.name}" è una buona scelta per ${input.meal.slot} di ${input.meal.day}.`,
            ].join("\n"),
          },
        ],
      });
      const text = response.content.find((block) => block.type === "text");
      if (!text || text.type !== "text") throw new Error("Claude non ha restituito testo.");
      return { ok: true, data: text.text.trim() };
    } catch (error) {
      console.error("Spiegazione AI fallita, uso il fallback mock:", error);
      return this.fallback.explainMenuChoice(input);
    }
  }
}
