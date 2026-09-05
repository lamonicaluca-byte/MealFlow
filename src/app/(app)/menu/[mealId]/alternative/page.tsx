"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { MealChangeReason } from "@/types/domain";
import type { MealAlternative } from "@/lib/services/menu-generation/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const REASON_OPTIONS: Array<{ value: MealChangeReason; label: string }> = [
  { value: "non_piace", label: "Non piace" },
  { value: "mangiato_recentemente", label: "Mangiato di recente" },
  { value: "troppo_lungo", label: "Troppo lungo da preparare" },
  { value: "ingrediente_non_disponibile", label: "Ingrediente non disponibile" },
  { value: "non_gradito_bambina", label: "Non gradito da Amelia" },
  { value: "preferiamo_altro", label: "Preferiamo altro" },
  { value: "altro", label: "Altro" },
];

export default function MealAlternativesPage() {
  const params = useParams<{ mealId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const meals = useAppStore((s) => s.meals);
  const getMealAlternatives = useAppStore((s) => s.getMealAlternatives);
  const replaceMeal = useAppStore((s) => s.replaceMeal);
  const { user } = useCurrentUser();

  const meal = meals.find((m) => m.id === params.mealId);
  const [reason, setReason] = React.useState<MealChangeReason | undefined>(undefined);
  const [alternatives, setAlternatives] = React.useState<MealAlternative[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(
    async (currentReason?: MealChangeReason) => {
      setLoading(true);
      const results = await getMealAlternatives(params.mealId, currentReason);
      setAlternatives(results);
      setLoading(false);
    },
    [getMealAlternatives, params.mealId],
  );

  React.useEffect(() => {
    void load(reason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.mealId]);

  if (!meal) return notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/menu/${meal.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Torna al pasto
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold">Cambia piatto</h1>
        <p className="text-sm text-muted-foreground">
          Proposta attuale: <strong>{meal.recipeSnapshot?.name}</strong>
        </p>
      </div>

      <div className="max-w-xs space-y-1.5">
        <Label>Perché vuoi cambiarlo? (facoltativo)</Label>
        <Select
          value={reason}
          onValueChange={(v) => {
            const next = v as MealChangeReason;
            setReason(next);
            void load(next);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona un motivo" />
          </SelectTrigger>
          <SelectContent>
            {REASON_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alternatives.map((alt) => (
            // flex + h-full: dentro una griglia CSS le card si allungano già
            // per pareggiare l'altezza della più alta della riga, ma senza
            // flex-col il contenuto resta ancorato in alto lasciando lo
            // spazio in più in fondo — così invece "Scegli questo piatto"
            // resta sempre allineato allo stesso bordo inferiore.
            <Card key={`${alt.kind}-${alt.recipe.id}`} className="flex h-full flex-col">
              <CardHeader className="pb-2">
                <Badge variant="maiolica" className="mb-1.5 w-fit">
                  {alt.label}
                </Badge>
                <CardTitle className="text-lg">
                  {alt.recipe.imageEmoji} {alt.recipe.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
                <p>{alt.recipe.description}</p>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {alt.recipe.prepMinutes + alt.recipe.cookMinutes} min
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    if (!user) return;
                    replaceMeal(meal.id, alt, reason, undefined, user.id, user.displayName);
                    toast({ title: "Piatto sostituito", description: `${alt.recipe.name} è stato applicato al menu.` });
                    router.push(`/menu/${meal.id}`);
                  }}
                >
                  Scegli questo piatto
                </Button>
              </CardFooter>
            </Card>
          ))}
          {alternatives.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              Nessuna alternativa compatibile con le allergie della famiglia è stata trovata.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
