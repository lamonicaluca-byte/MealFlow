"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  ChefHat,
  Clock,
  Flame,
  Home,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

import type { Meal } from "@/types/domain";
import { MEAL_SLOT_LABELS, WEEKDAY_LABELS } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canEditMenu } from "@/lib/auth/permissions";

const DIFFICULTY_LABEL: Record<string, string> = { facile: "Facile", media: "Media", impegnativa: "Impegnativa" };

/** Icona indicatore con etichetta accessibile (tooltip nativo + screen reader). */
function IndicatorIcon({
  icon: Icon,
  label,
  className,
}: {
  icon: React.ElementType;
  label: string;
  className?: string;
}) {
  return (
    <span title={label} aria-label={label} className="inline-flex">
      <Icon className={cn("h-4 w-4", className)} />
    </span>
  );
}

export function MealCard({ meal, compact = false }: { meal: Meal; compact?: boolean }) {
  const router = useRouter();
  const { role, user } = useCurrentUser();
  const regenerateMeal = useAppStore((s) => s.regenerateMeal);
  const markMealOut = useAppStore((s) => s.markMealOut);
  const deleteManualMeal = useAppStore((s) => s.deleteManualMeal);

  const recipe = meal.recipeSnapshot;
  const canEdit = canEditMenu(role);
  const isOut = meal.attendance.type === "fuori_casa";

  if (!recipe) return null;

  const mainIngredients = recipe.ingredients.slice(0, 4).map((i) => i.name);
  const hasIndicators = Boolean(meal.childAdaptationNote) || Boolean(meal.chalikaNote);

  return (
    <Card
      className={cn(
        "flex flex-col transition-shadow hover:shadow-editorial-lg",
        compact ? "gap-2 p-3" : "gap-2.5 p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {/* In versione compatta il giorno è già nell'intestazione della colonna: qui basta lo slot. */}
          <p className="text-eyebrow">{compact ? MEAL_SLOT_LABELS[meal.slot] : `${WEEKDAY_LABELS[meal.day]} · ${MEAL_SLOT_LABELS[meal.slot]}`}</p>
          {/* L'emoji è un elemento fratello, non dentro l'h3: se stesse
              dentro il blocco troncato (line-clamp), in una colonna stretta
              "ruba" da sola un'intera riga delle 2 disponibili, lasciando
              quasi nulla per il nome vero del piatto. */}
          <div className="flex items-start gap-1.5">
            <span className={cn("shrink-0 leading-none", compact ? "text-base" : "text-2xl")}>{recipe.imageEmoji}</span>
            <h3
              title={compact ? recipe.name : undefined}
              className={cn(
                "min-w-0 font-display font-semibold",
                compact ? "line-clamp-2 text-sm leading-snug" : "text-xl leading-snug",
              )}
            >
              {recipe.name}
            </h3>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Azioni pasto" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* La pagina di dettaglio pasto oggi contiene solo azioni ricetta e il
                feedback: l'etichetta riflette questo, non promette più
                "commensali/note" (rimossi, vedi commit precedente). */}
            <DropdownMenuItem onSelect={() => router.push(`/menu/${meal.id}`)}>
              <MessageSquare className="mr-2 h-3.5 w-3.5" /> Dettagli e feedback
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onSelect={() => router.push(`/menu/${meal.id}/alternative`)}>
                <ChefHat className="mr-2 h-3.5 w-3.5" /> Cambia piatto
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onSelect={() => user && regenerateMeal(meal.id, user.id, user.displayName)}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Rigenera
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onSelect={() => user && markMealOut(meal.id, user.id)}>
                <Home className="mr-2 h-3.5 w-3.5" /> Segna come pasto fuori
              </DropdownMenuItem>
            )}
            {meal.isManuallyAdded && canEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => user && deleteManualMeal(meal.id, user.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Elimina pasto aggiunto
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!compact && <p className="text-sm text-muted-foreground">{recipe.description}</p>}

      {isOut && (
        <Badge variant="secondary" className="w-fit">
          Pasto fuori casa
        </Badge>
      )}

      {!compact && mainIngredients.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Ingredienti principali: </span>
          {mainIngredients.join(", ")}
        </p>
      )}

      {/* Riga meta: in versione compatta solo l'essenziale (tempo e difficoltà), il resto nel dettaglio. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {recipe.prepMinutes + recipe.cookMinutes} min
        </span>
        <span className="flex items-center gap-1">
          <Flame className="h-3.5 w-3.5" /> {DIFFICULTY_LABEL[recipe.difficulty]}
        </span>
        {!compact && recipe.canPrepareAhead && (
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" /> Anticipabile
          </span>
        )}
        {/* Compatto: un'icona con conteggio invece di un badge per allergene, per non occupare una riga intera in una colonna stretta (elenco completo nel tooltip). */}
        {compact && recipe.allergens.length > 0 && (
          <span
            className="flex items-center gap-1 text-warning"
            title={`Allergeni: ${recipe.allergens.join(", ")}`}
            aria-label={`Allergeni: ${recipe.allergens.join(", ")}`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> {recipe.allergens.length}
          </span>
        )}
      </div>

      {!compact && recipe.allergens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recipe.allergens.map((a) => (
            <Badge key={a} variant="warning">
              {a}
            </Badge>
          ))}
        </div>
      )}

      {compact ? (
        // Versione compatta (griglia desktop): indicatori a icona invece di badge/paragrafi estesi,
        // per non appesantire una colonna stretta. Il dettaglio testuale resta a un clic di distanza.
        hasIndicators && (
          <div className="flex flex-wrap items-center gap-2.5 text-muted-foreground">
            {meal.childAdaptationNote && (
              <IndicatorIcon icon={Sparkles} label={meal.childAdaptationNote} className="text-crimson" />
            )}
            {meal.chalikaNote && (
              <IndicatorIcon icon={MessageCircle} label={`Nota per Chalika: ${meal.chalikaNote}`} className="text-maiolica" />
            )}
          </div>
        )
      ) : (
        <>
          {meal.childAdaptationNote && (
            <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
              <Sparkles className="mr-1 inline h-3 w-3 text-crimson" /> {meal.childAdaptationNote}
            </p>
          )}

          {meal.chalikaNote && (
            <p className="rounded-md bg-maiolica/10 px-3 py-2 text-xs text-foreground">
              <span className="font-medium">Nota per Chalika: </span>
              {meal.chalikaNote}
            </p>
          )}
        </>
      )}

      {/* mt-auto: se la card viene allungata da CSS Grid per pareggiare
          l'altezza delle altre nella stessa riga (griglia desktop), lo
          spazio in più va qui, non a spaccare il resto del contenuto: il
          pulsante resta sempre ancorato in fondo. */}
      <div className="mt-auto flex gap-2 pt-1">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={`/menu/${meal.id}/ricetta`}>Apri ricetta</Link>
        </Button>
        {/* "Cambia piatto" resta disponibile dal menu ⋮ in versione compatta, per non aggiungere un secondo bottone a piena larghezza in una colonna stretta. */}
        {!compact && canEdit && (
          <Button asChild size="sm" variant="subtle" className="flex-1">
            <Link href={`/menu/${meal.id}/alternative`}>Cambia piatto</Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

export function MealCardSkeletonRow({ count = 3 }: { count?: number }) {
  return (
    <div className={cn("grid gap-3", "sm:grid-cols-2 lg:grid-cols-3")}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-56 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
