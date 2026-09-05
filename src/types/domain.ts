/**
 * Tipi di dominio condivisi da tutta l'applicazione MealFlow.
 *
 * Questi tipi rispecchiano lo schema del database (vedi `supabase/migrations`)
 * ma sono pensati per l'uso lato applicazione (camelCase, date come stringhe
 * ISO). Il mapping snake_case <-> camelCase avviene nei repository
 * (`src/lib/data`).
 */

export type UUID = string;
export type ISODateString = string; // "2026-08-31"
export type ISODateTimeString = string; // "2026-08-31T12:00:00.000Z"

// ---------------------------------------------------------------------------
// Household & utenti
// ---------------------------------------------------------------------------

/** Ruolo di appartenenza (governance dell'account). */
export type HouseholdRole = "owner" | "admin" | "collaborator";

/** Ruolo operativo rispetto al menu (chi può approvare/modificare). */
export type OperationalRole = "approver" | "editor" | "viewer";

export type AgeGroup = "adulto" | "bambino_6_10" | "bambino_11_13" | "adolescente" | "neonato";

export interface Household {
  id: UUID;
  name: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  createdBy: UUID;
  onboardingCompletedAt: ISODateTimeString | null;
  onboardingStep: number; // 0-5, 0 = non iniziato
  settings: HouseholdSettings;
}

export interface HouseholdSettings {
  shoppingDay: Weekday;
  weekStartsOn: Weekday;
  budgetLevel: "essenziale" | "equilibrato" | "senza_pensieri";
  maxPrepMinutesWeekday: number;
  maxPrepMinutesWeekend: number;
  chalikaCookingDays: Weekday[];
  varietyLevel: "abitudinaria" | "equilibrata" | "esplorativa";
}

/** Un membro della famiglia con account (può autenticarsi). */
export interface HouseholdMember {
  id: UUID;
  householdId: UUID;
  userId: UUID | null; // null se il membro non ha un account (es. un figlio minorenne)
  displayName: string;
  ageGroup: AgeGroup;
  age: number | null;
  isDemo: boolean;
  avatarColor: string;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  deletedAt: ISODateTimeString | null;
}

/** Ruolo assegnato a un utente autenticato all'interno di una famiglia. */
export interface HouseholdUserRole {
  id: UUID;
  householdId: UUID;
  userId: UUID;
  role: HouseholdRole;
  operationalRole: OperationalRole;
  /**
   * Permessi granulari: valorizzati solo per role === "collaborator".
   * Per "owner"/"admin" i permessi derivano interamente da role/operationalRole
   * (accesso pieno) e questo campo resta null: evita di dover ripetere "true"
   * per ogni permesso e rende impossibile, per costruzione, concedere a un
   * owner/admin un sotto-insieme di permessi pensato per i collaboratori.
   */
  permissions: CollaboratorPermissions | null;
  createdAt: ISODateTimeString;
}

/** Permessi granulari per il ruolo Collaborator (Chalika). */
export interface CollaboratorPermissions {
  canViewMenu: boolean;
  canViewRecipes: boolean;
  canViewOperationalNotes: boolean;
  canUpdateShoppingList: boolean;
  canMarkPantryItems: boolean;
  canAddManualItems: boolean;
  canApproveMenu: false; // sempre false per costruzione
  canEditAllergies: false; // sempre false per costruzione
  canEditRoles: false; // sempre false per costruzione
}

export type AppUser = {
  id: UUID;
  email: string;
  displayName: string;
  createdAt: ISODateTimeString;
};

export interface Invitation {
  id: UUID;
  householdId: UUID;
  email: string;
  role: HouseholdRole;
  operationalRole: OperationalRole;
  invitedBy: UUID;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: ISODateTimeString;
  expiresAt: ISODateTimeString;
  acceptedAt: ISODateTimeString | null;
}

// ---------------------------------------------------------------------------
// Profili alimentari
// ---------------------------------------------------------------------------

export interface DietaryProfile {
  id: UUID;
  householdId: UUID;
  memberId: UUID;
  allergies: Allergy[];
  intolerances: Intolerance[];
  restrictions: DietaryRestriction[];
  dislikes: Dislike[];
  preferredDishes: string[];
  dislikedTextures: string[];
  familyNotes: string | null;
  opennessToNewDishes: "bassa" | "media" | "alta";
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export type AllergySeverity = "lieve" | "moderata" | "grave";

export interface Allergy {
  id: UUID;
  allergen: string;
  severity: AllergySeverity;
  notes: string | null;
}

export interface Intolerance {
  id: UUID;
  substance: string;
  notes: string | null;
}

export interface DietaryRestriction {
  id: UUID;
  ingredient: string;
  reason: string | null;
}

export interface Dislike {
  id: UUID;
  ingredientOrDish: string;
}

export interface HouseholdPreferences {
  id: UUID;
  householdId: UUID;
  favoriteDishes: string[];
  dislikedDishes: string[];
  favoriteVegetables: string[];
  favoriteFish: string[];
  favoriteLegumes: string[];
  favoriteBreakfasts: string[];
  updatedAt: ISODateTimeString;
}

// ---------------------------------------------------------------------------
// Settimana, menu, pasti
// ---------------------------------------------------------------------------

export type Weekday = "lunedi" | "martedi" | "mercoledi" | "giovedi" | "venerdi" | "sabato" | "domenica";

export const WEEKDAYS: Weekday[] = [
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
  "domenica",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lunedi: "Lunedì",
  martedi: "Martedì",
  mercoledi: "Mercoledì",
  giovedi: "Giovedì",
  venerdi: "Venerdì",
  sabato: "Sabato",
  domenica: "Domenica",
};

export type MealSlot = "colazione" | "pranzo" | "cena";

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  colazione: "Colazione",
  pranzo: "Pranzo",
  cena: "Cena",
};

/** Restituisce gli slot pasto previsti di default per un giorno (regola dei 17 momenti). */
export function defaultSlotsForDay(day: Weekday): MealSlot[] {
  if (day === "sabato" || day === "domenica") {
    return ["colazione", "pranzo", "cena"];
  }
  return ["colazione", "cena"];
}

export type MenuStatus =
  | "draft"
  | "generated"
  | "pending_approval"
  | "approved"
  | "modified_after_approval"
  | "archived";

export const MENU_STATUS_LABELS: Record<MenuStatus, string> = {
  draft: "Bozza",
  generated: "Generato",
  pending_approval: "In attesa di approvazione",
  approved: "Approvato",
  modified_after_approval: "Modificato dopo l'approvazione",
  archived: "Archiviato",
};

export interface WeeklyMenu {
  id: UUID;
  householdId: UUID;
  weekStartDate: ISODateString; // lunedì della settimana di riferimento
  status: MenuStatus;
  currentVersionId: UUID;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  createdBy: UUID | "system";
}

export interface MenuVersion {
  id: UUID;
  menuId: UUID;
  versionNumber: number;
  previousVersionId: UUID | null;
  approvedBy: UUID | null;
  approvedByName: string | null;
  approvedAt: ISODateTimeString | null;
  changeReason: string | null;
  createdAt: ISODateTimeString;
  createdBy: UUID | "system";
  isImmutable: boolean;
}

export interface MenuDay {
  id: UUID;
  menuVersionId: UUID;
  day: Weekday;
  date: ISODateString;
}

export type MealAttendanceType =
  | "tutti_presenti"
  | "assenze_parziali"
  | "ospiti"
  | "fuori_casa"
  | "viaggio"
  | "gia_organizzato"
  | "avanzi"
  | "nessuna_preparazione";

export interface MealAttendance {
  type: MealAttendanceType;
  absentMemberIds: UUID[];
  guestsCount: number;
  guestsNote: string | null;
}

export type Difficulty = "facile" | "media" | "impegnativa";

export interface Recipe {
  id: UUID;
  name: string;
  description: string;
  mediterraneanTags: string[]; // es. "verdure", "pesce", "legumi"
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: Difficulty;
  canPrepareAhead: boolean;
  allergens: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  imageEmoji: string; // rappresentazione leggera senza asset esterni
  isVegetarian: boolean;
  isQuickUnder20: boolean;
  usesLeftovers: boolean;
  costLevel: "basso" | "medio" | "alto";
}

export interface RecipeIngredient {
  id: UUID;
  name: string;
  quantity: number | null;
  unit: IngredientUnit | null;
  category: ShoppingCategory;
  optional: boolean;
}

export type IngredientUnit = "g" | "kg" | "ml" | "l" | "pz" | "cucchiai" | "cucchiaini" | "q.b.";

export interface Meal {
  id: UUID;
  menuVersionId: UUID;
  day: Weekday;
  date: ISODateString;
  slot: MealSlot;
  recipeId: UUID | null;
  recipeSnapshot: Recipe | null; // congelato al momento dell'assegnazione
  isManuallyAdded: boolean;
  attendance: MealAttendance;
  chalikaNote: string | null;
  familyNote: string | null;
  childAdaptationNote: string | null;
  usesExistingPantryItems: string[];
  usesLeftovers: boolean;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  updatedBy: UUID | "system" | null;
}

export interface MealFeedback {
  id: UUID;
  mealId: UUID;
  householdId: UUID;
  createdBy: UUID;
  tags: MealFeedbackTag[];
  note: string | null;
  createdAt: ISODateTimeString;
}

export type MealFeedbackTag =
  | "piaciuto_a_tutti"
  | "piaciuto_agli_adulti"
  | "piaciuto_alla_bambina"
  | "da_riproporre"
  | "da_non_riproporre"
  | "quantita_eccessiva"
  | "quantita_insufficiente"
  | "preparazione_troppo_lunga"
  | "sono_rimasti_avanzi";

/** Etichetta umana di ciascun tag di feedback (mai "bambina": vedi §3). */
export const MEAL_FEEDBACK_TAG_LABELS: Record<MealFeedbackTag, string> = {
  piaciuto_a_tutti: "Piaciuto a tutti",
  piaciuto_agli_adulti: "Piaciuto agli adulti",
  piaciuto_alla_bambina: "Piaciuto ad Amelia",
  da_riproporre: "Da riproporre",
  da_non_riproporre: "Da non riproporre",
  quantita_eccessiva: "Quantità eccessiva",
  quantita_insufficiente: "Quantità insufficiente",
  preparazione_troppo_lunga: "Preparazione troppo lunga",
  sono_rimasti_avanzi: "Sono rimasti avanzi",
};

export type MealChangeReason =
  | "non_piace"
  | "mangiato_recentemente"
  | "troppo_lungo"
  | "ingrediente_non_disponibile"
  | "non_gradito_bambina"
  | "preferiamo_altro"
  | "altro";

// ---------------------------------------------------------------------------
// Lista della spesa
// ---------------------------------------------------------------------------

export type ShoppingCategory =
  | "frutta_verdura"
  | "pesce_carne"
  | "latticini_uova"
  | "pane_forno"
  | "pasta_riso_cereali"
  | "dispensa"
  | "surgelati"
  | "colazione"
  | "bevande"
  | "casa"
  | "altro";

export const SHOPPING_CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  frutta_verdura: "Frutta e verdura",
  pesce_carne: "Pesce e carne",
  latticini_uova: "Latticini e uova",
  pane_forno: "Pane e prodotti da forno",
  pasta_riso_cereali: "Pasta, riso e cereali",
  dispensa: "Dispensa",
  surgelati: "Surgelati",
  colazione: "Colazione",
  bevande: "Bevande",
  casa: "Prodotti per la casa",
  altro: "Altro",
};

export type ShoppingItemStatus =
  | "da_verificare"
  | "gia_in_casa"
  | "da_comprare"
  | "comprato"
  | "non_disponibile"
  | "sostituito";

export const SHOPPING_ITEM_STATUS_LABELS: Record<ShoppingItemStatus, string> = {
  da_verificare: "Da verificare",
  gia_in_casa: "Già in casa",
  da_comprare: "Da comprare",
  comprato: "Comprato",
  non_disponibile: "Non disponibile",
  sostituito: "Sostituito",
};

export interface ShoppingList {
  id: UUID;
  householdId: UUID;
  menuVersionId: UUID;
  weekStartDate: ISODateString;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
}

export interface ShoppingListItem {
  id: UUID;
  shoppingListId: UUID;
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: IngredientUnit | null;
  category: ShoppingCategory;
  status: ShoppingItemStatus;
  note: string | null;
  isManual: boolean;
  sourceMealIds: UUID[];
  needsReviewReason: string | null;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  createdBy: UUID | "system";
}

export interface ShoppingItemStatusHistoryEntry {
  id: UUID;
  itemId: UUID;
  previousStatus: ShoppingItemStatus | null;
  newStatus: ShoppingItemStatus;
  changedBy: UUID;
  changedByName: string;
  changedAt: ISODateTimeString;
}

// ---------------------------------------------------------------------------
// Note, notifiche, audit
// ---------------------------------------------------------------------------

export interface HouseholdNote {
  id: UUID;
  householdId: UUID;
  scope: "menu" | "spesa" | "generale";
  refId: UUID | null;
  authorId: UUID;
  authorName: string;
  text: string;
  createdAt: ISODateTimeString;
}

export type NotificationType =
  | "menu_pronto"
  | "promemoria_approvazione"
  | "menu_approvato"
  | "menu_modificato"
  | "spesa_aggiornata"
  | "nota_aggiunta"
  | "invito_ricevuto";

export interface AppNotification {
  id: UUID;
  householdId: UUID;
  userId: UUID;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: ISODateTimeString | null;
  createdAt: ISODateTimeString;
}

export interface NotificationPreferences {
  userId: UUID;
  menuPronto: boolean;
  promemoriaApprovazione: boolean;
  menuApprovato: boolean;
  spesaAggiornata: boolean;
  noteAggiunte: boolean;
  canale: "app" | "app_e_push";
}

export interface AuditLogEntry {
  id: UUID;
  householdId: UUID;
  actorId: UUID;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: ISODateTimeString;
}

// ---------------------------------------------------------------------------
// Realtime events (demo bus / Supabase Realtime payloads)
// ---------------------------------------------------------------------------

export type RealtimeEventType =
  | "shopping_item_updated"
  | "shopping_item_added"
  | "note_added"
  | "menu_updated"
  | "menu_approved"
  | "notification_created";

export interface RealtimeEvent<TPayload = unknown> {
  type: RealtimeEventType;
  householdId: UUID;
  actorName: string;
  message: string;
  payload: TPayload;
  createdAt: ISODateTimeString;
}
