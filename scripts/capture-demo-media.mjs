import { mkdir, rename } from "node:fs/promises";

import { chromium } from "@playwright/test";

const baseUrl = process.env.MEDIA_BASE_URL ?? "http://127.0.0.1:3200";
const outputDirectory = "docs/submission/media";
const videoDirectory = `${outputDirectory}/video-work`;

await mkdir(outputDirectory, { recursive: true });
await mkdir(videoDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDirectory, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(3_000);
await page.screenshot({ path: `${outputDirectory}/reading-room-desktop.png`, fullPage: true });

await page.goto(`${baseUrl}/proofs/odd-sum-square`, { waitUntil: "networkidle" });
await page.getByTestId("pdf-paper-reader").waitFor({ state: "visible" });
await page.getByTestId("pdf-paper-reader").waitFor({ state: "attached" });
await page.waitForFunction(
  () => document.querySelector('[data-testid="pdf-paper-reader"]')?.getAttribute("aria-busy") === "false",
  undefined,
  { timeout: 20_000 },
);
await page.waitForTimeout(2_500);
await page.screenshot({ path: `${outputDirectory}/odd-sum-square-desktop.png`, fullPage: true });

await page.getByRole("button", { name: "View paper example" }).click();
await page.getByText("Recorded example", { exact: true }).waitFor({ state: "visible" });
await page.waitForTimeout(4_000);
await page.getByRole("button", { name: "Close panel" }).click();
await page.getByText("Verification evidence", { exact: true }).click();
await page.waitForTimeout(4_000);

await context.close();
const videoPath = await page.video().path();
await rename(videoPath, `${outputDirectory}/demo-rehearsal-key-free.webm`);

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(`${baseUrl}/proofs/odd-sum-square`, { waitUntil: "networkidle" });
await mobilePage.waitForFunction(
  () => document.querySelector('[data-testid="pdf-paper-reader"]')?.getAttribute("aria-busy") === "false",
  undefined,
  { timeout: 20_000 },
);
await mobilePage.waitForTimeout(1_500);
await mobilePage.screenshot({ path: `${outputDirectory}/odd-sum-square-mobile.png`, fullPage: true });
await mobileContext.close();
await browser.close();
