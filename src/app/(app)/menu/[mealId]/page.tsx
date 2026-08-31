"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowLeft, ChefHat, MessageSquare } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canEditMenu, canViewOperationalNotes } from "@/lib/auth/permissions";
import { MEAL_SLOT_LABELS, WEEKDAY_LABELS, type MealFeedbackTag } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MealAttendanceForm } from "@/components/meal/meal-attendance-form";
import { MealFeedbackForm } from "@/components/meal/meal-feedback-form";

export default function MealDetailPage() {
  const params = useParams<{ mealId: string }>();
  const meals = useAppStore((s) => s.meals);
  const members = useAppStore((s) => s.members);
  const updateMealAttendance = useAppStore((s) => s.updateMealAttendance);
  const addMealNote = useAppStore((s) => s.addMealNote);
  const submitMealFeedback = useAppStore((s) => s.submitMealFeedback);
  const { user, role } = useCurrentUser();

  const meal = meals.find((m) => m.id === params.mealId);
  const [note, setNote] = React.useState(meal?.familyNote ?? "");

  if (!meal) return notFound();
  const recipe = meal.recipeSnapshot;
  const canEdit = canEditMenu(role);
  const canSeeNotes = canViewOperationalNotes(role);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/menu" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Torna al menu
      </Link>

      <div>
        <p className="text-eyebrow">
          {WEEKDAY_LABELS[meal.day]} · {MEAL_SLOT_LABELS[meal.slot]}
        </p>
        <h1 className="font-display text-3xl font-semibold">
          {recipe?.imageEmoji} {recipe?.name}
        </h1>
        {meal.isManuallyAdded && <Badge variant="secondary" className="mt-2">Aggiunto manualmente</Badge>}
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/menu/${meal.id}/ricetta`}>Apri ricetta</Link>
        </Button>
        {canEdit && (
          <Button asChild variant="subtle" size="sm">
            <Link href={`/menu/${meal.id}/alternative`}>
              <ChefHat className="mr-1.5 h-3.5 w-3.5" /> Cambia piatto
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Chi c'è a questo pasto</CardTitle>
        </CardHeader>
        <CardContent>
          <MealAttendanceForm
            meal={meal}
            members={members}
            onSave={(attendance) => user && updateMealAttendance(meal.id, attendance, user.id)}
          />
        </CardContent>
      </Card>

      {canSeeNotes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-4 w-4" /> Indicazioni familiari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. Serviamo prima gli antipasti, oppure orario diverso dal solito." />
            <Button size="sm" onClick={() => user && addMealNote(meal.id, note, "family", user.id)}>
              Salva nota
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Come è andata?</CardTitle>
        </CardHeader>
        <CardContent>
          <MealFeedbackForm
            onSubmit={(tags: MealFeedbackTag[], feedbackNote) => user && submitMealFeedback(meal.id, tags, feedbackNote, user.id)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
