import path from "node:path"

import { expect, test, type Locator, type Page } from "@playwright/test"

const PROOF_PATH = "/proofs/cycle-double-cover"

type ExplainBody = {
  mode: string
  question?: string
  history: Array<{ role: "user" | "assistant"; text: string }>
}

const publicContext = {
  sources: [
    {
      id: "page-1-block-4",
      type: "paper",
      label: "Theorem 1.1 · Paper p. 1",
      page: 1,
    },
    {
      id: "lean-main-theorem",
      type: "lean",
      label: "cycleDoubleCover_of_bridgeless excerpt",
      file: "lean/Main.lean",
      declaration: "cycleDoubleCover_of_bridgeless",
      revision: "acceptance-fixture",
    },
  ],
  verification: {
    status: "verified",
    revision: "acceptance-fixture",
    checkedAt: "2026-07-13T00:00:00.000Z",
    sorryCount: 0,
  },
  hasPrerequisiteContext: true,
}

function event(type: string, value: object): string {
  return `event: ${type}\ndata: ${JSON.stringify({ type, ...value })}\n\n`
}

function successStream(text: string): string {
  return [
    event("context", { context: publicContext }),
    event("delta", { text: text.slice(0, Math.ceil(text.length / 2)) }),
    event("delta", { text: text.slice(Math.ceil(text.length / 2)) }),
    event("completed", { responseId: "fixture-response" }),
  ].join("")
}

async function mockExplanations(page: Page): Promise<ExplainBody[]> {
  const requests: ExplainBody[] = []
  let failedOnce = false

  await page.route("**/api/explain", async (route) => {
    const body = route.request().postDataJSON() as ExplainBody
    requests.push(body)

    if (body.question === "Please fail once" && !failedOnce) {
      failedOnce = true
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          event("context", { context: publicContext }) +
          event("error", {
            code: "MODEL_ERROR",
            message: "Simulated follow-up failure.",
            requestId: "fixture-request",
            isRetryable: true,
          }),
      })
      return
    }

    const answer =
      body.question === "Why is this step needed?"
        ? "It connects the paper's endpoint to the formal declaration."
        : body.question === "What prerequisite should I review?"
          ? "Review finite bridgeless graphs before this declaration."
          : body.question === "Please fail once"
            ? "The retried follow-up completed successfully."
            : "This Lean excerpt formalizes the selected mathematical claim."

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: successStream(answer),
    })
  })

  return requests
}

async function openLean(page: Page): Promise<void> {
  await page.goto(PROOF_PATH)
  const sourceChoice = page.getByRole("group", { name: "Choose source view" })
  await sourceChoice.getByRole("button", { name: "Lean" }).click()
  await expect(page.getByRole("main", { name: "lean source" })).toBeVisible()
}

async function selectLeanText(page: Page): Promise<Locator> {
  const excerpt = page.getByRole("article", {
    name: /Curated Lean excerpt: cycleDoubleCover_of_bridgeless/,
  })
  const pre = excerpt.locator("pre")
  await expect(pre).toBeVisible()
  await pre.locator("code").evaluate((code) => {
    const text = code.firstChild
    if (!text) throw new Error("Lean excerpt text was not rendered")
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, Math.min(72, text.textContent?.length ?? 0))
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  })
  await pre.dispatchEvent("pointerup", { button: 0, pointerType: "mouse" })
  return pre
}

test.describe("grounded explanation acceptance", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop interaction flow")

  test("streams Lean context, follows sources, bounds follow-ups, and recovers", async ({
    page,
  }) => {
    const requests = await mockExplanations(page)
    await openLean(page)
    await expect(page.getByText("Curated excerpt", { exact: true }).first()).toBeVisible()

    await selectLeanText(page)
    const toolbar = page.getByRole("toolbar", { name: "Explain selected passage" })
    await toolbar.getByRole("button", { name: "Connect to Lean" }).click()

    const panel = page.getByRole("complementary", { name: "More about this passage" })
    await expect(panel).toBeVisible()
    await expect(panel.getByText("This Lean excerpt formalizes the selected mathematical claim.")).toBeVisible()
    await expect(panel.getByText("Lean verifies")).toBeVisible()

    await panel
      .getByRole("button", { name: "Open source: Theorem 1.1 · Paper p. 1" })
      .click()
    await expect(
      page
        .getByRole("group", { name: "Choose source view" })
        .getByRole("button", { name: "Paper" }),
    ).toHaveAttribute("aria-pressed", "true")

    const question = panel.getByLabel("Ask a follow-up about this selection")
    await question.fill("Why is this step needed?")
    await panel.getByRole("button", { name: "Ask" }).click()
    await expect(panel.getByText("It connects the paper's endpoint to the formal declaration.")).toBeVisible()

    await question.fill("What prerequisite should I review?")
    await panel.getByRole("button", { name: "Ask" }).click()
    const priorAnswer = panel.getByText(
      "Review finite bridgeless graphs before this declaration.",
    )
    await expect(priorAnswer).toBeVisible()

    expect(requests[1]?.history).toHaveLength(1)
    expect(requests[2]?.history).toHaveLength(3)
    expect(requests.every((request) => request.history.length <= 6)).toBe(true)

    await question.fill("Please fail once")
    await panel.getByRole("button", { name: "Ask" }).click()
    await expect(panel.getByRole("alert")).toContainText("Simulated follow-up failure.")
    await expect(priorAnswer).toBeVisible()

    const failedRequest = requests.at(-1)
    await panel.getByRole("button", { name: "Try again" }).click()
    await expect(panel.getByText("The retried follow-up completed successfully.")).toBeVisible()
    expect(requests.at(-1)).toEqual(failedRequest)
    expect(requests.every((request) => request.history.length <= 6)).toBe(true)
  })

  test("supports the core Lean explanation flow using the keyboard", async ({ page }) => {
    await mockExplanations(page)
    await page.goto(PROOF_PATH)

    const leanButton = page
      .getByRole("group", { name: "Choose source view" })
      .getByRole("button", { name: "Lean" })
    await leanButton.focus()
    await page.keyboard.press("Enter")

    const explainExcerpt = page.getByRole("button", { name: "Explain excerpt" }).first()
    await explainExcerpt.focus()
    await page.keyboard.press("Enter")

    const toolbar = page.getByRole("toolbar", { name: "Explain selected passage" })
    await expect(toolbar.getByRole("button", { name: "More details" })).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await expect(toolbar.getByRole("button", { name: "Connect to Lean" })).toBeFocused()
    await page.keyboard.press("Enter")

    const panelHeading = page.getByRole("heading", { name: "More about this passage" })
    await expect(panelHeading).toBeFocused()
    await expect(page.getByText("This Lean excerpt formalizes the selected mathematical claim.")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(explainExcerpt).toBeFocused()

    await page.keyboard.press("Enter")
    await expect(toolbar).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(explainExcerpt).toBeFocused()
  })
})

test("uses a contained touch action sheet and modal explanation sheet", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chrome", "Mobile acceptance flow")
  await page.setViewportSize({ width: 360, height: 800 })
  await page.emulateMedia({ reducedMotion: "reduce" })
  await mockExplanations(page)
  await openLean(page)

  const selectionAnchor = await selectLeanText(page)
  const toolbar = page.getByRole("toolbar", { name: "Explain selected passage" })
  const toolbarBox = await toolbar.boundingBox()
  expect(toolbarBox).not.toBeNull()
  expect(Math.abs((toolbarBox?.y ?? 0) + (toolbarBox?.height ?? 0) - 800)).toBeLessThan(2)
  await expect(toolbar.getByText("Explain this selection")).toBeVisible()

  const connectButton = toolbar.getByRole("button", { name: "Connect to Lean" })
  const connectBox = await connectButton.boundingBox()
  expect(connectBox?.height).toBeGreaterThanOrEqual(44)
  expect(
    await connectButton.evaluate((button) =>
      getComputedStyle(button)
        .transitionDuration.split(",")
        .every((duration) => Number.parseFloat(duration) <= 0.001),
    ),
  ).toBe(true)
  await connectButton.click()

  const dialog = page.getByRole("dialog", { name: "More about this passage" })
  await expect(dialog).toHaveAttribute("aria-modal", "true")
  const dialogBox = await dialog.boundingBox()
  expect(dialogBox?.x).toBe(0)
  expect(dialogBox?.y).toBe(0)
  expect(dialogBox?.width).toBe(360)
  expect(dialogBox?.height).toBe(800)
  await expect(page.getByRole("heading", { name: "More about this passage" })).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden")

  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press("Tab")
    expect(
      await dialog.evaluate((element) => element.contains(document.activeElement)),
    ).toBe(true)
  }

  await page.screenshot({
    path: path.resolve("output/playwright/accessibility-mobile-sheet.png"),
    fullPage: true,
  })
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(selectionAnchor).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("")

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth)
})

test("keeps the core controls usable at an equivalent 200% zoom layout", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop zoom acceptance")
  await page.setViewportSize({ width: 640, height: 450 })
  await page.goto(PROOF_PATH)

  const sourceChoice = page.getByRole("group", { name: "Choose source view" })
  await expect(sourceChoice.getByRole("button", { name: "Paper" })).toBeVisible()
  await expect(sourceChoice.getByRole("button", { name: "Lean" })).toBeVisible()
  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth)
})
