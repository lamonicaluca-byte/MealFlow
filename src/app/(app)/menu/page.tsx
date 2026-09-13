"use client";

import * as React from "react";
import { format, addWeeks, startOfWeek } from "date-fns";

import { useAppStore } from "@/store/app-store";
import { formatDateDisplay } from "@/lib/utils";
import { getMealsForVersion } from "@/lib/selectors/menu-selectors";
import { WeeklyMenuView } from "@/components/menu/weekly-menu-view";
import { MenuStatusBadge } from "@/components/menu/menu-status-badge";
import { AddManualLunchDialog } from "@/components/menu/add-manual-lunch-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MenuPage() {
  const weeklyMenus = useAppStore((s) => s.weeklyMenus);
  const meals = useAppStore((s) => s.meals);

  // Solo la settimana corrente e quella successiva (a partire da quando
  // esiste, di solito dal giovedì grazie al cron di generazione anticipata):
  // lo storico di quelle passate vive già in "Storico menu", non qui. Prima
  // venivano mostrate (e selezionate di default!) tutte le settimane
  // caricate, comprese fino a 8 passate: il tab iniziale finiva quasi
  // sempre sulla più vecchia, non su quella corrente.
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const nextWeekStart = format(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), "yyyy-MM-dd");
  const sorted = weeklyMenus
    .filter((m) => m.weekStartDate === currentWeekStart || m.weekStartDate === nextWeekStart)
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
  const [tab, setTab] = React.useState<string>(sorted[0]?.id ?? "");

  React.useEffect(() => {
    if (!tab && sorted[0]) setTab(sorted[0].id);
  }, [sorted, tab]);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun menu disponibile ancora.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Menu settimanale</h1>
          <p className="text-sm text-muted-foreground">Cucina mediterranea, pensata per tutta la famiglia.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {sorted.map((menu) => (
              <TabsTrigger key={menu.id} value={menu.id}>
                Settimana del {formatDateDisplay(menu.weekStartDate)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {sorted.map((menu) => {
          const versionMeals = getMealsForVersion(meals, menu.currentVersionId);
          return (
            <TabsContent key={menu.id} value={menu.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <MenuStatusBadge status={menu.status} />
                <AddManualLunchDialog weekdayMeals={versionMeals} />
              </div>
              <WeeklyMenuView
                meals={versionMeals}
                weekStartDate={menu.weekStartDate}
                pendingApprovalHint={menu.status === "pending_approval"}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
