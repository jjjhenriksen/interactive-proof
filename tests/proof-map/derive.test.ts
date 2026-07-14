import { describe, expect, it } from "vitest";
import { deriveProofMap } from "../../lib/proof-map/derive";

const source = (id: string, dependencies: string[] = [], usedBy: string[] = []) => ({ id, label: id, paper: { sourceId: `paper-${id}`, pages: [1] }, lean: [{ sourceId: `lean-${id}`, declaration: id, file: "Main.lean" }], correspondence: "direct" as const, prerequisites: [], dependencies, usedBy });

describe("deriveProofMap", () => {
  it("orders nodes deterministically by dependency depth", () => {
    const graph = deriveProofMap([source("result", ["start"]), source("start", [], ["result"])]);
    expect(graph.nodes.map(({ id, depth }) => [id, depth])).toEqual([["start", 0], ["result", 1]]);
    expect(graph.edges).toEqual([{ from: "start", to: "result", kind: "depends-on" }]);
  });
  it("rejects missing targets, self edges, and cycles", () => {
    expect(() => deriveProofMap([source("a", ["missing"])] )).toThrow(/Unknown/);
    expect(() => deriveProofMap([source("a", ["a"])] )).toThrow(/cycle|Self/i);
    expect(() => deriveProofMap([source("a", ["b"]), source("b", ["a"])] )).toThrow(/cycle/i);
  });
});
