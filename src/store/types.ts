import type {
  AppNotification,
  AppUser,
  AuditLogEntry,
  DietaryProfile,
  Household,
  HouseholdMember,
  HouseholdNote,
  HouseholdPreferences,
  HouseholdUserRole,
  Invitation,
  Meal,
  MealFeedback,
  MenuVersion,
  NotificationPreferences,
  PantryItem,
  ShoppingItemStatusHistoryEntry,
  ShoppingList,
  ShoppingListItem,
  WeeklyMenu,
} from "@/types/domain";

/**
 * Stato applicativo completo mantenuto lato client in modalità demo. In una
 * distribuzione con Supabase collegato, ciascuna di queste collezioni
 * verrebbe caricata e sincronizzata dal relativo repository (`src/lib/data`)
 * invece che tenuta interamente in memoria/localStorage.
 */
export interface AppState {
  status: "idle" | "loading" | "ready";
  currentUserId: string | null;

  users: AppUser[];
  household: Household | null;
  members: HouseholdMember[];
  roles: HouseholdUserRole[];
  invitations: Invitation[];

  dietaryProfiles: DietaryProfile[];
  preferences: HouseholdPreferences | null;

  weeklyMenus: WeeklyMenu[];
  menuVersions: MenuVersion[];
  meals: Meal[];
  mealFeedback: MealFeedback[];

  shoppingLists: ShoppingList[];
  shoppingListItems: ShoppingListItem[];
  shoppingItemHistory: ShoppingItemStatusHistoryEntry[];

  pantryItems: PantryItem[];

  notes: HouseholdNote[];
  notifications: AppNotification[];
  notificationPreferences: NotificationPreferences[];
  auditLog: AuditLogEntry[];

  recentActivity: RecentActivityEntry[];
}

export interface RecentActivityEntry {
  id: string;
  message: string;
  createdAt: string;
}
