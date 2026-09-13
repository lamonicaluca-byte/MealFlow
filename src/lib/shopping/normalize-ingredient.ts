/**
 * Normalizzazione dei nomi ingrediente per l'aggregazione della lista della
 * spesa. Copre esplicitamente i casi richiesti (es. "zucchina"/"zucchine")
 * tramite una tabella di alias curata: NIENTE euristiche linguistiche
 * generiche (plurali irregolari italiani sono troppo rischiosi da indovinare
 * automaticamente), per non produrre "conversioni incerte".
 */
const ALIAS_GROUPS: string[][] = [
  ["banana", "banane"],
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

/**
 * Descrittori che si attaccano al nome ("uova FRESCHE", "pomodori MATURI")
 * senza cambiare il prodotto agli occhi della lista della spesa: si
 * rimuovono prima del confronto, così "uova" e "uova fresche" finiscono
 * nella stessa riga. Elenco curato e volutamente prudente — solo parole che
 * non cambiano MAI cosa comprare — non ogni aggettivo possibile: "secco"
 * o "surgelato", per esempio, restano fuori apposta, perché "fagioli
 * secchi" e "verdure surgelate" sono spesso davvero un prodotto diverso
 * (altro reparto, altra confezione) da "fagioli" o "verdure".
 */
const IGNORABLE_QUALIFIERS = new Set([
  "fresco",
  "fresca",
  "freschi",
  "fresche",
  "maturo",
  "matura",
  "maturi",
  "mature",
  "biologico",
  "biologica",
  "biologici",
  "biologiche",
  "bio",
  "extravergine",
]);

function stripIgnorableQualifiers(name: string): string {
  const words = name.split(" ").filter((w) => !IGNORABLE_QUALIFIERS.has(w));
  // Se il nome fosse fatto solo di descrittori (improbabile, ma per non
  // finire con una riga senza nome) si tiene l'originale.
  return words.length > 0 ? words.join(" ") : name;
}

export function normalizeIngredientName(rawName: string): string {
  const cleaned = rawName.toLowerCase().trim().replace(/\s+/g, " ");
  const withoutQualifiers = stripIgnorableQualifiers(cleaned);
  return ALIAS_MAP.get(withoutQualifiers) ?? withoutQualifiers;
}
