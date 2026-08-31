import type { Weekday } from "@/types/domain";

const WEEKDAY_BY_JS_DAY: Record<number, Weekday> = {
  0: "domenica",
  1: "lunedi",
  2: "martedi",
  3: "mercoledi",
  4: "giovedi",
  5: "venerdi",
  6: "sabato",
};

export function weekdayFromDate(date: Date): Weekday {
  return WEEKDAY_BY_JS_DAY[date.getDay()] as Weekday;
}

export type HomePriorityKind =
  | "review_menu"
  | "approval_pending"
  | "shopping_missing"
  | "next_week"
  | "next_meal";

export interface HomePriority {
  kind: HomePriorityKind;
}

/**
 * Calcola quale messaggio dare priorità nella Home (§17). L'ordine riflette
 * esattamente quello del brief: giovedì → venerdì → giorno della spesa →
 * domenica sera → fallback "prossimo pasto" (che altrimenti sarebbe sempre
 * vero e coprirebbe gli altri casi).
 */
export function computeHomePriority(params: {
  now: Date;
  shoppingDay: Weekday;
  hasPendingApprovalForNextWeek: boolean;
  hasItemsLeftToBuy: boolean;
}): HomePriority {
  const { now, shoppingDay, hasPendingApprovalForNextWeek, hasItemsLeftToBuy } = params;
  const day = weekdayFromDate(now);
  const hour = now.getHours();

  if (day === "giovedi" && hasPendingApprovalForNextWeek) return { kind: "review_menu" };
  if (day === "venerdi" && hasPendingApprovalForNextWeek) return { kind: "approval_pending" };
  if (day === shoppingDay && hasItemsLeftToBuy) return { kind: "shopping_missing" };
  if (day === "domenica" && hour >= 18) return { kind: "next_week" };
  return { kind: "next_meal" };
}
