"use client";

import * as React from "react";
import { CheckCircle2, Info, Plus, Trash2 } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { LeftoverSuggestion } from "@/lib/services/menu-generation/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function LeftoversPage() {
  const leftoverItems = useAppStore((s) => s.leftoverItems);
  const addLeftover = useAppStore((s) => s.addLeftover);
  const markLeftoverUsed = useAppStore((s) => s.markLeftoverUsed);
  const removeLeftover = useAppStore((s) => s.removeLeftover);
  const getLeftoverSuggestions = useAppStore((s) => s.getLeftoverSuggestions);
  const { user } = useCurrentUser();

  const [open, setOpen] = React.useState(false);
  const [dish, setDish] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [expiresOn, setExpiresOn] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<LeftoverSuggestion[]>([]);

  React.useEffect(() => {
    void getLeftoverSuggestions().then(setSuggestions);
  }, [getLeftoverSuggestions, leftoverItems.length]);

  const available = leftoverItems.filter((l) => l.status === "disponibile");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Avanzi</h1>
          <p className="text-sm text-muted-foreground">Riduciamo gli sprechi, un avanzo alla volta.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> È avanzato qualcosa?
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registra un avanzo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dish">Piatto o ingrediente</Label>
                <Input id="dish" value={dish} onChange={(e) => setDish(e.target.value)} placeholder="Es. Riso in bianco" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lo-qty">Quantità indicativa</Label>
                <Input id="lo-qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Es. una ciotola" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lo-expiry">Scadenza (facoltativa)</Label>
                <Input id="lo-expiry" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (!dish.trim() || !user) return;
                  addLeftover({ dishOrIngredient: dish.trim(), quantity: quantity || null, expiresOn: expiresOn || null, note: null }, user.id);
                  setDish("");
                  setQuantity("");
                  setExpiresOn("");
                  setOpen(false);
                }}
                disabled={!dish.trim()}
              >
                Salva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {available.map((item) => {
          const suggestion = suggestions.find((s) => s.leftoverId === item.id);
          return (
            <Card key={item.id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg font-semibold">{item.dishOrIngredient}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} · registrato il {item.loggedOn}
                      {item.expiresOn ? ` · scade ${item.expiresOn}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markLeftoverUsed(item.id)} aria-label="Segna come utilizzato">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLeftover(item.id)} aria-label="Rimuovi">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {suggestion && (
                  <div className="rounded-md bg-secondary/60 p-3 text-xs">
                    <p>{suggestion.suggestion}</p>
                    <p className="mt-1.5 flex items-start gap-1 text-muted-foreground">
                      <Info className="mt-0.5 h-3 w-3 shrink-0" /> {suggestion.disclaimer}
                    </p>
                  </div>
                )}
                {!item.expiresOn && <Badge variant="warning">Nessuna scadenza indicata</Badge>}
              </CardContent>
            </Card>
          );
        })}
        {available.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nessun avanzo registrato al momento.</p>
        )}
      </div>
    </div>
  );
}
