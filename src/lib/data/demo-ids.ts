/**
 * Identificativi statici usati dal seed demo. Non sono UUID generati a
 * runtime (che cambierebbero a ogni riavvio): sono fissi per rendere i dati
 * demo prevedibili nei test e riconoscibili come tali durante l'onboarding.
 */
export const DEMO_HOUSEHOLD_ID = "10000000-0000-4000-8000-000000000001";

export const DEMO_USER_IDS = {
  luca: "20000000-0000-4000-8000-000000000001",
  moglie: "20000000-0000-4000-8000-000000000002",
  chalika: "20000000-0000-4000-8000-000000000003",
} as const;

export const DEMO_MEMBER_IDS = {
  luca: "30000000-0000-4000-8000-000000000001",
  moglie: "30000000-0000-4000-8000-000000000002",
  figlia: "30000000-0000-4000-8000-000000000003",
  chalika: "30000000-0000-4000-8000-000000000004",
} as const;

export const DEMO_MENU_ID = "40000000-0000-4000-8000-000000000001";
export const DEMO_MENU_VERSION_ID = "40000000-0000-4000-8000-000000000002";
export const DEMO_SHOPPING_LIST_ID = "50000000-0000-4000-8000-000000000001";
