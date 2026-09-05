import type {
  AppUser,
  DietaryProfile,
  Household,
  HouseholdMember,
  HouseholdPreferences,
  HouseholdUserRole,
} from "@/types/domain";
import { DEMO_HOUSEHOLD_ID, DEMO_MEMBER_IDS, DEMO_USER_IDS } from "./demo-ids";

const NOW = "2026-08-27T09:00:00.000Z";

export const DEMO_HOUSEHOLD: Household = {
  id: DEMO_HOUSEHOLD_ID,
  name: "Famiglia (demo)",
  createdAt: NOW,
  updatedAt: NOW,
  createdBy: DEMO_USER_IDS.luca,
  onboardingCompletedAt: NOW,
  onboardingStep: 4,
  settings: {
    shoppingDay: "sabato",
    weekStartsOn: "lunedi",
    budgetLevel: "equilibrato",
    maxPrepMinutesWeekday: 30,
    maxPrepMinutesWeekend: 60,
    chalikaCookingDays: ["martedi", "giovedi"],
    varietyLevel: "equilibrata",
  },
};

export const DEMO_USERS: AppUser[] = [
  { id: DEMO_USER_IDS.luca, email: "luca.demo@mealflow.app", displayName: "Luca", createdAt: NOW },
  {
    id: DEMO_USER_IDS.moglie,
    email: "anita.demo@mealflow.app",
    displayName: "Anita",
    createdAt: NOW,
  },
  {
    id: DEMO_USER_IDS.chalika,
    email: "chalika.demo@mealflow.app",
    displayName: "Chalika",
    createdAt: NOW,
  },
];

export const DEMO_MEMBERS: HouseholdMember[] = [
  {
    id: DEMO_MEMBER_IDS.luca,
    householdId: DEMO_HOUSEHOLD_ID,
    userId: DEMO_USER_IDS.luca,
    displayName: "Luca",
    ageGroup: "adulto",
    age: 52,
    isDemo: true,
    avatarColor: "crimson",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  },
  {
    id: DEMO_MEMBER_IDS.moglie,
    householdId: DEMO_HOUSEHOLD_ID,
    userId: DEMO_USER_IDS.moglie,
    displayName: "Anita",
    ageGroup: "adulto",
    age: 44,
    isDemo: true,
    avatarColor: "maiolica",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  },
  {
    id: DEMO_MEMBER_IDS.figlia,
    householdId: DEMO_HOUSEHOLD_ID,
    userId: null, // nessun account necessario
    displayName: "Amelia",
    ageGroup: "bambino_6_10",
    age: 9,
    isDemo: true,
    avatarColor: "amber",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  },
  {
    id: DEMO_MEMBER_IDS.chalika,
    householdId: DEMO_HOUSEHOLD_ID,
    userId: DEMO_USER_IDS.chalika,
    displayName: "Chalika",
    ageGroup: "adulto",
    age: null,
    isDemo: true,
    avatarColor: "slate",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  },
];

export const DEMO_ROLES: HouseholdUserRole[] = [
  {
    id: "60000000-0000-4000-8000-000000000001",
    householdId: DEMO_HOUSEHOLD_ID,
    userId: DEMO_USER_IDS.luca,
    role: "owner",
    operationalRole: "approver",
    permissions: null,
    createdAt: NOW,
  },
  {
    id: "60000000-0000-4000-8000-000000000002",
    householdId: DEMO_HOUSEHOLD_ID,
    userId: DEMO_USER_IDS.moglie,
    role: "admin",
    operationalRole: "approver",
    permissions: null,
    createdAt: NOW,
  },
  {
    id: "60000000-0000-4000-8000-000000000003",
    householdId: DEMO_HOUSEHOLD_ID,
    userId: DEMO_USER_IDS.chalika,
    role: "collaborator",
    // "viewer" rispetto al menu: Chalika consulta menu e ricette ma non li
    // modifica (niente "cambia piatto"/"rigenera"/"segna pasto fuori"); i
    // suoi permessi reali sulla lista della spesa arrivano dai flag
    // granulari sottostanti, non dal ruolo operativo (§3). Il campo
    // canMarkPantryItems resta valorizzato per fedeltà al tipo/RLS, anche se
    // la sezione dispensa dedicata è stata rimossa dall'app.
    operationalRole: "viewer",
    permissions: {
      canViewMenu: true,
      canViewRecipes: true,
      canViewOperationalNotes: true,
      canUpdateShoppingList: true,
      canMarkPantryItems: true,
      canAddManualItems: true,
      canApproveMenu: false,
      canEditAllergies: false,
      canEditRoles: false,
    },
    createdAt: NOW,
  },
];

export const DEMO_DIETARY_PROFILES: DietaryProfile[] = [
  {
    id: "70000000-0000-4000-8000-000000000001",
    householdId: DEMO_HOUSEHOLD_ID,
    memberId: DEMO_MEMBER_IDS.luca,
    allergies: [],
    intolerances: [],
    restrictions: [{ id: "dr-1", ingredient: "frattaglie", reason: "non gradite" }],
    dislikes: [{ id: "dl-1", ingredientOrDish: "frattaglie" }],
    preferredDishes: ["Pasta e fagioli", "Sgombro al forno con patate e olive"],
    dislikedTextures: [],
    familyNotes: null,
    opennessToNewDishes: "media",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "70000000-0000-4000-8000-000000000002",
    householdId: DEMO_HOUSEHOLD_ID,
    memberId: DEMO_MEMBER_IDS.moglie,
    allergies: [],
    intolerances: [{ id: "int-1", substance: "lattosio", notes: "lieve, tollera piccole quantità" }],
    restrictions: [],
    dislikes: [],
    preferredDishes: ["Cous cous di verdure e ceci"],
    dislikedTextures: [],
    familyNotes: null,
    opennessToNewDishes: "alta",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "70000000-0000-4000-8000-000000000003",
    householdId: DEMO_HOUSEHOLD_ID,
    memberId: DEMO_MEMBER_IDS.figlia,
    allergies: [],
    intolerances: [],
    restrictions: [],
    dislikes: [{ id: "dl-2", ingredientOrDish: "cime di rapa" }],
    preferredDishes: ["Pasta con pomodorini e basilico"],
    dislikedTextures: ["verdure filacciose", "pesce con lische"],
    familyNotes: "Preferisce porzioni più piccole e sapori delicati.",
    opennessToNewDishes: "bassa",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const DEMO_PREFERENCES: HouseholdPreferences = {
  id: "80000000-0000-4000-8000-000000000001",
  householdId: DEMO_HOUSEHOLD_ID,
  favoriteDishes: ["Pasta e fagioli", "Salmone al vapore con broccoli"],
  dislikedDishes: ["Fritture miste"],
  favoriteVegetables: ["zucchine", "pomodori", "carote", "broccoli"],
  favoriteFish: ["merluzzo", "salmone", "sgombro"],
  favoriteLegumes: ["ceci", "lenticchie", "fagioli borlotti"],
  favoriteBreakfasts: ["Yogurt, frutta fresca e granola", "Porridge d'avena con frutta secca"],
  updatedAt: NOW,
};

export function getMemberById(id: string): HouseholdMember | undefined {
  return DEMO_MEMBERS.find((m) => m.id === id);
}

export function getUserById(id: string): AppUser | undefined {
  return DEMO_USERS.find((u) => u.id === id);
}

export function getRoleForUser(userId: string): HouseholdUserRole | undefined {
  return DEMO_ROLES.find((r) => r.userId === userId);
}
