import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MealFeedbackForm } from "@/components/meal/meal-feedback-form";

describe("MealFeedbackForm", () => {
  it("invia i tag selezionati, senza voti o punteggi", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<MealFeedbackForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Piaciuto a tutti" }));
    await user.click(screen.getByRole("button", { name: "Da riproporre" }));
    await user.click(screen.getByRole("button", { name: "Invia feedback" }));

    expect(onSubmit).toHaveBeenCalledWith(["piaciuto_a_tutti", "da_riproporre"], null);
    expect(await screen.findByText(/Grazie/)).toBeInTheDocument();
  });

  it("disabilita l'invio finché non è selezionato almeno un tag", () => {
    render(<MealFeedbackForm onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Invia feedback" })).toBeDisabled();
  });
});
