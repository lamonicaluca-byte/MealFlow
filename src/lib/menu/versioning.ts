import type { Meal, MenuVersion, WeeklyMenu } from "@/types/domain";
import { generateId } from "@/lib/utils";

export interface ApplyMealUpdateParams {
  menu: WeeklyMenu;
  currentVersion: MenuVersion;
  /** Tutti i pasti della versione corrente, con l'aggiornamento già applicato al pasto interessato. */
  updatedMeals: Meal[];
  changeReason: string | null;
  actorId: string;
  now: string;
}

export interface ApplyMealUpdateResult {
  menu: WeeklyMenu;
  version: MenuVersion;
  meals: Meal[];
  /** true se è stata creata una nuova versione (menu già approvato in precedenza). */
  versionWasCreated: boolean;
}

/**
 * Applica un aggiornamento a uno o più pasti rispettando il versioning
 * (§11, §13): se il menu è già stato approvato, la modifica NON sovrascrive
 * la versione approvata (che resta immutabile e consultabile nello storico)
 * ma ne crea una nuova, collegata alla precedente tramite
 * `previousVersionId`. Se il menu non è ancora stato approvato (draft /
 * generated / pending_approval), la versione corrente viene aggiornata in
 * place: non c'è ancora nulla da preservare.
 */
export function applyMealUpdate(params: ApplyMealUpdateParams): ApplyMealUpdateResult {
  const { menu, currentVersion, updatedMeals, changeReason, actorId, now } = params;

  const menuWasApproved = menu.status === "approved" || menu.status === "modified_after_approval";

  if (!menuWasApproved) {
    return {
      menu: { ...menu, updatedAt: now },
      version: currentVersion,
      meals: updatedMeals,
      versionWasCreated: false,
    };
  }

  const newVersionId = generateId("ver");
  const newVersion: MenuVersion = {
    id: newVersionId,
    menuId: menu.id,
    versionNumber: currentVersion.versionNumber + 1,
    previousVersionId: currentVersion.id,
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    changeReason,
    createdAt: now,
    createdBy: actorId,
    isImmutable: false,
  };

  const meals = updatedMeals.map((m) => ({ ...m, menuVersionId: newVersionId, updatedAt: now, updatedBy: actorId }));

  const newMenu: WeeklyMenu = {
    ...menu,
    status: "modified_after_approval",
    currentVersionId: newVersionId,
    updatedAt: now,
  };

  return { menu: newMenu, version: newVersion, meals, versionWasCreated: true };
}
