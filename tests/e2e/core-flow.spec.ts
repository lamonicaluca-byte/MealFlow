import { test, expect } from "@playwright/test";

test.describe("Flusso principale MealFlow (demo)", () => {
  test("login rapido, consultazione menu e approvazione", async ({ page }) => {
    await page.goto("/");

    // Splash → login (nessuna sessione demo attiva)
    await expect(page.getByText("Meno decisioni, più tempo insieme.")).toBeVisible();
    await page.waitForURL("**/login", { timeout: 5000 });

    await page.getByRole("button", { name: "Accedi come Luca" }).click();
    await page.waitForURL("**/home");
    await expect(page.getByRole("heading", { name: /Ciao Luca/ })).toBeVisible();

    // Menu settimanale
    await page.getByRole("link", { name: "Menu" }).first().click();
    await page.waitForURL("**/menu");
    await expect(page.getByRole("heading", { name: "Menu settimanale" })).toBeVisible();

    // Approvazione (idempotente: può essere già stata approvata in un run precedente)
    await page.goto("/menu/approvazione");
    const approveButton = page.getByRole("button", { name: "Approva il menu" });
    if (await approveButton.isVisible().catch(() => false)) {
      await approveButton.click();
      await expect(page.getByText(/APPROVATO DA LUCA/i).first()).toBeVisible();
    } else {
      await expect(page.getByText("Nessuna approvazione in attesa")).toBeVisible();
    }

    // Lista della spesa: deve mostrare l'avanzamento
    await page.goto("/spesa");
    await expect(page.getByText(/PRODOTTI ACQUISTATI SU/)).toBeVisible();
  });

  test("Chalika non vede l'azione di approvazione", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Accedi come Chalika" }).click();
    await page.waitForURL("**/home");

    await page.goto("/menu/approvazione");
    await expect(page.getByRole("button", { name: "Approva il menu" })).toHaveCount(0);
  });
});
