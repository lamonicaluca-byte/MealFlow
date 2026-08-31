"use client";

import { useAppStore } from "@/store/app-store";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagListInput } from "./tag-list-input";

export function StepPreferences() {
  const preferences = useAppStore((s) => s.preferences);
  const household = useAppStore((s) => s.household);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const updateHouseholdSettings = useAppStore((s) => s.updateHouseholdSettings);

  if (!preferences || !household) return null;

  return (
    <div className="space-y-4">
      <TagListInput
        label="Piatti preferiti"
        values={preferences.favoriteDishes}
        onCommit={(v) => updatePreferences({ favoriteDishes: v })}
      />
      <TagListInput
        label="Piatti non graditi"
        values={preferences.dislikedDishes}
        onCommit={(v) => updatePreferences({ dislikedDishes: v })}
      />
      <TagListInput
        label="Verdure gradite"
        values={preferences.favoriteVegetables}
        onCommit={(v) => updatePreferences({ favoriteVegetables: v })}
      />
      <TagListInput
        label="Pesci graditi"
        values={preferences.favoriteFish}
        onCommit={(v) => updatePreferences({ favoriteFish: v })}
      />
      <TagListInput
        label="Legumi graditi"
        values={preferences.favoriteLegumes}
        onCommit={(v) => updatePreferences({ favoriteLegumes: v })}
      />
      <TagListInput
        label="Colazioni preferite"
        values={preferences.favoriteBreakfasts}
        onCommit={(v) => updatePreferences({ favoriteBreakfasts: v })}
      />
      <div className="space-y-1.5">
        <Label>Varietà desiderata</Label>
        <Select
          value={household.settings.varietyLevel}
          onValueChange={(v) => updateHouseholdSettings({ varietyLevel: v as typeof household.settings.varietyLevel })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="abitudinaria">Abitudinaria: preferiamo i soliti piatti</SelectItem>
            <SelectItem value="equilibrata">Equilibrata: un mix di conosciuto e nuovo</SelectItem>
            <SelectItem value="esplorativa">Esplorativa: ci piace provare piatti nuovi</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
