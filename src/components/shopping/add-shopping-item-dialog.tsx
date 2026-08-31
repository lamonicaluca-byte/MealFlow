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

export function AddShoppingItemDialog({ listId }: { listId: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [category, setCategory] = React.useState<ShoppingCategory>("altro");
  const addManualShoppingItem = useAppStore((s) => s.addManualShoppingItem);
  const { user } = useCurrentUser();

  const onSubmit = () => {
    if (!name.trim() || !user) return;
    addManualShoppingItem(
      listId,
      { name: name.trim(), quantity: quantity ? Number(quantity) : null, unit: "pz", category },
      user.id,
    );
    setName("");
    setQuantity("");
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
          <DialogTitle>Aggiungi un prodotto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Nome prodotto</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Carta forno" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item-qty">Quantità (facoltativa)</Label>
            <Input id="item-qty" type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
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
