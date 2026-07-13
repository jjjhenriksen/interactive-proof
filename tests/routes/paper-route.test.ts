import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "../../app/proofs/[proofId]/paper/route";

describe("proof paper route", () => {
  it.each(["cycle-double-cover", "odd-sum-square"])(
    "redirects the registered %s PDF to a static asset",
    async (proofId) => {
      const response = await GET(
        new NextRequest(`http://localhost/proofs/${proofId}/paper`),
        { params: Promise.resolve({ proofId }) },
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toMatch(
        new RegExp(`/proof-assets/${proofId}/[a-f0-9]{64}\\.pdf$`),
      );
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
