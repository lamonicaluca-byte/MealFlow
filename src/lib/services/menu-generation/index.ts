import type { MenuGenerationService } from "./types";

let cachedService: MenuGenerationService | null = null;

/**
 * Unico punto di accesso al `MenuGenerationService` in tutta l'app. I
 * componenti React e le route handler devono SEMPRE passare da qui, mai
 * istanziare direttamente un provider: garantisce che la scelta
 * mock/reale sia centralizzata e coerente con le variabili d'ambiente.
 *
 * I provider reali (`RealMenuGenerationAdapter` per Anthropic,
 * `GeminiMenuGenerationAdapter` per Google Gemini) sono importati
 * dinamicamente: alcuni chiamanti (es. `src/store/app-store.ts`) sono
 * componenti client, e i rispettivi SDK non devono gonfiare il bundle del
 * browser per un codice che lì non verrà mai eseguito davvero (le chiavi API
 * non hanno mai il prefisso `NEXT_PUBLIC_`).
 */
export async function getMenuGenerationService(): Promise<MenuGenerationService> {
  if (cachedService) return cachedService;
  const provider = process.env.MEALFLOW_AI_PROVIDER ?? "mock";
  if (provider === "anthropic") {
    const { RealMenuGenerationAdapter } = await import("./real-adapter");
    cachedService = new RealMenuGenerationAdapter();
  } else if (provider === "gemini") {
    const { GeminiMenuGenerationAdapter } = await import("./gemini-adapter");
    cachedService = new GeminiMenuGenerationAdapter();
  } else {
    const { MockMenuProvider } = await import("./mock-provider");
    cachedService = new MockMenuProvider();
  }
  return cachedService;
}

export * from "./types";
export { MockMenuProvider } from "./mock-provider";
