import { expect, test, type Locator, type Page } from "@playwright/test";

const PROOF_PATH = "/proofs/cycle-double-cover";

async function openProof(page: Page): Promise<void> {
  await page.goto(PROOF_PATH, { waitUntil: "networkidle" });
}

async function selectSourceBlock(block: Locator): Promise<string> {
  const selectedText = (await block.textContent())?.trim();
  expect(selectedText).toBeTruthy();

  await block.evaluate((element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("Expected an HTML source block");
    }

    element.focus();
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });

  return selectedText ?? "";
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

test("opens More details for a paper selection and restores focus on dismissal", async ({
  page,
}) => {
  await openProof(page);

  const sourceBlock = page.locator('[data-source-block="page-1-block-3"]');
  const selectedText = await selectSourceBlock(sourceBlock);
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
  await expect(sourceBlock).toBeFocused();
});

test("dismisses the contextual toolbar with Escape", async ({ page }) => {
  await openProof(page);

  await selectSourceBlock(page.locator('[data-source-block="page-1-block-3"]'));
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
