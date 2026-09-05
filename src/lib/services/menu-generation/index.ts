import type { MenuGenerationService } from "./types";

let cachedService: MenuGenerationService | null = null;

/**
 * Unico punto di accesso al `MenuGenerationService` in tutta l'app. I
 * componenti React e le route handler devono SEMPRE passare da qui, mai
 * istanziare direttamente un provider: garantisce che la scelta
 * mock/reale sia centralizzata e coerente con le variabili d'ambiente.
 *
 * `RealMenuGenerationAdapter` è importato dinamicamente: alcuni chiamanti
 * (es. `src/store/app-store.ts`) sono componenti client, e l'SDK Anthropic
 * non deve gonfiare il bundle del browser per un codice che lì non verrà mai
 * eseguito davvero (`ANTHROPIC_API_KEY` non è mai presente lato client).
 */
export async function getMenuGenerationService(): Promise<MenuGenerationService> {
  if (cachedService) return cachedService;
  const provider = process.env.MEALFLOW_AI_PROVIDER ?? "mock";
  if (provider === "mock") {
    const { MockMenuProvider } = await import("./mock-provider");
    cachedService = new MockMenuProvider();
  } else {
    const { RealMenuGenerationAdapter } = await import("./real-adapter");
    cachedService = new RealMenuGenerationAdapter();
  }
  return cachedService;
}

export * from "./types";
export { MockMenuProvider } from "./mock-provider";
