import type { NextRequest } from "next/server";

import { loadProofPackage } from "../../../../lib/proof-packages/registry.server";

type PaperRouteContext = {
  params: Promise<unknown>;
};

export async function GET(request: NextRequest, { params }: PaperRouteContext) {
  const { proofId } = (await params) as { proofId: string };
  const proof = await loadProofPackage(proofId);
  if (!proof) return new Response("Proof not found", { status: 404 });

  return Response.redirect(new URL(proof.paperAssetUrl, request.url), 307);
}
