"use client";

import * as React from "react";
import { ShieldAlert } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StepSafety() {
  const members = useAppStore((s) => s.members);
  const dietaryProfiles = useAppStore((s) => s.dietaryProfiles);
  const updateDietaryProfile = useAppStore((s) => s.updateDietaryProfile);

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-xs text-warning">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        Le allergie hanno priorità assoluta: nessuna ricetta incompatibile viene mai proposta, indipendentemente da
        cosa suggerisce la generazione automatica.
      </p>
      {members.map((member) => {
        const profile = dietaryProfiles.find((p) => p.memberId === member.id);
        if (!profile) return null;
        return (
          <Card key={member.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{member.displayName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {profile.allergies.length === 0 && profile.intolerances.length === 0 && profile.restrictions.length === 0 && (
                  <span className="text-xs text-muted-foreground">Nessuna allergia, intolleranza o esclusione registrata.</span>
                )}
                {profile.allergies.map((a) => (
                  <Badge key={a.id} variant="destructive">
                    Allergia: {a.allergen} ({a.severity})
                  </Badge>
                ))}
                {profile.intolerances.map((i) => (
                  <Badge key={i.id} variant="warning">
                    Intolleranza: {i.substance}
                  </Badge>
                ))}
                {profile.restrictions.map((r) => (
                  <Badge key={r.id} variant="secondary">
                    Escluso: {r.ingredient}
                  </Badge>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`notes-${member.id}`}>Indicazioni della famiglia (facoltative)</Label>
                <Textarea
                  id={`notes-${member.id}`}
                  defaultValue={profile.familyNotes ?? ""}
                  onBlur={(e) => updateDietaryProfile(member.id, { familyNotes: e.target.value || null })}
                  placeholder="Es. preferisce porzioni piccole, non ama i sapori piccanti…"
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
