import { expect, test } from "@playwright/test"
import path from "node:path"

const proofUrl = "/proofs/odd-sum-square"

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

  const headingText = textLayer.locator("span").filter({ hasText: /^PROOF BY INDUCTION$/ }).first()
  await expect(headingText).toBeAttached()
  await headingText.evaluate((node) => {
    if (!node.firstChild) {
      throw new Error("The PDF heading text items were not found")
    }
    const range = document.createRange()
    range.setStart(node.firstChild, 0)
    range.setEnd(node.firstChild, node.firstChild.textContent?.length ?? 0)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  })
  await textLayer.dispatchEvent("pointerup", { button: 0 })

  const menu = page.getByRole("toolbar", { name: "Explain selected passage" })
  await expect(menu).toBeVisible()
  await menu.getByRole("button", { name: "More details" }).click()
  await expect(page.locator("blockquote")).toHaveText(/^PROOF BY INDUCTION$/)

  await page.getByRole("button", { name: "Close panel" }).click()
  await expect(reader).toHaveAttribute("aria-busy", "false", { timeout: 20_000 })
  await page.getByRole("main", { name: "paper source" }).screenshot({
    path: path.resolve("output/playwright/pdf-reader-desktop.png"),
  })

  await page.setViewportSize({ width: 360, height: 800 })
  await expect(reader).toHaveAttribute("aria-busy", "false", { timeout: 20_000 })
  const paperViewport = page.getByTestId("pdf-scroll-viewport")
  const viewportMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(viewportMetrics.scrollWidth).toBeLessThanOrEqual(viewportMetrics.clientWidth)
  const paperMetrics = await paperViewport.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(paperMetrics.clientWidth).toBeLessThanOrEqual(360)
  expect(paperMetrics.scrollWidth).toBeGreaterThanOrEqual(560)
  expect((await canvas.boundingBox())?.width).toBeGreaterThanOrEqual(560)
  await paperViewport.evaluate((element) => {
    element.scrollLeft = 90
  })
  expect(await paperViewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  await expect(page.getByText(/Swipe or scroll sideways/)).toBeVisible()

  await page.screenshot({
    path: path.resolve("output/playwright/pdf-reader-mobile-360.png"),
    fullPage: true,
  })
})
