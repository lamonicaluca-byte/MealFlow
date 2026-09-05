"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Bell, CalendarClock, ChefHat, ChevronRight, ListChecks, ShoppingCart, Sparkles, Users } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getMealsForVersion, getNextMeal } from "@/lib/selectors/menu-selectors";
import { computeHomePriority } from "@/lib/home/home-priority";
import { MEAL_SLOT_LABELS, WEEKDAY_LABELS } from "@/types/domain";
import { canViewOperationalNotes } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const PRIORITY_COPY: Record<string, { title: string; description: string; href: string; cta: string }> = {
  review_menu: {
    title: "Il menu della prossima settimana è pronto",
    description: "Bastano pochi minuti per controllarlo.",
    href: "/menu/approvazione",
    cta: "Controlla il menu",
  },
  approval_pending: {
    title: "Approvazione ancora in attesa",
    description: "Il menu della prossima settimana aspetta ancora un'approvazione.",
    href: "/menu/approvazione",
    cta: "Approva ora",
  },
  shopping_missing: {
    title: "Oggi è il giorno della spesa",
    description: "Alcuni prodotti sono ancora da acquistare.",
    href: "/spesa",
    cta: "Vai alla lista",
  },
  next_week: {
    title: "Si comincia una nuova settimana",
    description: "Dai un'occhiata a come si presenta.",
    href: "/menu",
    cta: "Vedi il menu",
  },
  next_meal: {
    title: "Prossimo pasto",
    description: "",
    href: "/menu",
    cta: "Vedi il menu",
  },
};

export default function HomePage() {
  const household = useAppStore((s) => s.household);
  const weeklyMenus = useAppStore((s) => s.weeklyMenus);
  const meals = useAppStore((s) => s.meals);
  const shoppingListItems = useAppStore((s) => s.shoppingListItems);
  const notes = useAppStore((s) => s.notes);
  const { user, role } = useCurrentUser();

  const now = React.useMemo(() => new Date(), []);
  const currentMenu = [...weeklyMenus].sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))[0];
  const nextWeekMenu = weeklyMenus.find((m) => m.status === "pending_approval" || m.status === "generated");
  const approvedMenu = weeklyMenus.find((m) => m.status === "approved" || m.status === "modified_after_approval");

  const currentMeals = approvedMenu ? getMealsForVersion(meals, approvedMenu.currentVersionId) : [];
  const nextMeal = getNextMeal(currentMeals, now);

  const boughtCount = shoppingListItems.filter((i) => i.status === "comprato").length;
  const totalCount = shoppingListItems.length;
  const missingCount = shoppingListItems.filter((i) => i.status === "da_comprare" || i.status === "da_verificare").length;

  const priority = computeHomePriority({
    now,
    shoppingDay: household?.settings.shoppingDay ?? "sabato",
    hasPendingApprovalForNextWeek: Boolean(nextWeekMenu),
    hasItemsLeftToBuy: missingCount > 0,
  });
  const copy = PRIORITY_COPY[priority.kind]!;

  const canSeeNotes = canViewOperationalNotes(role);
  const chalikaUpdates = notes.filter((n) => n.authorName === "Chalika").slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-eyebrow capitalize">{format(now, "EEEE d MMMM", { locale: it })}</p>
        <h1 className="font-display text-3xl font-semibold">Ciao {user?.displayName?.split(" ")[0]}</h1>
      </div>

      <Card className="border-crimson/30 bg-crimson-muted/40">
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-foreground">{copy.title}</p>
            {priority.kind === "next_meal" && nextMeal ? (
              <p className="text-sm text-muted-foreground">
                {WEEKDAY_LABELS[nextMeal.day]} · {MEAL_SLOT_LABELS[nextMeal.slot]}: <strong>{nextMeal.recipeSnapshot?.name}</strong>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.description}</p>
            )}
          </div>
          <Button asChild size="sm">
            <Link href={priority.kind === "next_meal" && nextMeal ? `/menu/${nextMeal.id}` : copy.href}>
              {copy.cta} <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <ShoppingCart className="h-4 w-4 text-crimson" /> Lista della spesa
              </p>
              <Link href="/spesa" className="text-xs text-crimson hover:underline">
                Apri
              </Link>
            </div>
            {totalCount > 0 ? (
              <>
                <p className="font-display text-lg">
                  {boughtCount} PRODOTTI ACQUISTATI SU {totalCount}
                </p>
                <Progress value={(boughtCount / totalCount) * 100} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nessuna lista attiva al momento.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-5">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <ChefHat className="h-4 w-4 text-crimson" /> Stato del menu
            </p>
            <div className="flex flex-wrap gap-2">
              {currentMenu && (
                <Badge variant="secondary">Settimana del {currentMenu.weekStartDate}</Badge>
              )}
              {nextWeekMenu && <Badge variant="warning">Da approvare</Badge>}
            </div>
            <Link href="/menu" className="text-xs text-crimson hover:underline">
              Vedi il menu completo
            </Link>
          </CardContent>
        </Card>
      </div>

      {canSeeNotes && chalikaUpdates.length > 0 && (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-crimson" /> Aggiornamenti di Chalika
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {chalikaUpdates.map((n) => (
                <li key={n.id}>{n.text}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Accessi rapidi</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickLink href="/calendario" label="Calendario" icon={CalendarClock} />
          <QuickLink href="/storico" label="Storico" icon={ListChecks} />
          <QuickLink href="/profili" label="Profili" icon={Users} />
          <QuickLink href="/notifiche" label="Notifiche" icon={Bell} />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-4 text-center text-xs font-medium transition-colors hover:border-crimson/40"
    >
      <Icon className="h-5 w-5 text-crimson" />
      {label}
    </Link>
  );
}
