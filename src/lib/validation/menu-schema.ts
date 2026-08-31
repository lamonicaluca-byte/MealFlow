import { z } from "zod";

/**
 * Contratto JSON strutturato che QUALSIASI provider di `MenuGenerationService`
 * (mock o reale) deve rispettare. Il provider reale (adapter AI) deve
 * produrre un output che passi questo schema prima ancora di arrivare alla
 * validazione semantica (`validateGeneratedWeek`): niente testo libero.
 */

export const IngredientUnitSchema = z.enum([
  "g",
  "kg",
  "ml",
  "l",
  "pz",
  "cucchiai",
  "cucchiaini",
  "q.b.",
]);

export const ShoppingCategorySchema = z.enum([
  "frutta_verdura",
  "pesce_carne",
  "latticini_uova",
  "pane_forno",
  "pasta_riso_cereali",
  "dispensa",
  "surgelati",
  "colazione",
  "bevande",
  "casa",
  "altro",
]);

export const GeneratedIngredientSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive().nullable(),
  unit: IngredientUnitSchema.nullable(),
  category: ShoppingCategorySchema,
  optional: z.boolean().default(false),
});

export const GeneratedRecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  mediterraneanTags: z.array(z.string()),
  servings: z.number().int().positive(),
  prepMinutes: z.number().int().min(0),
  cookMinutes: z.number().int().min(0),
  difficulty: z.enum(["facile", "media", "impegnativa"]),
  canPrepareAhead: z.boolean(),
  allergens: z.array(z.string()),
  ingredients: z.array(GeneratedIngredientSchema).min(1),
  steps: z.array(z.string()).min(1),
  imageEmoji: z.string().min(1),
  isVegetarian: z.boolean(),
  isQuickUnder20: z.boolean(),
  usesLeftovers: z.boolean(),
  costLevel: z.enum(["basso", "medio", "alto"]),
});

export const WeekdaySchema = z.enum([
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
  "domenica",
]);

export const MealSlotSchema = z.enum(["colazione", "pranzo", "cena"]);

export const GeneratedMealSchema = z.object({
  day: WeekdaySchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data attesa in formato YYYY-MM-DD"),
  slot: MealSlotSchema,
  recipe: GeneratedRecipeSchema,
  isManuallyAdded: z.boolean().default(false),
  chalikaNote: z.string().nullable().default(null),
  familyNote: z.string().nullable().default(null),
  childAdaptationNote: z.string().nullable().default(null),
  usesExistingPantryItems: z.array(z.string()).default([]),
  usesLeftovers: z.boolean().default(false),
});

export const GeneratedWeekSchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  meals: z.array(GeneratedMealSchema).min(1),
});

export type GeneratedIngredient = z.infer<typeof GeneratedIngredientSchema>;
export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;
export type GeneratedMeal = z.infer<typeof GeneratedMealSchema>;
export type GeneratedWeek = z.infer<typeof GeneratedWeekSchema>;
