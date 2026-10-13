/** Settle every parallel upload before taking ownership or disposing resources. */
export async function prepareWorkspaceFiles<Paper, Lean>(
  paper: Promise<Paper>,
  lean: Promise<Lean>,
  disposePaper: (paper: Paper) => void,
): Promise<[Paper, Lean]> {
  const [paperResult, leanResult] = await Promise.allSettled([paper, lean]);
  if (paperResult.status === "rejected") throw paperResult.reason;
  if (leanResult.status === "rejected") {
    disposePaper(paperResult.value);
    throw leanResult.reason;
  }
  return [paperResult.value, leanResult.value];
}
