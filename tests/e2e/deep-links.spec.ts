import { expect, test } from "@playwright/test";

test("restores paper and Lean locations from canonical links", async ({ page }) => {
  await page.goto("/proofs/odd-sum-square?source=paper&page=1&mapping=odd-sum-theorem");
  await expect(page.getByText("Why Odd Numbers Build Perfect Squares · page 1")).toBeVisible();

  await page.goto("/proofs/odd-sum-square?source=lean&declaration=oddSum_eq_square&mapping=odd-sum-theorem");
  await expect(page.getByRole("main", { name: "lean source" }).getByText("oddSum_eq_square", { exact: true })).toBeVisible();
});

test("canonicalizes an unknown saved location without crashing", async ({ page }) => {
  await page.goto("/proofs/odd-sum-square?source=lean&declaration=missing&mapping=odd-sum-theorem");
  await expect(page.getByText(/saved location is no longer available/i)).toBeVisible();
  await expect(page).toHaveURL(/\/proofs\/odd-sum-square$/);
});
