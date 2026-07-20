import { expect, test, type Locator, type Page } from "@playwright/test";

const PROOF_PATH = "/proofs/odd-sum-square";

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

  const headingText = textLayer.locator("span").filter({ hasText: /^PROOF BY INDUCTION$/ }).first();
  await expect(headingText).toBeAttached();
  await headingText.evaluate((node) => {
    if (!node.firstChild) {
      throw new Error("The PDF heading text items were not found");
    }

    const range = document.createRange();
    range.setStart(node.firstChild, 0);
    range.setEnd(node.firstChild, node.firstChild.textContent?.length ?? 0);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await textLayer.dispatchEvent("pointerup", { button: 0 });

  return { anchor: textLayer, selectedText: "PROOF BY INDUCTION" };
}

async function waitForExplanationOrError(page: Page): Promise<void> {
  const answerSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "In plain English" }),
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
  const oddSumSquareCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Odd Numbers Build Squares" }),
  });
  await oddSumSquareCard.getByRole("link", { name: /Read this proof/ }).click();

  await expect(page).toHaveURL(new RegExp(`${PROOF_PATH}$`));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Why the First n Odd Numbers Sum to n²",
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

test("shows the recorded proof details", async ({ page }) => {
  await page.goto("/proofs/odd-sum-square", { waitUntil: "networkidle" });

  const evidence = page.getByText("Proof details", { exact: true });
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
