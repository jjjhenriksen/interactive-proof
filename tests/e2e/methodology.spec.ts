import { expect, test } from "@playwright/test";

test("publishes the fixed methodology without inventing a live score", async ({ page }) => {
  await page.goto("/methodology");

  await expect(
    page.getByRole("heading", { name: "Show the method before claiming the score." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "No reviewed live run yet" })).toBeVisible();
  await expect(page.getByText("not run", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /14 representative reading problems/ })).toBeVisible();
  await expect(page.getByText("0 / 12")).toHaveCount(0);
  await expect(page.getByText(/perfect score/i)).toHaveCount(0);
});
