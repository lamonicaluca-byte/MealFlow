"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import type { AllergySeverity, DietaryProfile } from "@/types/domain";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SEVERITY_LABEL: Record<AllergySeverity, string> = { lieve: "Lieve", moderata: "Moderata", grave: "Grave" };

function RemovableBadge({
  label,
  variant,
  onRemove,
}: {
  label: string;
  variant: "destructive" | "warning" | "secondary" | "outline";
  onRemove: () => void;
}) {
  return (
    <Badge variant={variant} className="gap-1 pr-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Rimuovi ${label}`}
        className="rounded-full p-0.5 hover:bg-black/10"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

/** Riga di aggiunta con un solo campo testo (intolleranze, esclusioni, avversioni: mai la gravità, solo le allergie la richiedono). */
function SimpleAddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = React.useState("");
  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
  };
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
      <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={submit} aria-label="Aggiungi">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/**
 * Editor delle informazioni di sicurezza alimentare di un membro
 * (allergie, intolleranze, esclusioni, avversioni). Prima di questo
 * componente non esisteva NESSUNA interfaccia per aggiungerle o
 * rimuoverle: erano visibili solo in sola lettura (dati del seed).
 * Va mostrato solo a chi può modificarle (`canEditAllergiesAndRoles`,
 * stessa regola della RLS `dietary_profiles_owner_admin_only` — vedi
 * `supabase/migrations/0002_rls.sql`).
 */
export function DietarySafetyEditor({ memberId, profile }: { memberId: string; profile: DietaryProfile }) {
  const addAllergy = useAppStore((s) => s.addAllergy);
  const removeAllergy = useAppStore((s) => s.removeAllergy);
  const addIntolerance = useAppStore((s) => s.addIntolerance);
  const removeIntolerance = useAppStore((s) => s.removeIntolerance);
  const addDietaryRestriction = useAppStore((s) => s.addDietaryRestriction);
  const removeDietaryRestriction = useAppStore((s) => s.removeDietaryRestriction);
  const addDislike = useAppStore((s) => s.addDislike);
  const removeDislike = useAppStore((s) => s.removeDislike);

  const [allergen, setAllergen] = React.useState("");
  const [severity, setSeverity] = React.useState<AllergySeverity>("moderata");

  const submitAllergy = () => {
    const trimmed = allergen.trim();
    if (!trimmed) return;
    addAllergy(memberId, trimmed, severity, null);
    setAllergen("");
    setSeverity("moderata");
  };

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Allergie</p>
        {profile.allergies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.allergies.map((a) => (
              <RemovableBadge
                key={a.id}
                variant="destructive"
                label={`${a.allergen} (${SEVERITY_LABEL[a.severity]})`}
                onRemove={() => removeAllergy(memberId, a.id)}
              />
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={allergen}
            onChange={(e) => setAllergen(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitAllergy();
              }
            }}
            placeholder="Es. frutta a guscio"
            className="h-8 text-sm"
          />
          <Select value={severity} onValueChange={(v) => setSeverity(v as AllergySeverity)}>
            <SelectTrigger className="h-8 w-28 shrink-0 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lieve">Lieve</SelectItem>
              <SelectItem value="moderata">Moderata</SelectItem>
              <SelectItem value="grave">Grave</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={submitAllergy} aria-label="Aggiungi allergia">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Intolleranze</p>
        {profile.intolerances.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.intolerances.map((i) => (
              <RemovableBadge key={i.id} variant="warning" label={i.substance} onRemove={() => removeIntolerance(memberId, i.id)} />
            ))}
          </div>
        )}
        <SimpleAddRow placeholder="Es. lattosio" onAdd={(v) => addIntolerance(memberId, v, null)} />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Esclusioni</p>
        {profile.restrictions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.restrictions.map((r) => (
              <RemovableBadge
                key={r.id}
                variant="secondary"
                label={r.ingredient}
                onRemove={() => removeDietaryRestriction(memberId, r.id)}
              />
            ))}
          </div>
        )}
        <SimpleAddRow placeholder="Es. frattaglie" onAdd={(v) => addDietaryRestriction(memberId, v, null)} />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Non gradito</p>
        {profile.dislikes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.dislikes.map((d) => (
              <RemovableBadge key={d.id} variant="outline" label={d.ingredientOrDish} onRemove={() => removeDislike(memberId, d.id)} />
            ))}
          </div>
        )}
        <SimpleAddRow placeholder="Es. cime di rapa" onAdd={(v) => addDislike(memberId, v)} />
      </div>
    </div>
  );
}
