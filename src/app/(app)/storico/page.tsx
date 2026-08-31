"use client";

import Link from "next/link";
import { History } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { MenuStatusBadge } from "@/components/menu/menu-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MenuHistoryPage() {
  const weeklyMenus = useAppStore((s) => s.weeklyMenus);
  const menuVersions = useAppStore((s) => s.menuVersions);

  const sorted = [...weeklyMenus].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Storico menu</h1>
        <p className="text-sm text-muted-foreground">Ogni versione approvata resta consultabile, immutabile nel tempo.</p>
      </div>

      <div className="space-y-4">
        {sorted.map((menu) => {
          const versions = menuVersions
            .filter((v) => v.menuId === menu.id)
            .sort((a, b) => b.versionNumber - a.versionNumber);
          return (
            <Card key={menu.id}>
              <CardContent className="space-y-3 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-lg font-semibold">Settimana del {menu.weekStartDate}</p>
                  <MenuStatusBadge status={menu.status} />
                </div>
                <ul className="space-y-2">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-start gap-2 border-l-2 border-border pl-3 text-sm">
                      <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p>
                          Versione {v.versionNumber}
                          {v.approvedByName && (
                            <Badge variant="success" className="ml-2">
                              APPROVATO DA {v.approvedByName.toUpperCase()}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.approvedAt ? `Approvata il ${new Date(v.approvedAt).toLocaleString("it-IT")}` : "In attesa di approvazione"}
                          {v.changeReason ? ` · ${v.changeReason}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/menu" className="text-xs text-crimson hover:underline">
                  Apri il menu
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
