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

/**
 * Converte una data pura ("YYYY-MM-DD", il formato usato ovunque per lo
 * storage/i confronti) nel formato "DD-MM-YYYY" richiesto per la
 * visualizzazione. Usare SOLO per il testo mostrato all'utente: il formato
 * interno resta sempre ISO (ordinabile con un confronto tra stringhe).
 */
export function formatDateDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}-${month}-${year}`;
}
