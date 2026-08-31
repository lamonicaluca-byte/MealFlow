import { format } from "date-fns";

import { WEEKDAYS, type Meal, type MealSlot } from "@/types/domain";

const SLOT_ORDER: Record<MealSlot, number> = { colazione: 0, pranzo: 1, cena: 2 };
// Ora approssimativa entro cui si considera "ancora da venire" un dato slot.
const SLOT_CUTOFF_HOUR: Record<MealSlot, number> = { colazione: 11, pranzo: 15, cena: 23 };

export function getMealsForVersion(meals: Meal[], versionId: string): Meal[] {
  return meals.filter((m) => m.menuVersionId === versionId);
}

export function sortMealsChronologically(meals: Meal[]): Meal[] {
  return [...meals].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot];
  });
}

export function groupMealsByDay(meals: Meal[]): Array<{ day: (typeof WEEKDAYS)[number]; date: string; meals: Meal[] }> {
  const byDate = new Map<string, Meal[]>();
  for (const meal of meals) {
    const bucket = byDate.get(meal.date) ?? [];
    bucket.push(meal);
    byDate.set(meal.date, bucket);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayMeals]) => ({
      day: dayMeals[0]!.day,
      date,
      meals: [...dayMeals].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]),
    }));
}

/** Il prossimo pasto rispetto a `now`, tra quelli forniti (tipicamente la settimana corrente approvata). */
export function getNextMeal(meals: Meal[], now: Date): Meal | null {
  // "Oggi" è calcolato nel fuso locale (coerente con `home-priority.ts` e
  // con la generazione del seed demo): le date "YYYY-MM-DD" salvate nei
  // pasti rappresentano il giorno civile dell'utente, non un istante UTC.
  const todayStr = format(now, "yyyy-MM-dd");
  const currentHour = now.getHours();
  const sorted = sortMealsChronologically(meals);

  for (const meal of sorted) {
    if (meal.date < todayStr) continue;
    if (meal.date === todayStr && currentHour >= SLOT_CUTOFF_HOUR[meal.slot]) continue;
    return meal;
  }
  return null;
}
