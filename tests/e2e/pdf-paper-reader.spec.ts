import { expect, test } from "@playwright/test"
import path from "node:path"

const proofUrl = "/proofs/cycle-double-cover"

test("renders a selectable, responsive PDF page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Visual verification runs once in Chromium")

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(proofUrl)

  const reader = page.getByTestId("pdf-paper-reader")
  const canvas = page.getByTestId("pdf-canvas")
  const textLayer = page.getByTestId("pdf-text-layer")
  await expect(reader).toHaveAttribute("aria-busy", "false", { timeout: 20_000 })
  await expect(canvas).toBeVisible()
  await expect(textLayer.locator("span").first()).toBeAttached()

  const headingText = textLayer.locator("span").filter({ hasText: /^Introduction$/ }).first()
  await expect(headingText).toBeAttached()
  await headingText.evaluate((node) => {
    const layer = node.closest('[data-testid="pdf-text-layer"]')
    const spans = Array.from(layer?.querySelectorAll<HTMLSpanElement>("span") ?? [])
    const headingIndex = spans.indexOf(node as HTMLSpanElement)
    const headingNumber = spans
      .slice(0, headingIndex)
      .reverse()
      .find((span) => span.textContent?.trim() === "1.")
    if (!headingNumber?.firstChild || !node.firstChild) {
      throw new Error("The PDF heading text items were not found")
    }
    const range = document.createRange()
    range.setStart(headingNumber.firstChild, 0)
    range.setEnd(node.firstChild, node.firstChild.textContent?.length ?? 0)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  })
  await textLayer.dispatchEvent("pointerup", { button: 0 })

  const menu = page.getByRole("toolbar", { name: "Explain selected passage" })
  await expect(menu).toBeVisible()
  await menu.getByRole("button", { name: "More details" }).click()
  await expect(page.locator("blockquote")).toHaveText(/^1\.\s*Introduction$/)

  await page.getByRole("button", { name: "Close panel" }).click()
  await expect(reader).toHaveAttribute("aria-busy", "false", { timeout: 20_000 })
  await page.getByRole("main", { name: "paper source" }).screenshot({
    path: path.resolve("output/playwright/pdf-reader-desktop.png"),
  })

  await page.setViewportSize({ width: 360, height: 800 })
  await expect(reader).toHaveAttribute("aria-busy", "false", { timeout: 20_000 })
  const viewportMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.clientWidth)
  expect((await canvas.boundingBox())?.width).toBeLessThanOrEqual(360)

  await page.getByRole("main", { name: "paper source" }).screenshot({
    path: path.resolve("output/playwright/pdf-reader-mobile-360.png"),
  })
})
