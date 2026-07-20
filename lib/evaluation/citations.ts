const SOURCE_CITATION = /\[((?:page-\d+-block-\d+)|(?:lean-[a-z0-9-]+))\]/g;

export function extractSourceCitationIds(response: string): string[] {
  return [...response.matchAll(SOURCE_CITATION)].map((match) => match[1]);
}

export function validateResponseCitations(response: string, allowedSourceIds: string[]) {
  const citations = [...new Set(extractSourceCitationIds(response))];
  const allowed = new Set(allowedSourceIds);
  const invalidCitationIds = citations.filter((citation) => !allowed.has(citation));
  return {
    citations,
    invalidCitationIds,
    isValid: invalidCitationIds.length === 0,
  };
}
