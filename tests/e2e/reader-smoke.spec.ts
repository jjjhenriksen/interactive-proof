import { expect, test, type Locator, type Page } from "@playwright/test";

const PROOF_PATH = "/proofs/cycle-double-cover";

async function openProof(page: Page): Promise<void> {
  await page.goto(PROOF_PATH, { waitUntil: "networkidle" });
}

async function selectPdfHeading(page: Page): Promise<{
  anchor: Locator;
  selectedText: string;
}> {
  const reader = page.getByTestId("pdf-paper-reader");
  const textLayer = page.getByTestId("pdf-text-layer");
  await expect(reader).toHaveAttribute("aria-busy", "false", { timeout: 20_000 });

  const headingText = textLayer.locator("span").filter({ hasText: /^Introduction$/ }).first();
  await expect(headingText).toBeAttached();
  await headingText.evaluate((node) => {
    const layer = node.closest('[data-testid="pdf-text-layer"]');
    const spans = Array.from(layer?.querySelectorAll<HTMLSpanElement>("span") ?? []);
    const headingIndex = spans.indexOf(node as HTMLSpanElement);
    const headingNumber = spans
      .slice(0, headingIndex)
      .reverse()
      .find((span) => span.textContent?.trim() === "1.");
    if (!headingNumber?.firstChild || !node.firstChild) {
      throw new Error("The PDF heading text items were not found");
    }

    const range = document.createRange();
    range.setStart(headingNumber.firstChild, 0);
    range.setEnd(node.firstChild, node.firstChild.textContent?.length ?? 0);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await textLayer.dispatchEvent("pointerup", { button: 0 });

  return { anchor: textLayer, selectedText: "1. Introduction" };
}

async function waitForExplanationOrError(page: Page): Promise<void> {
  const answerSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Explanation" }),
  });
  const statusRegion = answerSection.locator('[aria-live="polite"]');
  const error = answerSection.getByRole("alert");

  await expect
    .poll(
      async () => {
        if (await error.isVisible()) return "error";

        const statusText = (await statusRegion.textContent())?.trim() ?? "";
        if (
          statusText.length > 0 &&
          !statusText.includes("Gathering the mapped paper and Lean context")
        ) {
          return "explanation";
        }

        return "pending";
      },
      {
        message: "expected an explanation or an explicit configuration/error state",
        timeout: 15_000,
      },
    )
    .toMatch(/^(explanation|error)$/);
}

test("opens the proof reader from the homepage", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "Stay with the proof when one step stops you." }),
  ).toBeVisible();
  const cycleDoubleCoverCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Cycle Double Cover" }),
  });
  await cycleDoubleCoverCard.getByRole("link", { name: /Read this proof/ }).click();

  await expect(page).toHaveURL(new RegExp(`${PROOF_PATH}$`));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "A Proof of the Cycle Double Cover Conjecture",
    }),
  ).toBeVisible();
  await expect(page.getByRole("main", { name: "paper source" })).toBeVisible();
});

test("switches between the paper and Lean source views", async ({ page }) => {
  await openProof(page);

  const sourceChoice = page.getByRole("group", { name: "Choose source view" });
  const paperButton = sourceChoice.getByRole("button", { name: "Paper" });
  const leanButton = sourceChoice.getByRole("button", { name: "Lean" });

  await expect(paperButton).toHaveAttribute("aria-pressed", "true");
  await leanButton.click();
  await expect(leanButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("main", { name: "lean source" })).toBeVisible();
  await expect(page.locator("pre").first()).toBeVisible();

  await paperButton.click();
  await expect(paperButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("main", { name: "paper source" })).toBeVisible();
});

test("shows the recorded verification evidence", async ({ page }) => {
  await page.goto("/proofs/odd-sum-square", { waitUntil: "networkidle" });

  const evidence = page.getByText("Verification evidence", { exact: true });
  await evidence.click();
  await expect(page.getByText("leanprover/lean4:v4.29.1", { exact: true })).toBeVisible();
  await expect(page.getByText("lean lean/Main.lean", { exact: true })).toBeVisible();
  await expect(page.getByText("oddSum_eq_square", { exact: true })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "propext" })).toBeVisible();
});

test("opens More details for a paper selection and restores focus on dismissal", async ({
  page,
}) => {
  await openProof(page);

  const { anchor, selectedText } = await selectPdfHeading(page);
  const toolbar = page.getByRole("toolbar", { name: "Explain selected passage" });

  await expect(toolbar).toBeVisible();
  const moreDetails = toolbar.getByRole("button", { name: "More details" });
  await expect(moreDetails).toBeFocused();

  await moreDetails.click();
  const panelHeading = page.getByRole("heading", { name: "More about this passage" });
  await expect(panelHeading).toBeVisible();
  await expect(panelHeading).toBeFocused();
  await expect(page.getByRole("blockquote")).toHaveText(selectedText);
  await waitForExplanationOrError(page);

  await page.keyboard.press("Escape");
  await expect(panelHeading).toBeHidden();
  await expect(anchor).toBeFocused();
});

test("dismisses the contextual toolbar with Escape", async ({ page }) => {
  await openProof(page);

  await selectPdfHeading(page);
  const toolbar = page.getByRole("toolbar", { name: "Explain selected passage" });
  await expect(toolbar).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(toolbar).toBeHidden();
});

test("returns a designed 404 for an unknown proof package", async ({ page }) => {
  const response = await page.goto("/proofs/not-a-real-proof");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This proof is not in the reading room." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to the proof index" })).toBeVisible();
});
