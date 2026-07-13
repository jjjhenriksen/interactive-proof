export type PaperBlock = {
  id: string
  text: string
}

export type FittedPage = {
  width: number
  height: number
  scale: number
}

export function fitPageToWidth(
  intrinsicWidth: number,
  intrinsicHeight: number,
  availableWidth: number,
  maximumWidth = 896,
  minimumWidth = 1,
): FittedPage {
  const safeIntrinsicWidth = Math.max(1, intrinsicWidth)
  const safeIntrinsicHeight = Math.max(1, intrinsicHeight)
  const width = Math.max(minimumWidth, Math.min(availableWidth, maximumWidth))
  const scale = width / safeIntrinsicWidth

  return {
    width,
    height: safeIntrinsicHeight * scale,
    scale,
  }
}

export function normalizePaperText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Resolve the committed paper blocks overlapped by a browser text selection. */
export function resolvePageBlockIds(
  selectedText: string,
  blocks: PaperBlock[],
): string[] {
  const normalizedSelection = normalizePaperText(selectedText)
  if (!normalizedSelection) return []

  let pageText = ""
  const ranges = blocks.map((block) => {
    const text = normalizePaperText(block.text)
    const start = pageText.length
    pageText += `${pageText ? " " : ""}${text}`
    const contentStart = start + (start > 0 ? 1 : 0)
    return { id: block.id, start: contentStart, end: contentStart + text.length }
  })

  const selectionStart = pageText.indexOf(normalizedSelection)
  if (selectionStart < 0) {
    const leadingPhrase = normalizedSelection.slice(0, 64)
    const matchingBlock = blocks.find((block) =>
      normalizePaperText(block.text).includes(leadingPhrase),
    )
    return matchingBlock ? [matchingBlock.id] : []
  }

  const selectionEnd = selectionStart + normalizedSelection.length
  return ranges
    .filter((range) => range.start < selectionEnd && range.end > selectionStart)
    .map((range) => range.id)
}
