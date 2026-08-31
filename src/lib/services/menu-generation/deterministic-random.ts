/**
 * Generatore pseudo-casuale deterministico (mulberry32) seedato da una
 * stringa. Usato dal `MockMenuProvider` per scegliere le ricette: a parità
 * di settimana e famiglia il menu generato è riproducibile (utile per i
 * test e per non "sorprendere" l'utente rigenerando l'intera settimana in
 * modo diverso a ogni refresh).
 */
function hashStringToSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createSeededRandom(seed: string): () => number {
  let a = hashStringToSeed(seed);
  return function mulberry32() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sceglie un elemento deterministico dall'array in base al rng fornito. */
export function pickDeterministic<T>(items: T[], rng: () => number): T {
  if (items.length === 0) {
    throw new Error("pickDeterministic: array vuoto");
  }
  const index = Math.floor(rng() * items.length) % items.length;
  return items[index] as T;
}

/** Restituisce una copia mescolata deterministicamente dell'array. */
export function shuffleDeterministic<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}
