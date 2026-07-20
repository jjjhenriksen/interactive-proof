/** Format persisted dates consistently across server and browser time zones. */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value))
}
