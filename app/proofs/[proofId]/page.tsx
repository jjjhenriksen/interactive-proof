import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ProofReader,
  type ProofReaderViewModel,
} from "../../../components/proof-reader/proof-reader";
import { listProofIds, loadProofPackage } from "../../../lib/proof-packages/registry.server";
interface ProofPageProps {
  params: Promise<{ proofId: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return listProofIds().map((proofId) => ({ proofId }));
}

export async function generateMetadata({ params }: ProofPageProps): Promise<Metadata> {
  const { proofId } = await params;
  const proof = await loadProofPackage(proofId);

  return {
    title: proof?.manifest.shortTitle ?? "Proof not found",
    description: proof?.manifest.summary,
  };
}

export default async function ProofPage({ params }: ProofPageProps) {
  const { proofId } = await params;
  const loaded = await loadProofPackage(proofId);
  if (!loaded) notFound();

  const mappings = loaded.manifest.mappings.map((mapping) => ({
      id: mapping.id,
      label: mapping.label,
      paper: mapping.paper,
      prerequisites: mapping.prerequisites,
      correspondence: mapping.correspondence,
      correspondenceNote: mapping.correspondenceNote,
      lean: mapping.lean.map((source) => ({
        ...source,
        code: loaded.leanExcerpts[source.sourceId],
      })),
    }));

  const proof: ProofReaderViewModel = {
    id: loaded.manifest.id,
    title: loaded.manifest.title,
    summary: loaded.manifest.summary,
    audience: loaded.manifest.audience,
    paperTitle: loaded.manifest.paper.title,
    paperHref: loaded.paperAssetUrl,
    licenseStatus: loaded.manifest.paper.license.status,
    leanRevision: loaded.manifest.lean.revision,
    verification: {
      build: loaded.verification.build,
      revision: loaded.verification.revision,
      toolchain: loaded.verification.toolchain,
      command: loaded.verification.command,
      checkedAt: loaded.verification.checkedAt,
      exitCode: loaded.verification.exitCode,
      sorryCount: loaded.verification.sorryCount,
      axioms: loaded.verification.axioms,
      outputDigest: loaded.verification.outputDigest,
    },
    pages: loaded.paperPages.pages,
    mappings,
  };

  return (
    <main className="proof-page" id="main-content">
      <div className="page-shell">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Proofs</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{loaded.manifest.shortTitle}</span>
        </nav>
        <ProofReader proof={proof} />
      </div>
    </main>
  );
}
