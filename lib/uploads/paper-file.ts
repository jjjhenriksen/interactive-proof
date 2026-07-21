import { UPLOAD_LIMITS } from "./schema";
import { ensurePdfJsCompatibility } from "./pdfjs-compat";

export type UploadedPaperPage = {
  page: number;
  text: string;
  blocks: Array<{ id: string; text: string }>;
};

export type UploadedPaper = {
  title: string;
  url: string;
  pages: UploadedPaperPage[];
};

export async function readPaperUpload(file: File): Promise<UploadedPaper> {
  if (file.size > UPLOAD_LIMITS.pdfBytes) throw new Error("The PDF is larger than 20 MiB.");
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Choose a PDF paper.");
  }

  const supportsPdfWorker = ensurePdfJsCompatibility();
  const pdfJs = await import("pdfjs-dist");
  pdfJs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const task = pdfJs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    ...(supportsPdfWorker ? {} : { disableWorker: true }),
  });
  try {
    const document = await task.promise;
    if (document.numPages > UPLOAD_LIMITS.pdfPages) {
      throw new Error(`The PDF has more than ${UPLOAD_LIMITS.pdfPages} pages.`);
    }
    const pages: UploadedPaperPage[] = [];
    let characterCount = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      characterCount += text.length;
      if (characterCount > UPLOAD_LIMITS.extractedPaperCharacters) {
        throw new Error("The extracted paper text is larger than 200,000 characters.");
      }
      pages.push({
        page: pageNumber,
        text,
        blocks: text ? [{ id: `uploaded-paper-page-${pageNumber}`, text }] : [],
      });
    }
    if (!pages.some((page) => page.text.length >= 20)) {
      throw new Error("No selectable text was found. This may be a scanned PDF.");
    }
    return {
      title: file.name.replace(/\.pdf$/i, "") || "Uploaded paper",
      url: URL.createObjectURL(file),
      pages,
    };
  } finally {
    await task.destroy();
  }
}
