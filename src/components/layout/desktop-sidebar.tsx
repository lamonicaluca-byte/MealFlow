"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { ALL_NAV } from "@/lib/nav-items";

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2 px-6 py-7">
        <span className="font-display text-2xl font-semibold tracking-tight">MealFlow</span>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {ALL_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-crimson-muted text-crimson" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-6 text-xs text-muted-foreground">
        <p className="divider-crimson mb-3" />
        "Meno decisioni, più tempo insieme."
      </div>
    </aside>
  );
}
