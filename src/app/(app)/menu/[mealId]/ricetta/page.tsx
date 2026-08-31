"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, Clock, Flame, Sparkles } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const DIFFICULTY_LABEL: Record<string, string> = { facile: "Facile", media: "Media", impegnativa: "Impegnativa" };

export default function RecipeDetailPage() {
  const params = useParams<{ mealId: string }>();
  const meals = useAppStore((s) => s.meals);
  const explainMeal = useAppStore((s) => s.explainMeal);
  const [explanation, setExplanation] = React.useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = React.useState(false);

  const meal = meals.find((m) => m.id === params.mealId);
  if (!meal || !meal.recipeSnapshot) return notFound();
  const recipe = meal.recipeSnapshot;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/menu/${meal.id}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Torna al pasto
      </Link>

      <div>
        <h1 className="font-display text-4xl font-semibold">
          {recipe.imageEmoji} {recipe.name}
        </h1>
        <p className="mt-2 text-muted-foreground">{recipe.description}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {recipe.mediterraneanTags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {recipe.isVegetarian && <Badge variant="success">Vegetariana</Badge>}
        {recipe.isQuickUnder20 && <Badge variant="maiolica">Sotto i 20 minuti</Badge>}
        {recipe.canPrepareAhead && <Badge variant="outline">Anticipabile</Badge>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Clock} label="Preparazione" value={`${recipe.prepMinutes} min`} />
        <StatTile icon={Clock} label="Cottura" value={`${recipe.cookMinutes} min`} />
        <StatTile icon={Flame} label="Difficoltà" value={DIFFICULTY_LABEL[recipe.difficulty] ?? recipe.difficulty} />
      </div>

      {recipe.allergens.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap gap-1.5 pt-5">
            <span className="text-xs font-medium text-muted-foreground">Allergeni: </span>
            {recipe.allergens.map((a) => (
              <Badge key={a} variant="warning">
                {a}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 font-display text-xl font-semibold">Ingredienti</h2>
        <ul className="space-y-1.5">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex items-center justify-between border-b border-border/60 py-1.5 text-sm">
              <span>
                {ing.name} {ing.optional && <span className="text-xs text-muted-foreground">(facoltativo)</span>}
              </span>
              <span className="text-muted-foreground">
                {ing.quantity ? `${ing.quantity} ${ing.unit ?? ""}` : ing.unit === "q.b." ? "q.b." : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      <div>
        <h2 className="mb-2 font-display text-xl font-semibold">Preparazione</h2>
        <ol className="space-y-2.5">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crimson-muted text-xs font-semibold text-crimson">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingExplanation}
            onClick={async () => {
              setLoadingExplanation(true);
              const text = await explainMeal(meal.id);
              setExplanation(text);
              setLoadingExplanation(false);
            }}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Perché è stato scelto questo piatto?
          </Button>
          {explanation && <p className="text-sm text-muted-foreground">{explanation}</p>}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        MealFlow offre un supporto organizzativo basato su principi generali di sana alimentazione. Non sostituisce le
        indicazioni del medico, del pediatra o di un professionista della nutrizione.
      </p>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-crimson" />
      <p className="font-display text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
