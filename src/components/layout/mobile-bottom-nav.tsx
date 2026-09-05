"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/nav-items";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-bottom md:hidden">
      <ul className="grid grid-cols-4">
        {PRIMARY_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium tracking-wide transition-colors",
                  active ? "text-crimson" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium tracking-wide text-muted-foreground"
              >
                <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                Altro
              </button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Altre sezioni</SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-3 gap-3 pt-2">
                {SECONDARY_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3 text-center text-xs font-medium text-foreground transition-colors hover:border-crimson/40"
                    >
                      <item.icon className="h-5 w-5 text-crimson" strokeWidth={1.75} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
