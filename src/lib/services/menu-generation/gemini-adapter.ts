import { GoogleGenAI } from "@google/genai";
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

const DEFAULT_MODEL = "gemini-3.6-flash";

function toJsonSchema(schema: z.ZodTypeAny): unknown {
  // "jsonSchema7" (non "openApi3"): quest'ultimo produce lo stile draft-04 di
  // exclusiveMinimum/Maximum ({ minimum, exclusiveMinimum: true }), che
  // responseJsonSchema di Gemini rifiuta ("must be a number"). Draft-07 usa
  // invece la forma numerica diretta ({ exclusiveMinimum: 0 }), supportata.
  return zodToJsonSchema(schema, { target: "jsonSchema7" });
}

/**
 * Adapter reale collegato a Google Gemini: alternativa gratuita ad Anthropic
 * (livello gratuito di Google AI Studio, nessuna carta di credito
 * richiesta — vedi ai.google.dev). Stessa architettura di
 * `RealMenuGenerationAdapter` (Anthropic): stessi prompt (`prompts.ts`),
 * stessi schemi Zod per l'output strutturato — qui richiesti tramite
 * `responseJsonSchema` + `responseMimeType: "application/json"` invece del
 * tool-use di Claude — stessa validazione finale (mai delegata al modello,
 * vedi `validateGeneratedWeek`) e stesso fallback silenzioso al
 * `MockMenuProvider` in caso di errore.
 *
 * Attivo quando `MEALFLOW_AI_PROVIDER=gemini` ed è presente `GEMINI_API_KEY`.
 * Come per l'adapter Anthropic, non fa mai nulla di reale se eseguito dal
 * browser: `GEMINI_API_KEY` non ha il prefisso `NEXT_PUBLIC_`, quindi in un
 * bundle client vale sempre `undefined`.
 */
export class GeminiMenuGenerationAdapter implements MenuGenerationService {
  private readonly fallback = new MockMenuProvider();
  private readonly isConfigured: boolean;
  private readonly model: string;
  private client: GoogleGenAI | null = null;

  constructor() {
    this.isConfigured = Boolean(process.env.GEMINI_API_KEY) && process.env.MEALFLOW_AI_PROVIDER === "gemini";
    this.model = process.env.MEALFLOW_GEMINI_MODEL || DEFAULT_MODEL;
  }

  private getClient(): GoogleGenAI {
    if (!this.client) this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return this.client;
  }

  /** Chiede a Gemini un output JSON conforme allo schema Zod indicato, e ne restituisce il parsing grezzo (non ancora validato). */
  private async generateJson(params: { system: string; user: string; schema: z.ZodTypeAny }): Promise<unknown> {
    const response = await this.getClient().models.generateContent({
      model: this.model,
      contents: params.user,
      config: {
        systemInstruction: params.system,
        responseMimeType: "application/json",
        responseJsonSchema: toJsonSchema(params.schema),
      },
    });
    const text = response.text;
    if (!text) throw new Error("Gemini non ha restituito alcun testo.");
    return JSON.parse(text);
  }

  async generateWeeklyMenu(input: GenerateWeeklyMenuInput): Promise<ServiceResult<GeneratedWeek>> {
    if (!this.isConfigured) return this.fallback.generateWeeklyMenu(input);
    try {
      const raw = await this.generateJson({
        system:
          "Sei lo chef di famiglia di MealFlow: proponi un menu settimanale mediterraneo, vario ed equilibrato, rispettando rigorosamente le regole di sicurezza alimentare indicate.",
        user: buildWeeklyMenuUserPrompt(input.context, input.weekStartDate),
        schema: GeneratedWeekSchema,
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
      console.error("Generazione Gemini del menu settimanale fallita, uso il fallback mock:", error);
      return this.fallback.generateWeeklyMenu(input);
    }
  }

  async regenerateMeal(input: RegenerateMealInput): Promise<ServiceResult<GeneratedMeal>> {
    if (!this.isConfigured) return this.fallback.regenerateMeal(input);
    try {
      const raw = await this.generateJson({
        system: "Sei lo chef di famiglia di MealFlow: proponi una singola ricetta mediterranea, rispettando rigorosamente le regole di sicurezza alimentare indicate.",
        user: buildRegenerateMealUserPrompt(input),
        schema: GeneratedMealSchema,
      });
      const parsed = GeneratedMealSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: { code: "invalid_ai_output", message: parsed.error.message } };
      }
      return { ok: true, data: parsed.data };
    } catch (error) {
      console.error("Rigenerazione Gemini del pasto fallita, uso il fallback mock:", error);
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
      const raw = await this.generateJson({
        system: "Sei lo chef di famiglia di MealFlow: proponi alternative mediterranee variate, rispettando rigorosamente le regole di sicurezza alimentare indicate.",
        user: buildAlternativesUserPrompt(input),
        schema: GeneratedAlternativesSchema,
      });
      const parsed = GeneratedAlternativesSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false, error: { code: "invalid_ai_output", message: parsed.error.message } };
      }
      return { ok: true, data: parsed.data.alternatives };
    } catch (error) {
      console.error("Generazione Gemini delle alternative fallita, uso il fallback mock:", error);
      return this.fallback.generateMealAlternatives(input);
    }
  }

  async generateShoppingList(input: GenerateShoppingListInput): Promise<ServiceResult<GeneratedShoppingItemDraft[]>> {
    // La lista della spesa non è mai generata dall'AI: vedi la stessa nota
    // in RealMenuGenerationAdapter (Anthropic).
    return this.fallback.generateShoppingList(input);
  }

  async explainMenuChoice(input: ExplainMenuChoiceInput): Promise<ServiceResult<string>> {
    if (!this.isConfigured) return this.fallback.explainMenuChoice(input);
    try {
      const response = await this.getClient().models.generateContent({
        model: this.model,
        contents: [
          buildHouseholdRulesText(input.context),
          "",
          `Spiega perché "${input.meal.recipe.name}" è una buona scelta per ${input.meal.slot} di ${input.meal.day}.`,
        ].join("\n"),
        config: {
          systemInstruction:
            "Sei lo chef di famiglia di MealFlow: spiega in 2-3 frasi, in italiano, in tono caldo e diretto, perché un piatto è stato scelto per la famiglia.",
          maxOutputTokens: 300,
        },
      });
      const text = response.text;
      if (!text) throw new Error("Gemini non ha restituito testo.");
      return { ok: true, data: text.trim() };
    } catch (error) {
      console.error("Spiegazione Gemini fallita, uso il fallback mock:", error);
      return this.fallback.explainMenuChoice(input);
    }
  }
}
