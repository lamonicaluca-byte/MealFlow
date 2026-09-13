import {
  MEAL_FEEDBACK_TAG_LABELS,
  MEAL_SLOT_LABELS,
  WEEKDAY_LABELS,
  WEEKDAYS,
  defaultSlotsForDay,
} from "@/types/domain";
import type { GenerateMealAlternativesInput, HouseholdContext, RegenerateMealInput } from "./types";

/**
 * Blocco di regole familiari condiviso da tutte le chiamate al provider AI
 * reale (§ generazione menu): stesse informazioni che il provider mock
 * applica come codice, qui tradotte in testo perché il modello le rispetti
 * nel ragionamento. Le regole di sicurezza (allergie) restano comunque
 * verificate anche dopo, con `validateGeneratedWeek`: il testo del prompt
 * non è mai l'unica barriera.
 */
export function buildHouseholdRulesText(context: HouseholdContext): string {
  const { household, members, dietaryProfiles, preferences } = context;
  const memberById = new Map(members.map((m) => [m.id, m]));
  const lines: string[] = [];

  lines.push("## Composizione della famiglia");
  for (const member of members) {
    const age = member.age !== null ? `${member.age} anni` : member.ageGroup;
    lines.push(`- ${member.displayName} (${age})`);
  }

  lines.push("", "## Regole di sicurezza alimentare (VINCOLANTI, mai derogabili)");
  let hasSafetyRule = false;
  for (const profile of dietaryProfiles) {
    const member = memberById.get(profile.memberId);
    const name = member?.displayName ?? "un membro della famiglia";
    for (const allergy of profile.allergies) {
      hasSafetyRule = true;
      lines.push(
        `- ALLERGIA (${allergy.severity}) di ${name} a "${allergy.allergen}"${allergy.notes ? ` — ${allergy.notes}` : ""}: NON includere questo allergene, nemmeno in tracce, in nessuna ricetta.`,
      );
    }
    for (const intolerance of profile.intolerances) {
      hasSafetyRule = true;
      lines.push(
        `- Intolleranza di ${name} a "${intolerance.substance}"${intolerance.notes ? ` — ${intolerance.notes}` : ""}: evita questo ingrediente.`,
      );
    }
    for (const restriction of profile.restrictions) {
      hasSafetyRule = true;
      lines.push(
        `- Esclusione per ${name}: "${restriction.ingredient}"${restriction.reason ? ` (${restriction.reason})` : ""}.`,
      );
    }
  }
  if (!hasSafetyRule) lines.push("- Nessuna allergia, intolleranza o esclusione registrata.");

  lines.push("", "## Preferenze e avversioni (regole soft: rispettale quando possibile)");
  for (const profile of dietaryProfiles) {
    const member = memberById.get(profile.memberId);
    const name = member?.displayName ?? "un membro della famiglia";
    if (profile.dislikes.length) {
      lines.push(`- ${name} non gradisce: ${profile.dislikes.map((d) => d.ingredientOrDish).join(", ")}.`);
    }
    if (profile.preferredDishes.length) {
      lines.push(`- ${name} apprezza in particolare: ${profile.preferredDishes.join(", ")}.`);
    }
    if (profile.dislikedTextures.length) {
      lines.push(`- ${name} preferisce evitare consistenze: ${profile.dislikedTextures.join(", ")}.`);
    }
    if (profile.familyNotes) lines.push(`- Nota per ${name}: ${profile.familyNotes}`);
  }
  if (preferences.favoriteDishes.length) lines.push(`- Piatti preferiti in famiglia: ${preferences.favoriteDishes.join(", ")}.`);
  if (preferences.dislikedDishes.length) lines.push(`- Piatti da NON riproporre: ${preferences.dislikedDishes.join(", ")}.`);
  if (preferences.favoriteVegetables.length) lines.push(`- Verdure preferite: ${preferences.favoriteVegetables.join(", ")}.`);
  if (preferences.favoriteFish.length) lines.push(`- Pesce preferito: ${preferences.favoriteFish.join(", ")}.`);
  if (preferences.favoriteLegumes.length) lines.push(`- Legumi preferiti: ${preferences.favoriteLegumes.join(", ")}.`);
  if (preferences.favoriteBreakfasts.length) lines.push(`- Colazioni preferite: ${preferences.favoriteBreakfasts.join(", ")}.`);

  const recentAvoid = (context.recentFeedback ?? []).filter((f) => f.tags.includes("da_non_riproporre"));
  if (recentAvoid.length) {
    lines.push("", "## Piatti da NON riproporre (feedback recente della famiglia)");
    for (const entry of recentAvoid) {
      const tagLabels = entry.tags.map((t) => MEAL_FEEDBACK_TAG_LABELS[t]).join(", ");
      const who = entry.submittedByName ? ` (segnalato da ${entry.submittedByName})` : "";
      const note = entry.note ? ` — nota: "${entry.note}"` : "";
      lines.push(`- "${entry.recipeName}"${who}: ${tagLabels}${note}. Evita questo piatto o varianti molto simili.`);
    }
  }

  if (context.recentRecipeNames?.length) {
    lines.push(
      "",
      "## Piatti già proposti nelle 1-2 settimane precedenti (varia, non ripeterli identici)",
      `${context.recentRecipeNames.join(", ")}.`,
    );
  }

  lines.push("", "## Impostazioni della famiglia");
  lines.push(`- Tempo massimo di preparazione nei giorni feriali: ${household.settings.maxPrepMinutesWeekday} minuti.`);
  lines.push(`- Tempo massimo di preparazione nel weekend: ${household.settings.maxPrepMinutesWeekend} minuti.`);
  lines.push(`- Livello di budget: ${household.settings.budgetLevel}.`);
  lines.push(`- Livello di varietà desiderato: ${household.settings.varietyLevel}.`);
  if (household.settings.chalikaCookingDays.length) {
    const days = household.settings.chalikaCookingDays.map((d) => WEEKDAY_LABELS[d]).join(", ");
    lines.push(`- Nei giorni in cui cucina Chalika (${days}), preferisci ricette semplici con pochi passaggi.`);
  }

  lines.push(
    "",
    "## Equilibrio nutrizionale della settimana (piramide alimentare mediterranea, SINU 2025)",
    "Il menu di ciascuna settimana deve rispettare, nel complesso, queste frequenze e questi principi (regole soft: derogabili solo se in conflitto con le regole di sicurezza sopra, mai per comodità):",
    "- Pesce: 2-3 pasti a settimana, prediligendo pesce azzurro o locale (es. sgombro, alici, sardine) al posto di tonno o pesce spada, a meno che non sia impossibile per un'allergia al pesce in famiglia.",
    "- Legumi: almeno 3 pasti a settimana, da soli o abbinati a cereali/verdure.",
    "- Carne bianca (pollo, tacchino) e uova: consumo settimanale (poche volte a settimana ciascuno), non tutti i giorni.",
    "- Formaggio: consumo settimanale, non quotidiano; quando presente in un piatto, preferire formaggi freschi (ricotta, mozzarella, feta) a quelli stagionati e molto salati.",
    "- Carne rossa: al massimo 1 pasto a settimana, di consumo occasionale. Niente salumi o carne processata come piatto principale.",
    "- Patate: al massimo 1-2 pasti a settimana, e mai nello stesso pasto insieme a un altro cereale (pasta, riso o pane): in quel pasto le patate sostituiscono il cereale, non lo affiancano.",
    "- In ogni pranzo e cena includere verdura, condendo preferibilmente con olio extravergine di oliva; per i cereali (pasta, riso, pane), preferire le versioni integrali quando ha senso per la ricetta.",
    "- Dolci con zuccheri aggiunti solo per occasioni speciali, mai come piatto principale o contorno abituale del pasto.",
    "- Moderazione nel sale: preferire spezie ed erbe aromatiche per insaporire.",
  );

  lines.push("", "## Regole fisse dell'app (sempre valide)");
  lines.push("- Struttura della settimana: lunedì-venerdì colazione e cena; sabato e domenica anche il pranzo.");
  lines.push(
    "- Varia le ricette all'interno della stessa settimana: non ripetere lo stesso piatto principale due volte.",
    "- Varia anche rispetto alle settimane precedenti: evita di riproporre uno stesso piatto identico da una settimana alla successiva (vedi elenco sopra, se presente).",
  );

  return lines.join("\n");
}

const FORMAT_INSTRUCTIONS =
  'Rispondi ESCLUSIVAMENTE chiamando lo strumento fornito, con tutti i campi richiesti valorizzati. Per "id" di ogni ricetta usa uno slug leggibile in minuscolo con trattini (es. "pasta-e-fagioli"), univoco all\'interno della risposta. Scrivi in italiano.';

export function buildWeeklyMenuUserPrompt(context: HouseholdContext, weekStartDate: string): string {
  const dayPlan = WEEKDAYS.map((day) => {
    const slots = defaultSlotsForDay(day).map((s) => MEAL_SLOT_LABELS[s]).join(", ");
    return `- ${WEEKDAY_LABELS[day]}: ${slots}`;
  }).join("\n");

  return [
    buildHouseholdRulesText(context),
    "",
    `## Richiesta`,
    `Genera il menu completo per la settimana che inizia lunedì ${weekStartDate}, con questi pasti da coprire ogni giorno:`,
    dayPlan,
    "",
    FORMAT_INSTRUCTIONS,
  ].join("\n");
}

export function buildRegenerateMealUserPrompt(input: RegenerateMealInput): string {
  const { context, day, slot, currentRecipeName, reason, reasonNote } = input;
  const lines = [
    buildHouseholdRulesText(context),
    "",
    "## Richiesta",
    `Proponi UNA nuova ricetta per ${MEAL_SLOT_LABELS[slot]} di ${WEEKDAY_LABELS[day]}, in sostituzione di${
      currentRecipeName ? ` "${currentRecipeName}"` : " un pasto"
    }.`,
  ];
  if (reason) lines.push(`Motivo della sostituzione: ${reason}${reasonNote ? ` — ${reasonNote}` : ""}.`);
  lines.push("La nuova ricetta deve essere diversa da quella sostituita.", "", FORMAT_INSTRUCTIONS);
  return lines.join("\n");
}

export function buildAlternativesUserPrompt(input: GenerateMealAlternativesInput): string {
  const { context, day, slot, currentRecipeName, reason, reasonNote } = input;
  const lines = [
    buildHouseholdRulesText(context),
    "",
    "## Richiesta",
    `Proponi fino a 7 alternative per ${MEAL_SLOT_LABELS[slot]} di ${WEEKDAY_LABELS[day]}, in sostituzione di${
      currentRecipeName ? ` "${currentRecipeName}"` : " un pasto"
    }, una per ciascuna di queste categorie (salta quelle che non hanno senso per questo pasto): simile alla proposta originale, più veloce, diversa ma compatibile, vegetariana, più economica, pronta in meno di 20 minuti, adatta alla preparazione anticipata.`,
  ];
  if (reason) lines.push(`Motivo della richiesta: ${reason}${reasonNote ? ` — ${reasonNote}` : ""}.`);
  lines.push("", FORMAT_INSTRUCTIONS);
  return lines.join("\n");
}
