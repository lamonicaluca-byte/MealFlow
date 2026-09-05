"use client";

import * as React from "react";

import { MEAL_FEEDBACK_TAG_LABELS, type MealFeedbackTag } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const FEEDBACK_OPTIONS: Array<{ value: MealFeedbackTag; label: string }> = Object.entries(
  MEAL_FEEDBACK_TAG_LABELS,
).map(([value, label]) => ({ value: value as MealFeedbackTag, label }));

/**
 * Feedback pasto (§15): solo tag descrittivi selezionabili liberamente,
 * nessun voto o punteggio nutrizionale — niente che possa generare senso di
 * colpa in famiglia.
 */
export function MealFeedbackForm({ onSubmit }: { onSubmit: (tags: MealFeedbackTag[], note: string | null) => void }) {
  const [selected, setSelected] = React.useState<MealFeedbackTag[]>([]);
  const [note, setNote] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const toggle = (tag: MealFeedbackTag) => {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  if (sent) {
    return <p className="text-sm text-muted-foreground">Grazie, il feedback è stato registrato.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FEEDBACK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selected.includes(opt.value)
                ? "border-crimson bg-crimson-muted text-crimson"
                : "border-border text-muted-foreground hover:border-crimson/40",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Aggiungi un dettaglio (facoltativo)" />
      <Button
        size="sm"
        disabled={selected.length === 0}
        onClick={() => {
          onSubmit(selected, note || null);
          setSent(true);
        }}
      >
        Invia feedback
      </Button>
    </div>
  );
}
