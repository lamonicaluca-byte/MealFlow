"use client";

import * as React from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canApproveMenu } from "@/lib/auth/permissions";
import { formatDateDisplay } from "@/lib/utils";
import { getMealsForVersion } from "@/lib/selectors/menu-selectors";
import { WeeklyMenuView } from "@/components/menu/weekly-menu-view";
import { MenuStatusBadge } from "@/components/menu/menu-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function MenuApprovalPage() {
  const weeklyMenus = useAppStore((s) => s.weeklyMenus);
  const menuVersions = useAppStore((s) => s.menuVersions);
  const meals = useAppStore((s) => s.meals);
  const approveMenu = useAppStore((s) => s.approveMenu);
  const { user, role } = useCurrentUser();
  const { toast } = useToast();
  const [isApproving, setIsApproving] = React.useState(false);

  const pendingMenu = weeklyMenus.find((m) => m.status === "pending_approval" || m.status === "generated");
  const canApprove = canApproveMenu(role);

  if (!pendingMenu) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
        <h1 className="font-display text-2xl font-semibold">Nessuna approvazione in attesa</h1>
        <p className="mt-1 text-sm text-muted-foreground">Il menu della prossima settimana è già stato approvato.</p>
      </div>
    );
  }

  const version = menuVersions.find((v) => v.id === pendingMenu.currentVersionId);
  const versionMeals = getMealsForVersion(meals, pendingMenu.currentVersionId);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-eyebrow">Approvazione richiesta</p>
        <h1 className="font-display text-3xl font-semibold">Il menu della prossima settimana è pronto</h1>
        <p className="text-sm text-muted-foreground">Bastano pochi minuti per controllarlo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <MenuStatusBadge status={pendingMenu.status} />
        <span className="text-xs text-muted-foreground">Settimana del {formatDateDisplay(pendingMenu.weekStartDate)}</span>
      </div>

      {!canApprove && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-5 text-sm text-muted-foreground">
            <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
            Puoi consultare e proporre modifiche, ma solo Luca o Anita possono approvare il menu.
          </CardContent>
        </Card>
      )}

      {version?.changeReason && (
        <p className="text-xs text-muted-foreground">Ultima modifica: {version.changeReason}</p>
      )}

      <WeeklyMenuView meals={versionMeals} />

      {canApprove && (
        <div className="sticky bottom-20 flex justify-end md:bottom-4">
          <Button
            size="lg"
            disabled={isApproving}
            onClick={async () => {
              if (!user) return;
              setIsApproving(true);
              const result = await approveMenu(pendingMenu.id, user.id, user.displayName);
              setIsApproving(false);
              toast({
                title: result.ok ? result.message : "Approvazione non riuscita",
                description: result.ok ? "La lista della spesa è stata generata automaticamente." : result.message,
                variant: result.ok ? "success" : "destructive",
              });
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> {isApproving ? "Approvazione in corso…" : "Approva il menu"}
          </Button>
        </div>
      )}
    </div>
  );
}
