"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import type { ShoppingCategory } from "@/types/domain";
import { SHOPPING_CATEGORY_LABELS } from "@/types/domain";
import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddPantryItemDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [category, setCategory] = React.useState<ShoppingCategory>("dispensa");
  const [expiresOn, setExpiresOn] = React.useState("");
  const addPantryItem = useAppStore((s) => s.addPantryItem);
  const { user } = useCurrentUser();

  const onSubmit = () => {
    if (!name.trim() || !user) return;
    addPantryItem(
      {
        name: name.trim(),
        quantity: quantity || null,
        unit: null,
        category,
        expiresOn: expiresOn || null,
        availability: "disponibile",
      },
      user.id,
    );
    setName("");
    setQuantity("");
    setExpiresOn("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Aggiungi prodotto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi alla dispensa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pantry-name">Ingrediente</Label>
            <Input id="pantry-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Farina 00" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pantry-qty">Quantità indicativa</Label>
            <Input id="pantry-qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Es. mezzo pacco" />
          </div>
          <div className="space-y-1.5">
            <Label>Reparto</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ShoppingCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SHOPPING_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pantry-expiry">Scadenza (facoltativa)</Label>
            <Input id="pantry-expiry" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button onClick={onSubmit} disabled={!name.trim()}>
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
