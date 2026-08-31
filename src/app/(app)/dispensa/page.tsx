"use client";

import { Trash2 } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canMarkPantryItems } from "@/lib/auth/permissions";
import type { PantryAvailability } from "@/types/domain";
import { SHOPPING_CATEGORY_LABELS } from "@/types/domain";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddPantryItemDialog } from "@/components/pantry/add-pantry-item-dialog";

const AVAILABILITY_LABEL: Record<PantryAvailability, string> = {
  disponibile: "Disponibile",
  quasi_finito: "Quasi finito",
  da_ricomprare: "Da ricomprare",
};

const AVAILABILITY_VARIANT: Record<PantryAvailability, BadgeProps["variant"]> = {
  disponibile: "success",
  quasi_finito: "warning",
  da_ricomprare: "destructive",
};

export default function PantryPage() {
  const pantryItems = useAppStore((s) => s.pantryItems);
  const updatePantryAvailability = useAppStore((s) => s.updatePantryAvailability);
  const removePantryItem = useAppStore((s) => s.removePantryItem);
  const { user, role } = useCurrentUser();

  const canEdit = canMarkPantryItems(role);
  const grouped = new Map<string, typeof pantryItems>();
  for (const item of pantryItems) {
    const bucket = grouped.get(item.category) ?? [];
    bucket.push(item);
    grouped.set(item.category, bucket);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">In casa</h1>
          <p className="text-sm text-muted-foreground">Cosa c'è già in dispensa, per non comprarlo due volte.</p>
        </div>
        {canEdit && <AddPantryItemDialog />}
      </div>

      <div className="space-y-6">
        {Array.from(grouped.entries()).map(([category, categoryItems]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold">{SHOPPING_CATEGORY_LABELS[category as keyof typeof SHOPPING_CATEGORY_LABELS]}</h2>
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity}
                      {item.expiresOn ? ` · scade ${item.expiresOn}` : ""}
                    </p>
                  </div>
                  {canEdit ? (
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
                  ) : (
                    <Badge variant={AVAILABILITY_VARIANT[item.availability]}>{AVAILABILITY_LABEL[item.availability]}</Badge>
                  )}
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePantryItem(item.id)} aria-label="Rimuovi">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
        {pantryItems.length === 0 && <p className="text-sm text-muted-foreground">Nessun prodotto registrato ancora.</p>}
      </div>
    </div>
  );
}
