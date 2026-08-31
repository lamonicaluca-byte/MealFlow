"use client";

import Link from "next/link";
import { LogOut, Moon, Sun } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const NOTIF_LABELS: Record<string, string> = {
  menuPronto: "Menu pronto da controllare",
  promemoriaApprovazione: "Promemoria di approvazione",
  menuApprovato: "Menu approvato",
  spesaAggiornata: "Aggiornamenti alla lista della spesa",
  noteAggiunte: "Nuove note",
};

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useCurrentUser();
  const notificationPreferences = useAppStore((s) => s.notificationPreferences);
  const updateNotificationPreferences = useAppStore((s) => s.updateNotificationPreferences);
  const logout = useAppStore((s) => s.logout);

  const prefs = notificationPreferences.find((p) => p.userId === user?.id);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">Aspetto, notifiche e account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Aspetto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-switch" className="flex items-center gap-2 font-normal">
              {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              Tema {theme === "dark" ? "scuro" : "chiaro (Maiolica di Capri)"}
            </Label>
            <Switch id="theme-switch" checked={theme === "light"} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      {prefs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Notifiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(NOTIF_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={`notif-${key}`} className="font-normal">
                  {label}
                </Label>
                <Switch
                  id={`notif-${key}`}
                  checked={Boolean(prefs[key as keyof typeof prefs])}
                  onCheckedChange={(checked) => user && updateNotificationPreferences(user.id, { [key]: checked })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/onboarding" className="block text-sm text-crimson hover:underline">
            Rivedi l'onboarding
          </Link>
          <Link href="/privacy" className="block text-sm text-crimson hover:underline">
            Privacy ed esportazione dati
          </Link>
          <Separator />
          <Button variant="outline" asChild>
            <Link href="/login" onClick={() => logout()}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Esci
            </Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">MealFlow · versione demo</p>
    </div>
  );
}
