"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";

import type { Meal } from "@/types/domain";
import { MEAL_SLOT_LABELS, WEEKDAY_LABELS } from "@/types/domain";
import { cn, formatDateDisplay } from "@/lib/utils";
import { groupMealsByDay } from "@/lib/selectors/menu-selectors";
import { MealCard } from "./meal-card";
import { Button } from "@/components/ui/button";

export function WeeklyMenuView({ meals, pendingApprovalHint }: { meals: Meal[]; pendingApprovalHint?: boolean }) {
  const days = groupMealsByDay(meals);
  const todayISO = format(new Date(), "yyyy-MM-dd");

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

      {/* Vista mobile/tablet: schede editoriali impilate, raggruppate per giorno.
          Attiva fino a "lg" (1024px): sotto quella soglia una griglia a 7
          colonne non lascerebbe spazio sufficiente al contenuto. */}
      <div className="space-y-6 lg:hidden">
        {days.map(({ day, date, meals: dayMeals }) => (
          <section key={date}>
            <h2 className="mb-2 font-display text-lg font-semibold">
              {WEEKDAY_LABELS[day]}{" "}
              <span className="font-sans text-xs font-normal text-muted-foreground">{formatDateDisplay(date)}</span>
              {date === todayISO && (
                <span className="ml-2 rounded-full bg-crimson px-2 py-0.5 align-middle text-[10px] font-medium text-crimson-foreground">
                  Oggi
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {dayMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Vista desktop: griglia settimanale. 4 colonne fino a "2xl" (1536px)
          — anche su un laptop/monitor "largo" da 1280-1440px, 7 colonne
          lasciano troppo poco spazio al contenuto di ogni card per essere
          leggibile — e 7 colonne (l'intera settimana in una riga) solo sugli
          schermi davvero larghi. */}
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4 2xl:grid-cols-7">
        {days.map(({ day, date, meals: dayMeals }) => {
          const isToday = date === todayISO;
          return (
            <div key={date} className="space-y-3">
              <div className={cn("rounded-md p-3", isToday ? "bg-crimson-muted" : "bg-secondary/40")}>
                <h2 className="font-display text-base font-semibold">{WEEKDAY_LABELS[day]}</h2>
                <span className="mt-0.5 block font-sans text-xs font-normal text-muted-foreground">
                  {formatDateDisplay(date)}
                </span>
              </div>
              <div className="space-y-3">
                {dayMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} compact />
                ))}
                {dayMeals.every((m) => m.slot !== "pranzo") && (
                  <p className="text-[11px] text-muted-foreground">{MEAL_SLOT_LABELS.pranzo}: nessuno</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
