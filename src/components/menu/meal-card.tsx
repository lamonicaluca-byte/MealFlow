"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChefHat,
  Clock,
  Flame,
  Home,
  Info,
  MessageCircle,
  MoreVertical,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

import type { Meal } from "@/types/domain";
import { MEAL_SLOT_LABELS, WEEKDAY_LABELS } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
const MAX_COMPACT_ALLERGENS = 2;

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
  const visibleAllergens = compact ? recipe.allergens.slice(0, MAX_COMPACT_ALLERGENS) : recipe.allergens;
  const hiddenAllergensCount = compact ? recipe.allergens.length - visibleAllergens.length : 0;
  const hasIndicators = Boolean(meal.childAdaptationNote) || Boolean(meal.chalikaNote) || Boolean(meal.familyNote);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-4 shadow-editorial transition-shadow hover:shadow-editorial-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-eyebrow">
            {WEEKDAY_LABELS[meal.day]} · {MEAL_SLOT_LABELS[meal.slot]}
          </p>
          <h3 className={cn("font-display font-semibold leading-snug", compact ? "text-lg" : "text-xl")}>
            <span className="mr-1.5 text-2xl">{recipe.imageEmoji}</span>
            {recipe.name}
          </h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Azioni pasto" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push(`/menu/${meal.id}`)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Modifica commensali / note
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
      </div>

      {visibleAllergens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleAllergens.map((a) => (
            <Badge key={a} variant="warning">
              {a}
            </Badge>
          ))}
          {hiddenAllergensCount > 0 && <Badge variant="warning">+{hiddenAllergensCount}</Badge>}
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
            {meal.familyNote && <IndicatorIcon icon={Info} label={meal.familyNote} className="text-crimson" />}
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

          {meal.familyNote && (
            <p className="rounded-md bg-crimson-muted px-3 py-2 text-xs text-crimson">{meal.familyNote}</p>
          )}
        </>
      )}

      <div className="flex gap-2 pt-1">
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
    </div>
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
