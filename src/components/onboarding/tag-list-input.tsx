"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Campo semplice per liste di stringhe (piatti preferiti, verdure gradite…), separate da virgola. */
export function TagListInput({
  label,
  values,
  onCommit,
  placeholder,
}: {
  label: string;
  values: string[];
  onCommit: (values: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = React.useState(values.join(", "));
  const id = React.useId();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() =>
          onCommit(
            text
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          )
        }
        placeholder={placeholder ?? "Separati da virgola"}
      />
    </div>
  );
}
