"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import type { Meal } from "@/types/domain";
import { MEAL_SLOT_LABELS, WEEKDAY_LABELS } from "@/types/domain";
import { groupMealsByDay } from "@/lib/selectors/menu-selectors";
import { MealCard } from "./meal-card";
import { Button } from "@/components/ui/button";

export function WeeklyMenuView({ meals, pendingApprovalHint }: { meals: Meal[]; pendingApprovalHint?: boolean }) {
  const days = groupMealsByDay(meals);

  if (days.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nessun pasto per questa settimana.
      </div>
    );
  }

  return (
    <div>
      {pendingApprovalHint && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4" /> Questo menu è in attesa di approvazione.
          </p>
          <Button asChild size="sm">
            <Link href="/menu/approvazione">Vai all'approvazione</Link>
          </Button>
        </div>
      )}

      {/* Vista mobile: schede editoriali impilate, raggruppate per giorno */}
      <div className="space-y-6 md:hidden">
        {days.map(({ day, date, meals: dayMeals }) => (
          <section key={date}>
            <h2 className="mb-2 font-display text-lg font-semibold">
              {WEEKDAY_LABELS[day]} <span className="font-sans text-xs font-normal text-muted-foreground">{date}</span>
            </h2>
            <div className="space-y-3">
              {dayMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Vista desktop: griglia settimanale */}
      <div className="hidden md:grid md:grid-cols-7 md:gap-3">
        {days.map(({ day, date, meals: dayMeals }) => (
          <div key={date} className="space-y-3">
            <h2 className="font-display text-base font-semibold">
              {WEEKDAY_LABELS[day]}
              <span className="mt-0.5 block font-sans text-[11px] font-normal text-muted-foreground">{date}</span>
            </h2>
            <div className="space-y-3">
              {dayMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} compact />
              ))}
              {dayMeals.every((m) => m.slot !== "pranzo") && (
                <p className="text-[11px] text-muted-foreground">{MEAL_SLOT_LABELS.pranzo}: nessuno</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
