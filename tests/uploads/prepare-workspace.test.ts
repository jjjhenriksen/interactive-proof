import { describe, expect, it, vi } from "vitest";
import { prepareWorkspaceFiles } from "../../lib/uploads/prepare-workspace";

describe("parallel workspace resources", () => {
  it("disposes a late successful PDF exactly once after immediate Lean failure", async () => {
    let finish!: (paper: { url: string }) => void;
    const paper = new Promise<{ url: string }>((resolve) => { finish = resolve; });
    const dispose = vi.fn();
    const failure = new Error("Invalid Lean");
    const result = prepareWorkspaceFiles(paper, Promise.reject(failure), dispose);
    const rejection = expect(result).rejects.toBe(failure);
    await Promise.resolve();
    expect(dispose).not.toHaveBeenCalled();
    finish({ url: "blob:late-paper" });
    await rejection;
    expect(dispose).toHaveBeenCalledExactlyOnceWith({ url: "blob:late-paper" });
  });
  it("transfers successful resources without disposing them", async () => {
    const dispose = vi.fn();
    const paper = { url: "blob:paper" };
    expect(await prepareWorkspaceFiles(Promise.resolve(paper), Promise.resolve(["Main.lean"]), dispose)).toEqual([paper, ["Main.lean"]]);
    expect(dispose).not.toHaveBeenCalled();
  });
  it("preserves PDF failure without disposing a resource that was never created", async () => {
    const dispose = vi.fn();
    const failure = new Error("Invalid PDF");
    await expect(prepareWorkspaceFiles(Promise.reject(failure), Promise.resolve([]), dispose)).rejects.toBe(failure);
    expect(dispose).not.toHaveBeenCalled();
  });
});
