import type { ContextBundle } from "./types";

export function serializeContextForModel(context: ContextBundle): string {
  const sections = [
    ["PROOF", `${context.proof.title}\nAudience: ${context.proof.audience}`],
    [
      "SELECTION",
      `${context.selection.locationLabel}\nSource ID: ${context.selection.sourceId}\n${context.selection.text}`,
    ],
    [
      "SURROUNDING SOURCE",
      formatExcerpt(context.surroundingSource),
    ],
    [
      "MAPPED SOURCES",
      context.mappedSources.map(formatExcerpt).join("\n\n") || "None supplied.",
    ],
    [
      "GLOSSARY",
      context.glossary
        .map(
          (entry) =>
            `${entry.term}: ${entry.explanation} [${entry.sourceIds.join(", ")}]`,
        )
        .join("\n") || "None supplied.",
    ],
    [
      "PREREQUISITES",
      context.prerequisites.map((item) => `- ${item}`).join("\n") ||
        "None supplied.",
    ],
    [
      "DEPENDENCIES",
      context.dependencies.map((item) => `- ${item.id}: ${item.label}`).join("\n") ||
        "None supplied.",
    ],
    [
      "USED BY",
      context.usedBy.map((item) => `- ${item.id}: ${item.label}`).join("\n") ||
        "None supplied.",
    ],
    ["VERIFICATION", JSON.stringify(context.verification)],
    ["ALLOWED SOURCE IDS", context.allowedSourceIds.join("\n")],
  ] as const;

  return sections
    .map(([heading, content]) => `<${heading}>\n${content}\n</${heading}>`)
    .join("\n\n");
}

function formatExcerpt(excerpt: ContextBundle["surroundingSource"]): string {
  return `${excerpt.label}\nSource ID: ${excerpt.id}\n${excerpt.text}`;
}
