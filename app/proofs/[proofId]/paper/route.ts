import { readFile } from "node:fs/promises";
import path from "node:path";

import type { NextRequest } from "next/server";

import { loadProofPackage } from "../../../../lib/proof-packages/registry.server";

type PaperRouteContext = {
  params: Promise<unknown>;
};

export async function GET(_request: NextRequest, { params }: PaperRouteContext) {
  const { proofId } = (await params) as { proofId: string };
  const proof = await loadProofPackage(proofId);
  if (!proof) return new Response("Proof not found", { status: 404 });

  const bytes = await readFile(path.join(proof.directory, proof.manifest.paper.pdf));
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
