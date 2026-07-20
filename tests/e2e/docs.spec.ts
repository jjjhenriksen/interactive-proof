import { expect, test } from "@playwright/test";

test("publishes setup guidance before API-key configuration", async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await page.goto("/docs");

  await expect(page.getByRole("heading", { level: 1, name: "From paper to grounded explanation." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Documentation sections" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Documentation", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enable live AI explanations." })).toBeVisible();
  await expect(page.getByText("OPENAI_API_KEY=your_key_here", { exact: false })).toBeVisible();
  await expect(page.getByText("NEXT_PUBLIC_", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /evaluation and security methodology/i })).toHaveAttribute(
    "href",
    "/methodology",
  );

  await page.getByRole("link", { name: "Open an upload workspace" }).click();
  await expect(page).toHaveURL(/\/upload$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Bring a paper. Add Lean when you have it." }),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
