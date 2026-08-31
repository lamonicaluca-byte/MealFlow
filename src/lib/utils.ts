import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classi Tailwind gestendo conflitti (pattern shadcn/ui standard). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Genera un identificatore univoco senza dipendere da un provider esterno. */
export function generateId(prefix = ""): string {
  const random = crypto.randomUUID();
  return prefix ? `${prefix}_${random}` : random;
}

/** Capitalizza la prima lettera, utile per label generate a runtime. */
export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
