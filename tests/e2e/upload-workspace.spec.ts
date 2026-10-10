import { expect, test } from "@playwright/test";
import path from "node:path";

const paperPath = path.resolve("proofs/odd-sum-square/odd-sum-square-paper.pdf");
const leanPath = path.resolve("proofs/odd-sum-square/lean/Main.lean");

test("opens a temporary paper and optional Lean workspace", async ({ page }) => {
  let requestBody: Record<string, unknown> | undefined;
  await page.route("**/api/explain-upload", async (route) => {
    requestBody = route.request().postDataJSON() as Record<string, unknown>;
    const context = {
      type: "context",
      context: {
        selection: { text: "theorem", sourceType: "lean", locationLabel: "Uploaded Lean" },
        sources: [{ id: "uploaded-lean-selection", type: "lean", label: "Uploaded Lean · Main.lean", file: "Main.lean", declaration: "Uploaded selection", revision: "unverified-upload" }],
        verification: { status: "not-run", revision: null, toolchain: null, checkedAt: null, sorryCount: null, axiomCount: null },
      },
    };
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `event: context\ndata: ${JSON.stringify(context)}\n\nevent: delta\ndata: ${JSON.stringify({ type: "delta", text: "This theorem introduces the claim." })}\n\nevent: completed\ndata: ${JSON.stringify({ type: "completed", responseId: "test", suggestions: [] })}\n\n`,
    });
  });

  await page.goto("/upload");
  await expect(page.getByRole("heading", { name: /Bring a paper/ })).toBeVisible();
  await page.getByLabel(/Paper PDF/).setInputFiles(paperPath);
  await page.getByLabel(/Lean source/).setInputFiles(leanPath);
  await page.getByLabel(/I have permission/).check();
  await page.getByRole("button", { name: "Open temporary workspace" }).click();

  await expect(page.getByRole("heading", { name: "paper" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("tab", { name: /Uploaded Lean/ })).toContainText("Unverified");
  await page.getByRole("tab", { name: /Uploaded Lean/ }).click();
  await expect(page.getByText("Not verified")).toBeVisible();
  await page.getByRole("button", { name: "Explain this Lean file" }).click();
  await page.getByRole("button", { name: "Explain selection" }).click();

  await expect(page.getByText("This theorem introduces the claim.")).toBeVisible();
  await page.getByText("Sources used for this explanation", { exact: true }).click();
  await expect(page.getByText("Uploaded Lean · not verified")).toBeVisible();
  expect(requestBody?.rightsConfirmed).toBe(true);
  expect(requestBody).not.toHaveProperty("proofId");
  expect(JSON.stringify(requestBody)).not.toContain("application/pdf");

  await page.getByRole("button", { name: "Clear workspace" }).click();
  await expect(page.getByRole("heading", { name: /Bring a paper/ })).toBeVisible();
});

test("requires consent before opening files", async ({ page }) => {
  await page.goto("/upload");
  await page.getByLabel(/Paper PDF/).setInputFiles(paperPath);
  await page.getByRole("button", { name: "Open temporary workspace" }).click();
  await expect(page.getByText("Confirm that you may use these files.", { exact: true })).toBeVisible();
});

test("explains a late repeated Lean selection with its actual neighboring context", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let requestBody: { selection: { selectedText: string; surroundingText: string } } | undefined;
  await page.route("**/api/explain-upload", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "text/event-stream", body: 'event: completed\ndata: {"type":"completed","responseId":"test","suggestions":[]}\n\n' });
  });
  const source = "-- opening region\ntheorem repeated : True := by trivial\n"
    + "-- unrelated earlier material\n".repeat(650)
    + "-- nearby definition at the selected location\ntheorem repeated : True := by trivial\n-- following lemma";
  await page.goto("/upload");
  await page.getByLabel(/Paper PDF/).setInputFiles(paperPath);
  await page.getByLabel(/Lean source/).setInputFiles({ name: "Long.lean", mimeType: "text/plain", buffer: Buffer.from(source) });
  await page.getByLabel(/I have permission/).check();
  await page.getByRole("button", { name: "Open temporary workspace" }).click();
  await page.getByRole("tab", { name: /Uploaded Lean/ }).click();
  const lean = page.getByTestId("uploaded-lean-source");
  await lean.evaluate((element) => {
    const node = element.querySelector("code")!.firstChild!;
    const start = node.textContent!.lastIndexOf("theorem repeated");
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + "theorem repeated : True".length);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Explain selection" }).click();
  await expect.poll(() => requestBody?.selection.surroundingText).toContain("nearby definition at the selected location");
  expect(requestBody?.selection.surroundingText).toContain("following lemma");
  expect(requestBody?.selection.surroundingText).not.toContain("opening region");
  expect(requestBody?.selection.surroundingText.length).toBeLessThanOrEqual(12_000);
  expect(requestBody?.selection.selectedText).toBe("theorem repeated : True");
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("selection-context.png") });
});
