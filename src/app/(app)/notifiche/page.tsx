"use client";

import Link from "next/link";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { format } from "date-fns";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);
  const { user } = useCurrentUser();

  const mine = notifications
    .filter((n) => n.userId === user?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Notifiche</h1>
          <p className="text-sm text-muted-foreground">Solo ciò che serve, senza rumore di fondo.</p>
        </div>
        {mine.some((n) => !n.readAt) && (
          <Button variant="outline" size="sm" onClick={() => user && markAllNotificationsRead(user.id)}>
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Segna tutte come lette
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {mine.map((n) => (
          <Link
            key={n.id}
            href={n.href ?? "#"}
            onClick={() => markNotificationRead(n.id)}
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-crimson/40",
              !n.readAt && "border-crimson/30 bg-crimson-muted/30",
            )}
          >
            <Bell className={cn("mt-0.5 h-4 w-4 shrink-0", n.readAt ? "text-muted-foreground" : "text-crimson")} />
            <div>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{format(new Date(n.createdAt), "dd-MM-yyyy HH:mm")}</p>
            </div>
          </Link>
        ))}
        {mine.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <BellOff className="h-6 w-6" />
            Nessuna notifica al momento.
          </div>
        )}
      </div>
    </div>
  );
}
