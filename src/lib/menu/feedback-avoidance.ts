import type { RecipeFeedbackNote } from "@/lib/services/menu-generation/types";

/**
 * Nomi (case-insensitive) dei piatti che la famiglia ha segnato esplicitamente
 * come "da non riproporre" (§15) in un feedback recente. Usato sia dal
 * provider mock (esclusione soft, bypassabile solo se il pool di ricette si
 * esaurisce, come le altre preferenze) sia dal prompt del provider AI reale.
 *
 * Nota: il modello dati non registra "per quale membro" vale il dislike (il
 * feedback è a livello di pasto, non di persona) — è una semplificazione
 * accettata: un piatto segnato "da non riproporre" viene evitato per tutta
 * la famiglia, non solo per chi ha lasciato il feedback.
 */
export function avoidedRecipeNames(recentFeedback: RecipeFeedbackNote[] | undefined): Set<string> {
  const names = new Set<string>();
  for (const entry of recentFeedback ?? []) {
    if (entry.tags.includes("da_non_riproporre")) names.add(entry.recipeName.toLowerCase());
  }
  return names;
}
