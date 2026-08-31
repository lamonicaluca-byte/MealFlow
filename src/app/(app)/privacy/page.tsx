"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Baby, Download, ShieldCheck, Trash2 } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canDeleteHousehold } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function PrivacyPage() {
  const state = useAppStore((s) => s);
  const { user, role } = useCurrentUser();
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();
  const { toast } = useToast();

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      household: state.household,
      members: state.members,
      dietaryProfiles: state.dietaryProfiles,
      preferences: state.preferences,
      weeklyMenus: state.weeklyMenus,
      meals: state.meals,
      shoppingLists: state.shoppingLists,
      shoppingListItems: state.shoppingListItems,
      pantryItems: state.pantryItems,
      leftoverItems: state.leftoverItems,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mealflow-dati-famiglia.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Esportazione completata", description: "Il file JSON con i tuoi dati è stato scaricato." });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Privacy ed esportazione dati</h1>
        <p className="text-sm text-muted-foreground">Trasparenza su cosa conserviamo e perché.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-4 w-4 text-crimson" /> Minimizzazione dei dati
          </CardTitle>
          <CardDescription>
            MealFlow conserva solo le informazioni necessarie a organizzare i pasti: profili alimentari, menu, spesa e
            dispensa. Non registriamo dati clinici oltre ad allergie e intolleranze dichiarate volontariamente, e non
            li condividiamo con soggetti terzi.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Baby className="h-4 w-4 text-crimson" /> Dati della minore
          </CardTitle>
          <CardDescription>
            Il profilo della bambina non ha un account proprio e non è raggiungibile da terzi: solo Luca e sua moglie
            possono modificarne allergie e indicazioni sanitarie. Chalika può consultare il menu adattato, ma non i
            dati sanitari sottostanti.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Esporta i tuoi dati</CardTitle>
          <CardDescription>Scarica una copia leggibile di tutti i dati della famiglia in formato JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={exportData}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Esporta dati
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-xl text-destructive">Zona sensibile</CardTitle>
          <CardDescription>Azioni irreversibili: procedi solo se sei sicuro.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Elimina il mio account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Eliminare il tuo account?</DialogTitle>
                <DialogDescription>
                  I tuoi dati personali verranno rimossi. Le ricette e il menu condiviso resteranno visibili agli altri
                  membri della famiglia.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                >
                  Conferma eliminazione
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {canDeleteHousehold(role) && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Elimina la famiglia
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Eliminare l'intera famiglia?</DialogTitle>
                  <DialogDescription>
                    Menu, ricette, spesa, dispensa e profili di tutti i membri verranno rimossi definitivamente. Questa
                    azione non può essere annullata.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      logout();
                      router.push("/login");
                    }}
                  >
                    Conferma eliminazione famiglia
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        MealFlow offre un supporto organizzativo basato su principi generali di sana alimentazione. Non sostituisce le
        indicazioni del medico, del pediatra o di un professionista della nutrizione.
      </p>
    </div>
  );
}
