"use client";

import { CalendarClock, ShoppingCart } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { formatDateDisplay } from "@/lib/utils";
import { getMealsForVersion, groupMealsByDay } from "@/lib/selectors/menu-selectors";
import { MEAL_SLOT_LABELS, WEEKDAY_LABELS } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function CalendarPage() {
  const weeklyMenus = useAppStore((s) => s.weeklyMenus);
  const meals = useAppStore((s) => s.meals);
  const household = useAppStore((s) => s.household);

  const approvedMenu = weeklyMenus.find((m) => m.status === "approved" || m.status === "modified_after_approval");
  const versionMeals = approvedMenu ? getMealsForVersion(meals, approvedMenu.currentVersionId) : [];
  const days = groupMealsByDay(versionMeals);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Calendario familiare</h1>
        <p className="text-sm text-muted-foreground">Uno sguardo d'insieme sulla settimana in corso.</p>
      </div>

      <div className="space-y-3">
        {days.map(({ day, date, meals: dayMeals }) => (
          <Card key={date}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-5">
              <div>
                <p className="font-display text-lg font-semibold">
                  {WEEKDAY_LABELS[day]} <span className="font-sans text-xs font-normal text-muted-foreground">{formatDateDisplay(date)}</span>
                </p>
                <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  {dayMeals.map((meal) => (
                    <li key={meal.id}>
                      <span className="font-medium text-foreground">{MEAL_SLOT_LABELS[meal.slot]}:</span> {meal.recipeSnapshot?.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {household?.settings.shoppingDay === day && (
                  <Badge variant="maiolica">
                    <ShoppingCart className="mr-1 h-3 w-3" /> Giorno della spesa
                  </Badge>
                )}
                {household?.settings.chalikaCookingDays.includes(day) && (
                  <Badge variant="secondary">
                    <CalendarClock className="mr-1 h-3 w-3" /> Cucina Chalika
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {days.length === 0 && <p className="text-sm text-muted-foreground">Nessun menu approvato al momento.</p>}
      </div>
    </div>
  );
}
