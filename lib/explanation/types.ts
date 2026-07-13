export type SourceType = "paper" | "lean" | "guide";

export type PaperSource = {
  id: string;
  type: "paper";
  label: string;
  page: number;
};

export type LeanSource = {
  id: string;
  type: "lean";
  label: string;
  file: string;
  declaration: string;
  revision: string;
};

export type GuideSource = {
  id: string;
  type: "guide";
  label: string;
  section: string;
};

export type PublicSource = PaperSource | LeanSource | GuideSource;

export type SourceExcerpt = {
  id: string;
  type: SourceType;
  label: string;
  text: string;
};

export type VerificationSummary = {
  status: "verified" | "failed" | "not-run" | "stale";
  revision: string | null;
  toolchain: string | null;
  checkedAt: string | null;
  sorryCount: number | null;
  axiomCount: number | null;
};

export type ContextBundle = {
  proof: {
    id: string;
    title: string;
    audience: string;
  };
  selection: {
    text: string;
    sourceId: string;
    sourceType: SourceType;
    locationLabel: string;
  };
  surroundingSource: SourceExcerpt;
  mappedSources: SourceExcerpt[];
  glossary: Array<{
    term: string;
    explanation: string;
    sourceIds: string[];
  }>;
  prerequisites: string[];
  dependencies: Array<{ id: string; label: string }>;
  usedBy: Array<{ id: string; label: string }>;
  verification: VerificationSummary;
  allowedSourceIds: string[];
};

export type PublicContext = {
  selection: {
    text: string;
    sourceType: SourceType;
    locationLabel: string;
  };
  sources: PublicSource[];
  verification: VerificationSummary;
};

export type ExplanationStreamEvent =
  | { type: "context"; context: PublicContext }
  | { type: "delta"; text: string }
  | {
      type: "completed";
      responseId: string;
      usage?: { inputTokens: number; outputTokens: number };
    }
  | {
      type: "error";
      code:
        | "INVALID_REQUEST"
        | "SOURCE_NOT_FOUND"
        | "SELECTION_MISMATCH"
        | "RATE_LIMITED"
        | "MODEL_ERROR"
        | "INTERNAL_ERROR";
      message: string;
      requestId?: string;
    };
