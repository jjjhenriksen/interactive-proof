# Feature 08: Ephemeral paper and Lean uploads

## Outcome

A reader can open a PDF paper and optional Lean sources in a temporary browser workspace, select a passage, and request the same kind of focused explanation used by registered proof packages. Uploaded material is never added to the repository-backed proof library.

## User experience

- `/upload` requires a PDF and accepts optional `.lean` files or ZIP archives.
- The setup screen explains the data flow and requires the reader to confirm that they may use the files.
- PDF parsing, rendering, and Lean archive extraction happen in the browser.
- The reader can move between the paper and uploaded Lean, choose a provisional correspondence, and add a short mapping note.
- Uploaded Lean always carries an **unverified** label. A provisional correspondence is not a mathematical or machine-checked verification claim.
- Clearing the workspace or closing the tab removes the in-memory state. The feature does not use local storage, IndexedDB, or a persistence API.

## Data and trust boundaries

The original PDF, Lean file, and ZIP bytes are not sent to the application server. An explanation request sends only the paper title, the selected passage (1,200 characters), nearby source text (12,000 characters), at most 8,000 characters from one mapped source, explanation controls, and the optional mapping note.

`POST /api/explain-upload` has a separate strict schema, a 48 KB request limit, the shared anonymous rate limit, and no-store streaming headers. It never calls the registered-package loader and cannot create repository verification evidence. Server-built public context fixes verification to `not-run`; uploaded Lean source chips use the revision label `unverified-upload`.

The model receives uploaded source as quoted data under the existing prompt-injection protections. Application code, not model prose, controls source and verification labels.

## Resource limits

| Input | Limit |
|---|---:|
| PDF | 20 MiB, 100 pages, 200,000 extracted characters |
| ZIP | 5 MiB each |
| Lean file | 256 KiB each |
| Extracted Lean collection | 20 files, 1 MiB total |

ZIP traversal paths, absolute paths, backslash paths, duplicate paths, invalid UTF-8, empty files, and over-limit inputs are rejected. Non-Lean files in an otherwise valid ZIP are ignored.

## Non-goals

- running Lean in the browser or on the server;
- claiming that uploaded Lean formalizes the uploaded paper;
- saving or publishing uploads as proof packages;
- OCR for scanned PDFs;
- multi-user sharing or cloud workspaces.

## Acceptance checks

1. A text-based PDF opens and can be paged and selected.
2. Direct Lean files and safe ZIP archives open; unsafe or oversized archives fail visibly.
3. Uploaded Lean is labeled unverified everywhere it appears.
4. Explanation requests contain bounded JSON context, not file bytes.
5. The upload endpoint cannot return registered-package verification status.
6. Clear workspace releases the PDF object URL and removes the in-memory sources.
