"use client";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { SHOPPING_CATEGORY_LABELS, type PantryAvailability } from "@/types/domain";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddPantryItemDialog } from "@/components/pantry/add-pantry-item-dialog";

const AVAILABILITY_LABEL: Record<PantryAvailability, string> = {
  disponibile: "Disponibile",
  quasi_finito: "Quasi finito",
  da_ricomprare: "Da ricomprare",
};

export function StepPantry() {
  const pantryItems = useAppStore((s) => s.pantryItems);
  const updatePantryAvailability = useAppStore((s) => s.updatePantryAvailability);
  const { user } = useCurrentUser();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Segna cosa avete già in casa tra gli ingredienti di base: olio, sale, spezie, pasta, riso, passata, farina,
        legumi, prodotti per la colazione, surgelati.
      </p>
      <div className="space-y-2">
        {pantryItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">{SHOPPING_CATEGORY_LABELS[item.category]}</p>
            </div>
            <Select
              value={item.availability}
              onValueChange={(v) => user && updatePantryAvailability(item.id, v as PantryAvailability, user.id)}
            >
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AVAILABILITY_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <AddPantryItemDialog />
    </div>
  );
}
