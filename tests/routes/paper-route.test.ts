import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "../../app/proofs/[proofId]/paper/route";

describe("proof paper route", () => {
  it.each(["cycle-double-cover", "odd-sum-square"])(
    "serves the registered %s PDF through the shared route",
    async (proofId) => {
      const response = await GET(
        new NextRequest(`http://localhost/proofs/${proofId}/paper`),
        { params: Promise.resolve({ proofId }) },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(1_000);
    },
  );

  it("returns 404 for an unregistered package", async () => {
    const response = await GET(
      new NextRequest("http://localhost/proofs/not-a-proof/paper"),
      { params: Promise.resolve({ proofId: "not-a-proof" }) },
    );
    expect(response.status).toBe(404);
  });
});

