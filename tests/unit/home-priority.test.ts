import { describe, expect, it } from "vitest";

import { computeHomePriority, weekdayFromDate } from "@/lib/home/home-priority";

describe("computeHomePriority", () => {
  it("dà priorità al controllo del menu il giovedì se c'è un'approvazione in attesa", () => {
    const thursday = new Date("2026-09-03T10:00:00"); // giovedì
    const result = computeHomePriority({
      now: thursday,
      shoppingDay: "sabato",
      hasPendingApprovalForNextWeek: true,
      hasItemsLeftToBuy: false,
    });
    expect(result.kind).toBe("review_menu");
  });

  it("dà priorità al promemoria di approvazione il venerdì", () => {
    const friday = new Date("2026-09-04T10:00:00");
    const result = computeHomePriority({
      now: friday,
      shoppingDay: "sabato",
      hasPendingApprovalForNextWeek: true,
      hasItemsLeftToBuy: false,
    });
    expect(result.kind).toBe("approval_pending");
  });

  it("segnala gli articoli mancanti nel giorno della spesa", () => {
    const saturday = new Date("2026-09-05T10:00:00");
    const result = computeHomePriority({
      now: saturday,
      shoppingDay: "sabato",
      hasPendingApprovalForNextWeek: false,
      hasItemsLeftToBuy: true,
    });
    expect(result.kind).toBe("shopping_missing");
  });

  it("propone la settimana successiva la domenica sera", () => {
    const sundayEvening = new Date("2026-09-06T19:00:00");
    const result = computeHomePriority({
      now: sundayEvening,
      shoppingDay: "sabato",
      hasPendingApprovalForNextWeek: false,
      hasItemsLeftToBuy: false,
    });
    expect(result.kind).toBe("next_week");
  });

  it("torna al prossimo pasto come fallback", () => {
    const tuesdayMorning = new Date("2026-09-01T09:00:00");
    const result = computeHomePriority({
      now: tuesdayMorning,
      shoppingDay: "sabato",
      hasPendingApprovalForNextWeek: false,
      hasItemsLeftToBuy: false,
    });
    expect(result.kind).toBe("next_meal");
  });

  it("mappa correttamente i giorni JS ai weekday italiani", () => {
    expect(weekdayFromDate(new Date("2026-08-31T12:00:00"))).toBe("lunedi");
    expect(weekdayFromDate(new Date("2026-09-06T12:00:00"))).toBe("domenica");
  });
});
