"use client";

import * as React from "react";
import { Search, Undo2 } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { SHOPPING_CATEGORY_LABELS, type ShoppingCategory, type ShoppingItemStatus } from "@/types/domain";
import { SHOPPING_ITEM_STATUS_LABELS } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingItemRow } from "@/components/shopping/shopping-item-row";
import { AddShoppingItemDialog } from "@/components/shopping/add-shopping-item-dialog";

const CATEGORY_ORDER: ShoppingCategory[] = [
  "frutta_verdura",
  "pesce_carne",
  "latticini_uova",
  "pane_forno",
  "pasta_riso_cereali",
  "dispensa",
  "surgelati",
  "colazione",
  "bevande",
  "casa",
  "altro",
];

export default function ShoppingListPage() {
  const shoppingLists = useAppStore((s) => s.shoppingLists);
  const items = useAppStore((s) => s.shoppingListItems);
  const undoLastShoppingChange = useAppStore((s) => s.undoLastShoppingChange);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ShoppingItemStatus | "tutti">("tutti");

  const list = [...shoppingLists].sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))[0];
  const listItems = items.filter((i) => i.shoppingListId === list?.id);

  const filtered = listItems.filter((i) => {
    if (statusFilter !== "tutti" && i.status !== statusFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const boughtCount = listItems.filter((i) => i.status === "comprato").length;

  if (!list) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        La lista della spesa verrà generata automaticamente dopo l'approvazione del menu.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Lista della spesa</h1>
          <p className="font-display text-lg text-muted-foreground">
            {boughtCount} PRODOTTI ACQUISTATI SU {listItems.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={undoLastShoppingChange}>
            <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Annulla ultima modifica
          </Button>
          <AddShoppingItemDialog listId={list.id} />
        </div>
      </div>

      <Progress value={listItems.length > 0 ? (boughtCount / listItems.length) * 100 : 0} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca un prodotto…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ShoppingItemStatus | "tutti")}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            {Object.entries(SHOPPING_ITEM_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {CATEGORY_ORDER.map((category) => {
          const categoryItems = filtered.filter((i) => i.category === category);
          if (categoryItems.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="mb-1 text-sm font-semibold text-foreground">{SHOPPING_CATEGORY_LABELS[category]}</h2>
              <div>
                {categoryItems.map((item) => (
                  <ShoppingItemRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nessun prodotto corrisponde ai filtri.</p>
        )}
      </div>
    </div>
  );
}
