"use client";

import Link from "next/link";
import { Bell, Moon, Repeat, Sun } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { user } = useCurrentUser();
  const users = useAppStore((s) => s.users);
  const notifications = useAppStore((s) => s.notifications);
  const loginAs = useAppStore((s) => s.loginAs);
  const logout = useAppStore((s) => s.logout);
  const { theme, toggleTheme } = useTheme();

  const unreadCount = notifications.filter((n) => n.userId === user?.id && !n.readAt).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur safe-top md:px-8">
      <div className="md:hidden">
        <span className="font-display text-xl font-semibold">MealFlow</span>
      </div>
      <div className="hidden text-eyebrow md:block">Famiglia Lamonica</div>

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambia tema">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" asChild aria-label="Notifiche">
          <Link href="/notifiche" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge variant="default" className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full p-0 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-colors hover:bg-secondary" aria-label="Profilo">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.displayName?.slice(0, 1) ?? "?"}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{user?.displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px]">
              <Repeat className="h-3 w-3" /> Cambia utente (demo)
            </DropdownMenuLabel>
            {users.map((u) => (
              <DropdownMenuItem key={u.id} onSelect={() => loginAs(u.id)} disabled={u.id === user?.id}>
                {u.displayName}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/impostazioni">Impostazioni</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/privacy">Privacy ed esportazione dati</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout()} asChild>
              <Link href="/login">Esci</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
