/**
 * Normalizzazione dei nomi ingrediente per l'aggregazione della lista della
 * spesa. Copre esplicitamente i casi richiesti (es. "zucchina"/"zucchine")
 * tramite una tabella di alias curata: NIENTE euristiche linguistiche
 * generiche (plurali irregolari italiani sono troppo rischiosi da indovinare
 * automaticamente), per non produrre "conversioni incerte".
 */
const ALIAS_GROUPS: string[][] = [
  ["zucchina", "zucchine"],
  ["carota", "carote"],
  ["patata", "patate"],
  ["cipolla", "cipolle"],
  ["mela", "mele"],
  ["pera", "pere"],
  ["arancia", "arance"],
  ["limone", "limoni"],
  ["oliva", "olive"],
  ["pomodoro", "pomodori"],
  ["uovo", "uova"],
  ["melanzana", "melanzane"],
  ["peperone", "peperoni"],
  ["fagiolo borlotto", "fagioli borlotti", "fagioli borlotto"],
  ["cetriolo", "cetrioli"],
];

const ALIAS_MAP: Map<string, string> = new Map();
for (const group of ALIAS_GROUPS) {
  // La forma canonica è l'ultima del gruppo (nei nostri elenchi, il plurale:
  // più naturale per una lista della spesa — "1,5 kg di zucchine").
  const canonical = group[group.length - 1] as string;
  for (const variant of group) {
    ALIAS_MAP.set(variant, canonical);
  }
}

export function normalizeIngredientName(rawName: string): string {
  const cleaned = rawName.toLowerCase().trim().replace(/\s+/g, " ");
  return ALIAS_MAP.get(cleaned) ?? cleaned;
}
