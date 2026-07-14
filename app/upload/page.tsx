import type { Metadata } from "next";

import { UploadWorkspace } from "../../components/upload-workspace/upload-workspace";

export const metadata: Metadata = {
  title: "Upload a paper",
  description: "Open a paper and optional Lean sources in a temporary interactive proof workspace.",
};

export default function UploadPage() {
  return <main id="main-content"><UploadWorkspace /></main>;
}
