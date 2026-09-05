import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classi Tailwind gestendo conflitti (pattern shadcn/ui standard). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Genera un identificatore univoco senza dipendere da un provider esterno.
 * Restituisce sempre un UUID puro (mai prefissato): gli stessi id generati
 * qui in modalità demo devono restare validi anche come chiave primaria
 * `uuid` reale quando sincronizzati su Supabase in produzione. Il parametro
 * `prefix` è mantenuto solo per compatibilità delle chiamate esistenti nel
 * codice ed è ignorato.
 */
export function generateId(_prefix = ""): string {
  return crypto.randomUUID();
}

/** Capitalizza la prima lettera, utile per label generate a runtime. */
export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
