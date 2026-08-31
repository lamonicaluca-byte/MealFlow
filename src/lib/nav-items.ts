import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Boxes,
  Calendar,
  ChefHat,
  Home,
  Leaf,
  ListChecks,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Voci principali, sempre visibili (barra mobile + testa della sidebar). */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/menu", label: "Menu", icon: ChefHat },
  { href: "/spesa", label: "Spesa", icon: ShoppingCart },
  { href: "/dispensa", label: "In casa", icon: Boxes },
];

/** Voci secondarie: raccolte nel foglio "Altro" su mobile, elencate nella sidebar su desktop. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/avanzi", label: "Avanzi", icon: Leaf },
  { href: "/calendario", label: "Calendario familiare", icon: Calendar },
  { href: "/storico", label: "Storico menu", icon: ListChecks },
  { href: "/profili", label: "Profili", icon: Users },
  { href: "/preferenze", label: "Preferenze", icon: Sparkles },
  { href: "/inviti", label: "Inviti e ruoli", icon: UserCog },
  { href: "/notifiche", label: "Notifiche", icon: Bell },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
  { href: "/privacy", label: "Privacy ed esportazione dati", icon: ShieldCheck },
];

export const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];
