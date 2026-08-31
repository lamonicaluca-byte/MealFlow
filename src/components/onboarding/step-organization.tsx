"use client";

import { useAppStore } from "@/store/app-store";
import { WEEKDAYS, WEEKDAY_LABELS, type Weekday } from "@/types/domain";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StepOrganization() {
  const household = useAppStore((s) => s.household);
  const updateHouseholdSettings = useAppStore((s) => s.updateHouseholdSettings);

  if (!household) return null;
  const { settings } = household;

  const toggleChalikaDay = (day: Weekday, checked: boolean) => {
    const next = checked ? [...settings.chalikaCookingDays, day] : settings.chalikaCookingDays.filter((d) => d !== day);
    updateHouseholdSettings({ chalikaCookingDays: next });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>Giorno abituale della spesa</Label>
        <Select value={settings.shoppingDay} onValueChange={(v) => updateHouseholdSettings({ shoppingDay: v as Weekday })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEKDAYS.map((d) => (
              <SelectItem key={d} value={d}>
                {WEEKDAY_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Giorni in cui cucina Chalika</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WEEKDAYS.map((d) => (
            <div key={d} className="flex items-center gap-2">
              <Checkbox
                id={`chalika-${d}`}
                checked={settings.chalikaCookingDays.includes(d)}
                onCheckedChange={(checked) => toggleChalikaDay(d, Boolean(checked))}
              />
              <Label htmlFor={`chalika-${d}`} className="font-normal">
                {WEEKDAY_LABELS[d]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="prep-weekday">Tempo max preparazione (feriali, min)</Label>
          <Input
            id="prep-weekday"
            type="number"
            min={5}
            value={settings.maxPrepMinutesWeekday}
            onChange={(e) => updateHouseholdSettings({ maxPrepMinutesWeekday: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prep-weekend">Tempo max preparazione (weekend, min)</Label>
          <Input
            id="prep-weekend"
            type="number"
            min={5}
            value={settings.maxPrepMinutesWeekend}
            onChange={(e) => updateHouseholdSettings({ maxPrepMinutesWeekend: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Livello di budget</Label>
        <Select
          value={settings.budgetLevel}
          onValueChange={(v) => updateHouseholdSettings({ budgetLevel: v as typeof settings.budgetLevel })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="essenziale">Essenziale</SelectItem>
            <SelectItem value="equilibrato">Equilibrato</SelectItem>
            <SelectItem value="senza_pensieri">Senza pensieri</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
