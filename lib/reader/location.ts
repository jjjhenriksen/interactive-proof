export type ReaderLocation =
  | { source: "paper"; page: number; mappingId?: string; blockId?: string }
  | { source: "lean"; declaration: string; mappingId: string }
  | { source: "mapping"; mappingId: string };

export type ReaderLocationIndex = {
  pages: readonly number[];
  mappings: ReadonlyArray<{
    id: string;
    paperSourceId: string;
    declarations: readonly string[];
  }>;
};

export type ParsedReaderLocation = {
  location: ReaderLocation | null;
  hadInvalidParameters: boolean;
};

export function parseReaderLocation(
  search: string,
  hash: string,
  index: ReaderLocationIndex,
): ParsedReaderLocation {
  const params = new URLSearchParams(search);
  const source = params.get("source");
  const mappingId = params.get("mapping") ?? undefined;
  const mapping = mappingId ? index.mappings.find((item) => item.id === mappingId) : undefined;
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const blockId = hashParams.get("source") ?? undefined;
  const knownBlock = blockId
    ? index.mappings.some((item) => item.paperSourceId === blockId)
    : true;

  if (!source && !mappingId && !blockId) {
    return { location: null, hadInvalidParameters: params.size > 0 || hashParams.size > 0 };
  }

  if (source === "paper") {
    const page = Number(params.get("page"));
    if (Number.isInteger(page) && index.pages.includes(page) && (!mappingId || mapping) && knownBlock) {
      return {
        location: { source: "paper", page, ...(mappingId ? { mappingId } : {}), ...(blockId ? { blockId } : {}) },
        hadInvalidParameters: false,
      };
    }
  }

  if (source === "lean") {
    const declaration = params.get("declaration");
    if (declaration && mapping && mapping.declarations.includes(declaration)) {
      return { location: { source: "lean", declaration, mappingId: mapping.id }, hadInvalidParameters: false };
    }
  }

  if (source === "mapping" && mapping) {
    return { location: { source: "mapping", mappingId: mapping.id }, hadInvalidParameters: false };
  }

  return { location: null, hadInvalidParameters: true };
}

export function serializeReaderLocation(location: ReaderLocation): { search: string; hash: string } {
  const params = new URLSearchParams();
  params.set("source", location.source);
  if (location.source === "paper") params.set("page", String(location.page));
  if (location.source === "lean") params.set("declaration", location.declaration);
  if ("mappingId" in location && location.mappingId) params.set("mapping", location.mappingId);
  const hash = location.source === "paper" && location.blockId
    ? `#${new URLSearchParams({ source: location.blockId }).toString()}`
    : "";
  return { search: `?${params.toString()}`, hash };
}
