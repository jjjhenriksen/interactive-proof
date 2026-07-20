export type ProofMapNode = {
  id: string;
  label: string;
  paper: { page: number; sourceId: string };
  lean: Array<{ sourceId: string; declaration: string; file: string }>;
  correspondence: "full" | "partial" | "context-only";
  depth: number;
};

export type ProofMapEdge = { from: string; to: string; kind: "depends-on" | "used-by" | "prerequisite" };

type MappingInput = {
  id: string; label: string;
  paper: { sourceId: string; pages: number[] };
  lean: Array<{ sourceId: string; declaration: string; file: string }>;
  correspondence: "direct" | "partial" | "supporting";
  prerequisites: string[]; dependencies: string[]; usedBy: string[];
};

export function deriveProofMap(mappings: readonly MappingInput[]) {
  const ids = new Set(mappings.map((mapping) => mapping.id));
  const depthMemo = new Map<string, number>();
  const depth = (id: string, trail = new Set<string>()): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!;
    if (trail.has(id)) throw new Error(`Non-context proof dependency cycle at ${id}`);
    const mapping = mappings.find((item) => item.id === id);
    if (!mapping) throw new Error(`Unknown mapping ${id}`);
    const nextTrail = new Set(trail).add(id);
    const value = mapping.dependencies.length ? 1 + Math.max(...mapping.dependencies.map((item) => depth(item, nextTrail))) : 0;
    depthMemo.set(id, value); return value;
  };
  const edges: ProofMapEdge[] = [];
  const edgeKeys = new Set<string>();
  const addEdge = (edge: ProofMapEdge) => {
    if (edge.from === edge.to) throw new Error(`Self edge at ${edge.from}`);
    if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error(`Unknown edge target ${edge.from} -> ${edge.to}`);
    const key = `${edge.kind}:${edge.from}:${edge.to}`;
    if (edgeKeys.has(key)) throw new Error(`Duplicate edge ${key}`);
    edgeKeys.add(key); edges.push(edge);
  };
  for (const mapping of mappings) {
    mapping.dependencies.forEach((from) => addEdge({ from, to: mapping.id, kind: "depends-on" }));
    mapping.usedBy.forEach((to) => {
      const duplicateDependency = edgeKeys.has(`depends-on:${mapping.id}:${to}`);
      if (!duplicateDependency) addEdge({ from: mapping.id, to, kind: "used-by" });
    });
  }
  const nodes: ProofMapNode[] = mappings.map((mapping): ProofMapNode => ({
    id: mapping.id, label: mapping.label,
    paper: { page: mapping.paper.pages[0], sourceId: mapping.paper.sourceId },
    lean: mapping.lean.map(({ sourceId, declaration, file }) => ({ sourceId, declaration, file })),
    correspondence: mapping.correspondence === "direct" ? "full" : mapping.correspondence === "partial" ? "partial" : "context-only",
    depth: depth(mapping.id),
  })).sort((a, b) => a.depth - b.depth || mappings.findIndex((m) => m.id === a.id) - mappings.findIndex((m) => m.id === b.id));
  return { nodes, edges };
}
