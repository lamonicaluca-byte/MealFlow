import { MockMenuProvider } from "./mock-provider";
import { RealMenuGenerationAdapter } from "./real-adapter";
import type { MenuGenerationService } from "./types";

let cachedService: MenuGenerationService | null = null;

/**
 * Unico punto di accesso al `MenuGenerationService` in tutta l'app. I
 * componenti React e le route handler devono SEMPRE passare da qui, mai
 * istanziare direttamente un provider: garantisce che la scelta
 * mock/reale sia centralizzata e coerente con le variabili d'ambiente.
 */
export function getMenuGenerationService(): MenuGenerationService {
  if (!cachedService) {
    const provider = process.env.MEALFLOW_AI_PROVIDER ?? "mock";
    cachedService = provider === "mock" ? new MockMenuProvider() : new RealMenuGenerationAdapter();
  }
  return cachedService;
}

export * from "./types";
export { MockMenuProvider } from "./mock-provider";
export { RealMenuGenerationAdapter } from "./real-adapter";
