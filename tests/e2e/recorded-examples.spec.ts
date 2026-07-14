import { expect, test } from "@playwright/test";

test("shows clearly recorded paper and Lean examples without a model request", async ({ page }) => {
  let explainRequests = 0;
  page.on("request", (request) => { if (request.url().includes("/api/explain")) explainRequests += 1; });
  await page.goto("/proofs/odd-sum-square");
  await page.getByRole("button", { name: "View paper example" }).click();
  await expect(page.getByText("Recorded example", { exact: true })).toBeVisible();
  await expect(page.getByText(/No model request is being made/)).toBeVisible();
  await expect(page.getByText(/running total of the first n odd numbers/)).toBeVisible();
  expect(explainRequests).toBe(0);
  await page.getByRole("button", { name: "Close panel" }).click();
  await page.getByRole("button", { name: "View Lean example" }).click();
  await expect(page.getByText(/Lean splits the theorem/)).toBeVisible();
  expect(explainRequests).toBe(0);
});
