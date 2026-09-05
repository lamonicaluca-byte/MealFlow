import type { HouseholdUserRole } from "@/types/domain";

/**
 * Regole di autorizzazione centralizzate e pure (nessun I/O): stessa logica
 * usata lato client (per abilitare/disabilitare azioni in UI) e lato server
 * quando l'app è collegata a Supabase (route handler + RLS, vedi
 * `supabase/migrations`). La sicurezza reale, quando esiste un backend, non
 * dipende MAI dalla sola interfaccia: queste funzioni sono la base sia per i
 * controlli applicativi sia per tradurre 1:1 le policy RLS.
 */

/**
 * Permessi effettivi calcolati per QUALSIASI ruolo (a differenza di
 * `CollaboratorPermissions`, che per costruzione fissa a `false` i tre
 * permessi critici: quel tipo descrive solo ciò che può essere *concesso* a
 * un Collaborator, non i permessi effettivi di owner/admin).
 */
export interface EffectivePermissions {
  canViewMenu: boolean;
  canViewRecipes: boolean;
  canViewOperationalNotes: boolean;
  canUpdateShoppingList: boolean;
  canMarkPantryItems: boolean;
  canAddManualItems: boolean;
  canApproveMenu: boolean;
  canEditAllergies: boolean;
  canEditRoles: boolean;
}

const NO_ACCESS_PERMISSIONS: EffectivePermissions = {
  canViewMenu: false,
  canViewRecipes: false,
  canViewOperationalNotes: false,
  canUpdateShoppingList: false,
  canMarkPantryItems: false,
  canAddManualItems: false,
  canApproveMenu: false,
  canEditAllergies: false,
  canEditRoles: false,
};

export function canApproveMenu(role: HouseholdUserRole | undefined): boolean {
  if (!role) return false;
  return role.operationalRole === "approver";
}

export function canEditMenu(role: HouseholdUserRole | undefined): boolean {
  if (!role) return false;
  return role.operationalRole === "approver" || role.operationalRole === "editor";
}

export function canUpdateShoppingList(role: HouseholdUserRole | undefined): boolean {
  if (!role) return false;
  if (role.role === "owner" || role.role === "admin") return true;
  return Boolean(role.permissions?.canUpdateShoppingList);
}

export function canAddManualShoppingItems(role: HouseholdUserRole | undefined): boolean {
  if (!role) return false;
  if (role.role === "owner" || role.role === "admin") return true;
  return Boolean(role.permissions?.canAddManualItems);
}

export function canViewOperationalNotes(role: HouseholdUserRole | undefined): boolean {
  if (!role) return false;
  if (role.role === "owner" || role.role === "admin") return true;
  return Boolean(role.permissions?.canViewOperationalNotes);
}

/** Allergie, dati sanitari, ruoli e sicurezza: mai per un Collaborator (§3, §20). */
export function canEditAllergiesAndRoles(role: HouseholdUserRole | undefined): boolean {
  if (!role) return false;
  return role.role === "owner" || role.role === "admin";
}

export function canManageInvitations(role: HouseholdUserRole | undefined): boolean {
  if (!role) return false;
  return role.role === "owner" || role.role === "admin";
}

export function canDeleteHousehold(role: HouseholdUserRole | undefined): boolean {
  if (!role) return false;
  return role.role === "owner";
}

/** Permessi granulari effettivi (per la UI del profilo/ruolo). */
export function effectivePermissions(role: HouseholdUserRole | undefined): EffectivePermissions {
  if (!role) return NO_ACCESS_PERMISSIONS;

  if (role.role === "owner" || role.role === "admin") {
    // Per owner/admin i permessi "granulari" sono pieni per definizione; la
    // sola eccezione riflessa qui è l'approvazione, che dipende dal ruolo
    // operativo (un admin "editor" può modificare ma non approvare).
    return {
      canViewMenu: true,
      canViewRecipes: true,
      canViewOperationalNotes: true,
      canUpdateShoppingList: true,
      canMarkPantryItems: true,
      canAddManualItems: true,
      canApproveMenu: canApproveMenu(role),
      canEditAllergies: true,
      canEditRoles: true,
    };
  }

  return role.permissions ?? NO_ACCESS_PERMISSIONS;
}
