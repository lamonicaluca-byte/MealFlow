"use client";

import * as React from "react";

import type { HouseholdMember, Meal, MealAttendanceType } from "@/types/domain";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ATTENDANCE_OPTIONS: Array<{ value: MealAttendanceType; label: string }> = [
  { value: "tutti_presenti", label: "Tutti presenti" },
  { value: "assenze_parziali", label: "Una o più persone assenti" },
  { value: "ospiti", label: "Ospiti" },
  { value: "fuori_casa", label: "Pasto fuori casa" },
  { value: "viaggio", label: "Viaggio" },
  { value: "gia_organizzato", label: "Pasto già organizzato" },
  { value: "avanzi", label: "Utilizzo degli avanzi" },
  { value: "nessuna_preparazione", label: "Nessuna preparazione necessaria" },
];

export function MealAttendanceForm({
  meal,
  members,
  onSave,
}: {
  meal: Meal;
  members: HouseholdMember[];
  onSave: (attendance: Meal["attendance"]) => void;
}) {
  const [type, setType] = React.useState<MealAttendanceType>(meal.attendance.type);
  const [absentIds, setAbsentIds] = React.useState<string[]>(meal.attendance.absentMemberIds);
  const [guestsCount, setGuestsCount] = React.useState(meal.attendance.guestsCount);
  const [guestsNote, setGuestsNote] = React.useState(meal.attendance.guestsNote ?? "");

  return (
    <div className="space-y-4">
      <RadioGroup value={type} onValueChange={(v) => setType(v as MealAttendanceType)}>
        {ATTENDANCE_OPTIONS.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem value={opt.value} id={`att-${opt.value}`} />
            <Label htmlFor={`att-${opt.value}`} className="font-normal">
              {opt.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {type === "assenze_parziali" && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Chi è assente?</p>
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <Checkbox
                id={`member-${m.id}`}
                checked={absentIds.includes(m.id)}
                onCheckedChange={(checked) =>
                  setAbsentIds((prev) => (checked ? [...prev, m.id] : prev.filter((id) => id !== m.id)))
                }
              />
              <Label htmlFor={`member-${m.id}`} className="font-normal">
                {m.displayName}
              </Label>
            </div>
          ))}
        </div>
      )}

      {type === "ospiti" && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <Label htmlFor="guestsCount">Quanti ospiti?</Label>
          <Input
            id="guestsCount"
            type="number"
            min={0}
            value={guestsCount}
            onChange={(e) => setGuestsCount(Number(e.target.value))}
          />
          <Label htmlFor="guestsNote">Nota (facoltativa)</Label>
          <Input id="guestsNote" value={guestsNote} onChange={(e) => setGuestsNote(e.target.value)} placeholder="Es. allergie ospiti, orario" />
        </div>
      )}

      <Button
        onClick={() =>
          onSave({
            type,
            absentMemberIds: type === "assenze_parziali" ? absentIds : [],
            guestsCount: type === "ospiti" ? guestsCount : 0,
            guestsNote: type === "ospiti" ? guestsNote || null : null,
          })
        }
      >
        Salva commensali
      </Button>
    </div>
  );
}
