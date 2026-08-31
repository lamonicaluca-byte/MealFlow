"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import type { Meal, Weekday } from "@/types/domain";
import { WEEKDAY_LABELS } from "@/types/domain";
import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Permette di aggiungere manualmente un pranzo nei giorni feriali (§5): non
 * viene mai generato automaticamente, ma resta sempre possibile aggiungerlo.
 */
export function AddManualLunchDialog({ weekdayMeals }: { weekdayMeals: Meal[] }) {
  const [open, setOpen] = React.useState(false);
  const [day, setDay] = React.useState<Weekday>("lunedi");
  const [dishName, setDishName] = React.useState("");
  const addManualMeal = useAppStore((s) => s.addManualMeal);
  const { user } = useCurrentUser();

  const weekdayOptions = weekdayMeals.filter((m) => m.day !== "sabato" && m.day !== "domenica");
  const uniqueDays = Array.from(new Map(weekdayOptions.map((m) => [m.day, m])).values());

  const onSubmit = () => {
    const reference = uniqueDays.find((m) => m.day === day);
    if (!reference || !dishName.trim() || !user) return;
    addManualMeal(day, reference.date, "pranzo", dishName.trim(), user.id);
    setDishName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Aggiungi pranzo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi un pranzo</DialogTitle>
          <DialogDescription>
            Nei giorni feriali il pranzo non viene generato automaticamente: puoi aggiungerlo quando serve.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Giorno</Label>
            <Select value={day} onValueChange={(v) => setDay(v as Weekday)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uniqueDays.map((m) => (
                  <SelectItem key={m.day} value={m.day}>
                    {WEEKDAY_LABELS[m.day]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dishName">Cosa si mangia</Label>
            <Input id="dishName" value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="Es. Pasta al pomodoro" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button onClick={onSubmit} disabled={!dishName.trim()}>
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
