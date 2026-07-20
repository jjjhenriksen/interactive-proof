import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "../../app/proofs/[proofId]/paper/route";

describe("proof paper route", () => {
  it("redirects the registered odd-sum-square PDF to a static asset", async () => {
    const proofId = "odd-sum-square";
    const response = await GET(
      new NextRequest(`http://localhost/proofs/${proofId}/paper`),
      { params: Promise.resolve({ proofId }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toMatch(
      new RegExp(`/proof-assets/${proofId}/[a-f0-9]{64}\\.pdf$`),
    );
  });

  it("returns 404 for an unregistered package", async () => {
    const response = await GET(
      new NextRequest("http://localhost/proofs/not-a-proof/paper"),
      { params: Promise.resolve({ proofId: "not-a-proof" }) },
    );
    expect(response.status).toBe(404);
  });
});
