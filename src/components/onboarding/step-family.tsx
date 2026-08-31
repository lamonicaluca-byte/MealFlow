"use client";

import * as React from "react";

import { useAppStore } from "@/store/app-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", collaborator: "Collaborator" };

export function StepFamily() {
  const household = useAppStore((s) => s.household);
  const members = useAppStore((s) => s.members);
  const roles = useAppStore((s) => s.roles);
  const updateHouseholdName = useAppStore((s) => s.updateHouseholdName);
  const [name, setName] = React.useState(household?.name ?? "");

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="household-name">Nome della famiglia</Label>
        <Input
          id="household-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => updateHouseholdName(name)}
        />
        <p className="text-xs text-muted-foreground">Dato dimostrativo: sostituiscilo pure con il vostro.</p>
      </div>

      <div className="space-y-2">
        <Label>Componenti della famiglia</Label>
        {members.map((m) => {
          const role = roles.find((r) => r.userId === m.userId);
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{m.displayName.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {m.age ? `${m.age} anni` : m.ageGroup} · {m.userId ? "Account" : "Profilo alimentare (senza account)"}
                </p>
              </div>
              {role && <Badge variant="secondary">{ROLE_LABEL[role.role]}</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
