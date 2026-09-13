"use client";

import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { format, startOfWeek } from "date-fns";

import type { Meal, MealSlot } from "@/types/domain";
import { MEAL_SLOT_LABELS, WEEKDAY_LABELS } from "@/types/domain";
import { cn, formatDateDisplay } from "@/lib/utils";
import { groupMealsByDay } from "@/lib/selectors/menu-selectors";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canEditMenu } from "@/lib/auth/permissions";
import { MealCard } from "./meal-card";
import { AddManualLunchDialog } from "./add-manual-lunch-dialog";
import { Button } from "@/components/ui/button";

const SLOT_ORDER: MealSlot[] = ["colazione", "pranzo", "cena"];

// Sempre 7 colonne vere (mai un numero di colonne che non divide 7, es. 4):
// un "a capo" a metà settimana spezzerebbe l'intestazione del giorno dal
// resto delle righe pasto, che vanno a capo separatamente (ogni riga è una
// griglia CSS indipendente) — il giorno finirebbe con l'intestazione subito
// sotto il giorno precedente ma i suoi piatti molto più in basso, dopo
// un'intera riga di piatti di altri giorni: sembra un bug anche se i dati
// ci sono. Ogni colonna ha una larghezza minima leggibile; se lo schermo è
// più stretto della somma delle 7, il contenitore scorre in orizzontale
// invece di ridurre il numero di colonne.
//
// Colonna in più a sinistra ("Colazione"/"Pranzo"/"Cena"): etichetta il
// pasto una sola volta per riga invece che ripeterlo in ogni card (vedi
// meal-card.tsx, eyebrow rimossa in versione compatta) — a larghezza fissa,
// non minmax, perché il suo contenuto è breve e non deve competere per lo
// spazio con le colonne dei giorni.
const DESKTOP_GRID = "grid grid-cols-[5.5rem_repeat(7,minmax(11rem,1fr))] gap-4";

export function WeeklyMenuView({
  meals,
  weekStartDate,
  pendingApprovalHint,
}: {
  meals: Meal[];
  /** Lunedì della settimana mostrata ("YYYY-MM-DD"): se coincide con la
   * settimana corrente, i giorni già passati vengono nascosti (non ha senso
   * mostrare lunedì-venerdì se oggi è sabato). Per le altre settimane
   * (future o storiche) si vede sempre l'intera settimana. */
  weekStartDate?: string;
  pendingApprovalHint?: boolean;
}) {
  const allDays = groupMealsByDay(meals);
  const todayISO = format(new Date(), "yyyy-MM-dd");
  const currentWeekMonday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const isCurrentWeek = weekStartDate === currentWeekMonday;
  const days = isCurrentWeek ? allDays.filter((d) => d.date >= todayISO) : allDays;
  const { role } = useCurrentUser();
  const canEdit = canEditMenu(role);

  if (allDays.length === 0) {
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
          Attiva fino a "lg" (1024px): sotto quella soglia una griglia a più
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

      {/* Vista desktop: una vera griglia (riga = pasto, colonna = giorno),
          tutta dentro un UNICO contenitore che scorre in orizzontale: così
          intestazioni e righe pasto restano sempre allineate tra loro,
          qualunque sia la larghezza dello schermo (mai un "a capo" separato
          riga per riga che le disallinea). Le card di una stessa riga
          (tutte le colazioni, tutti i pranzi, tutte le cene) hanno anche
          automaticamente la stessa altezza, dettata da CSS Grid. */}
      <div className="hidden overflow-x-auto lg:block">
        <div className={DESKTOP_GRID}>
          {/* Cella d'angolo: sotto ci sono le etichette di riga ("Colazione"/"Pranzo"/"Cena"),
              qui basta un richiamo leggero a cosa rappresenta quella colonna. */}
          <div className="flex items-end p-3">
            <span className="text-eyebrow text-muted-foreground">Pasto</span>
          </div>
          {days.map(({ day, date }) => {
            const isToday = date === todayISO;
            return (
              <div key={date} className={cn("rounded-md p-3", isToday ? "bg-crimson-muted" : "bg-secondary/40")}>
                <h2 className="font-display text-base font-semibold">{WEEKDAY_LABELS[day]}</h2>
                <span className="mt-0.5 block font-sans text-xs font-normal text-muted-foreground">
                  {formatDateDisplay(date)}
                </span>
              </div>
            );
          })}
        </div>

        {SLOT_ORDER.map((slot) => (
          <div key={slot} className={cn(DESKTOP_GRID, "mt-3")}>
            {/* Etichetta di riga: si allunga automaticamente (comportamento di
                default di CSS Grid) fino all'altezza della card più alta della
                riga, restando centrata al suo interno — non serve più ripetere
                lo slot dentro ogni card (vedi meal-card.tsx). */}
            <div className="flex flex-col items-center justify-center gap-0.5 rounded-md border-r-2 border-border/60 pr-2 text-center">
              <span className="font-display text-sm font-semibold text-foreground">{MEAL_SLOT_LABELS[slot]}</span>
            </div>
            {days.map(({ day, date, meals: dayMeals }) => {
              const slotMeals = dayMeals.filter((m) => m.slot === slot);
              if (slotMeals.length === 0) {
                // Nessun pasto in questo slot per questo giorno (tipicamente
                // il pranzo nei giorni feriali): una cella "vuota" esplicita,
                // non semplicemente bianca, per mantenere l'allineamento
                // della riga senza sembrare un contenuto mancante per errore.
                // self-start: non si allunga per riempire l'altezza della
                // riga (che resta quella della card più alta, es. il pranzo
                // del weekend) — resta compatta, non ha bisogno di più spazio.
                //
                // Per il pranzo, che non viene mai generato automaticamente
                // nei giorni feriali (§5), la cella vuota è anche il punto in
                // cui aggiungerlo: stesso dialogo del bottone "Aggiungi
                // pranzo" in cima alla pagina, ma già a conoscenza di giorno e
                // data, così non serve riselezionarli.
                const placeholderClass =
                  "flex h-fit w-full items-center justify-center self-start rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground";
                if (slot === "pranzo" && canEdit) {
                  // <button>, non <div>: deve restare raggiungibile e attivabile
                  // da tastiera come qualsiasi altro trigger di dialogo.
                  return (
                    <AddManualLunchDialog
                      key={`${date}-${slot}`}
                      day={day}
                      date={date}
                      trigger={
                        <button
                          type="button"
                          className={cn(placeholderClass, "cursor-pointer transition-colors hover:border-crimson/50 hover:text-crimson")}
                        >
                          <span className="flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Aggiungi pranzo
                          </span>
                        </button>
                      }
                    />
                  );
                }
                return (
                  <div key={`${date}-${slot}`} className={placeholderClass}>
                    {MEAL_SLOT_LABELS[slot]}: nessuno
                  </div>
                );
              }
              return (
                <div key={`${date}-${slot}`} className="space-y-3">
                  {slotMeals.map((meal) => (
                    <MealCard key={meal.id} meal={meal} compact />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
