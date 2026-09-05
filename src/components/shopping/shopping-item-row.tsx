"use client";

import * as React from "react";
import { AlertCircle, Check, MoreVertical, StickyNote, Trash2 } from "lucide-react";

import type { ShoppingCategory, ShoppingItemStatus, ShoppingListItem } from "@/types/domain";
import { SHOPPING_CATEGORY_LABELS, SHOPPING_ITEM_STATUS_LABELS } from "@/types/domain";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAppStore } from "@/store/app-store";
import { canUpdateShoppingList as canUpdateShoppingListRole } from "@/lib/auth/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_ORDER: ShoppingItemStatus[] = [
  "da_comprare",
  "gia_in_casa",
  "da_verificare",
  "comprato",
  "non_disponibile",
  "sostituito",
];

export function ShoppingItemRow({ item }: { item: ShoppingListItem }) {
  const { user, role } = useCurrentUser();
  const changeStatus = useAppStore((s) => s.changeShoppingItemStatus);
  const updateQuantity = useAppStore((s) => s.updateShoppingItemQuantity);
  const updateNote = useAppStore((s) => s.updateShoppingItemNote);
  const updateCategory = useAppStore((s) => s.updateShoppingItemCategory);
  const deleteManualItem = useAppStore((s) => s.deleteManualShoppingItem);

  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState(item.note ?? "");
  const [qtyOpen, setQtyOpen] = React.useState(false);
  const [qtyDraft, setQtyDraft] = React.useState(item.quantity?.toString() ?? "");
  const [categoryOpen, setCategoryOpen] = React.useState(false);

  const canEdit = canUpdateShoppingListRole(role);
  const isBought = item.status === "comprato";

  const toggleBought = () => {
    if (!user || !canEdit) return;
    changeStatus(item.id, isBought ? "da_comprare" : "comprato", user.id, user.displayName);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border/70 py-2.5 last:border-0",
        isBought && "opacity-60",
      )}
    >
      {/* La checkbox nativa è 20×20px, sotto i 44×44px raccomandati per il
          tocco: <label> (un button è "labelable" per spec HTML, quindi il
          click viene inoltrato) allarga l'area cliccabile senza dover
          ingrandire visivamente la checkbox stessa. */}
      <label className={cn("flex h-11 w-11 shrink-0 items-center justify-center", canEdit ? "cursor-pointer" : "cursor-not-allowed")}>
        <Checkbox checked={isBought} onCheckedChange={toggleBought} disabled={!canEdit} aria-label="Segna come comprato" />
      </label>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isBought && "line-through")}>{item.name}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{item.quantity ? `${item.quantity} ${item.unit ?? ""}` : item.unit === "q.b." ? "q.b." : "—"}</span>
          {item.status !== "da_comprare" && item.status !== "comprato" && (
            <Badge variant={item.status === "da_verificare" ? "warning" : "secondary"} className="h-4 px-1.5 py-0 text-[10px]">
              {SHOPPING_ITEM_STATUS_LABELS[item.status]}
            </Badge>
          )}
          {item.needsReviewReason && (
            <span className="flex items-center gap-0.5 text-warning">
              <AlertCircle className="h-3 w-3" /> {item.needsReviewReason}
            </span>
          )}
          {item.note && <span className="italic">"{item.note}"</span>}
        </div>
      </div>

      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Azioni prodotto">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Cambia stato</DropdownMenuLabel>
            {STATUS_ORDER.map((status) => (
              <DropdownMenuItem
                key={status}
                onSelect={() => user && changeStatus(item.id, status, user.id, user.displayName)}
              >
                {item.status === status && <Check className="mr-2 h-3.5 w-3.5" />}
                <span className={item.status === status ? "" : "ml-[22px]"}>{SHOPPING_ITEM_STATUS_LABELS[status]}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setQtyOpen(true)}>Modifica quantità</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setNoteOpen(true)}>
              <StickyNote className="mr-2 h-3.5 w-3.5" /> Aggiungi nota
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCategoryOpen(true)}>Cambia reparto</DropdownMenuItem>
            {item.isManual && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => deleteManualItem(item.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Elimina prodotto
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nota per "{item.name}"</DialogTitle>
          </DialogHeader>
          <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Es. Preso quello bio, marca preferita…" />
          <DialogFooter>
            <Button
              onClick={() => {
                updateNote(item.id, noteDraft || null);
                setNoteOpen(false);
              }}
            >
              Salva nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reparto di "{item.name}"</DialogTitle>
          </DialogHeader>
          <Select value={item.category} onValueChange={(v) => updateCategory(item.id, v as ShoppingCategory)}>
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
          <DialogFooter>
            <Button onClick={() => setCategoryOpen(false)}>Fatto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qtyOpen} onOpenChange={setQtyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quantità di "{item.name}"</DialogTitle>
          </DialogHeader>
          <Input type="number" min={0} step="0.1" value={qtyDraft} onChange={(e) => setQtyDraft(e.target.value)} />
          <DialogFooter>
            <Button
              onClick={() => {
                const parsed = qtyDraft === "" ? null : Number(qtyDraft);
                updateQuantity(item.id, parsed, item.unit);
                setQtyOpen(false);
              }}
            >
              Salva quantità
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
