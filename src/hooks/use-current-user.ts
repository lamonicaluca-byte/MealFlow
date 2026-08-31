"use client";

import { useAppStore } from "@/store/app-store";
import { getRoleForUser } from "@/lib/data/demo-household";
import { effectivePermissions } from "@/lib/auth/permissions";

/** Utente e ruolo correnti, derivati dallo stato applicativo (demo o reale). */
export function useCurrentUser() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  const members = useAppStore((s) => s.members);

  const user = users.find((u) => u.id === currentUserId) ?? null;
  const member = members.find((m) => m.userId === currentUserId) ?? null;
  const role = currentUserId ? getRoleForUser(currentUserId) : undefined;
  const permissions = effectivePermissions(role);

  return { user, member, role, permissions, isAuthenticated: Boolean(user) };
}
