/** Normalize the delimiter forms commonly emitted by model responses. */
export function normalizeMathDelimiters(value: string): string {
  return value
    .replace(/\\\[/g, () => "$$")
    .replace(/\\\]/g, () => "$$")
    .replace(/\\\(/g, () => "$")
    .replace(/\\\)/g, () => "$")
}
