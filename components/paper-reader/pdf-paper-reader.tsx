"use client"

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist"

import { validateSelectedText } from "../selection-menu"
import {
  fitPageToWidth,
  resolvePageBlockIds,
  type PaperBlock,
} from "./paper-layout"
import styles from "./pdf-paper-reader.module.css"

type PdfJs = typeof import("pdfjs-dist")

export type PaperTextSelection = {
  selectedText: string
  blockIds: string[]
  clientRect: {
    top: number
    left: number
    right: number
    bottom: number
  }
  anchor: HTMLElement
}

type PdfPaperReaderProps = {
  pdfUrl: string
  pageNumber: number
  pageBlocks: PaperBlock[]
  title: string
  onSelection: (selection: PaperTextSelection) => void
}

type ReaderStatus = "loading-document" | "rendering" | "ready" | "error"

type PageSize = {
  width: number
  height: number
}

type PageStyle = CSSProperties & {
  "--paper-aspect-ratio": string
  "--total-scale-factor"?: string
}

const DEFAULT_PAGE_SIZE: PageSize = { width: 612, height: 792 }

export function PdfPaperReader({
  pdfUrl,
  pageNumber,
  pageBlocks,
  title,
  onSelection,
}: PdfPaperReaderProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const [pdfJs, setPdfJs] = useState<PdfJs | null>(null)
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE)
  const [renderScale, setRenderScale] = useState<number>()
  const [status, setStatus] = useState<ReaderStatus>("loading-document")
  const [errorMessage, setErrorMessage] = useState("")
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const updateWidth = () => {
      const width = Math.floor(host.getBoundingClientRect().width)
      if (width > 0) setContainerWidth((current) => (Math.abs(current - width) > 1 ? width : current))
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let isCurrent = true
    let loadingTask: PDFDocumentLoadingTask | undefined

    void import("pdfjs-dist")
      .then(async (module) => {
        module.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString()
        if (!isCurrent) return
        setStatus("loading-document")
        setErrorMessage("")
        setDocument(null)
        setPdfJs(module)
        loadingTask = module.getDocument({ url: pdfUrl })
        const loadedDocument = await loadingTask.promise
        if (!isCurrent) return
        setDocument(loadedDocument)
      })
      .catch(() => {
        if (!isCurrent) return
        setErrorMessage("The paper could not be loaded. Check the connection and try again.")
        setStatus("error")
      })

    return () => {
      isCurrent = false
      void loadingTask?.destroy()
    }
  }, [pdfUrl, retryKey])

  useEffect(() => {
    if (!document || !pdfJs || !containerWidth) return

    let isCurrent = true
    let renderTask: RenderTask | undefined
    let textLayer: InstanceType<PdfJs["TextLayer"]> | undefined

    const renderPage = async () => {
      setStatus("rendering")
      setErrorMessage("")

      if (pageNumber < 1 || pageNumber > document.numPages) {
        throw new Error("Page out of range")
      }

      const page = await document.getPage(pageNumber)
      if (!isCurrent) return
      const intrinsicViewport = page.getViewport({ scale: 1 })
      const fitted = fitPageToWidth(
        intrinsicViewport.width,
        intrinsicViewport.height,
        containerWidth,
      )
      const viewport = page.getViewport({ scale: fitted.scale })
      const canvas = canvasRef.current
      const textContainer = textLayerRef.current
      if (!canvas || !textContainer) return

      setPageSize({ width: viewport.width, height: viewport.height })
      setRenderScale(viewport.scale)

      const outputScale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      textContainer.replaceChildren()
      renderTask = page.render({
        canvas,
        viewport,
        transform:
          outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      })
      const textContent = await page.getTextContent()
      if (!isCurrent) return
      textLayer = new pdfJs.TextLayer({
        textContentSource: textContent,
        container: textContainer,
        viewport,
      })

      await Promise.all([renderTask.promise, textLayer.render()])
      if (isCurrent) setStatus("ready")
    }

    void renderPage().catch((error: unknown) => {
      if (!isCurrent || (error instanceof Error && error.name === "RenderingCancelledException")) {
        return
      }
      setErrorMessage("This page could not be rendered. Try loading it again.")
      setStatus("error")
    })

    return () => {
      isCurrent = false
      renderTask?.cancel()
      textLayer?.cancel()
    }
  }, [containerWidth, document, pageNumber, pdfJs])

  const captureSelection = () => {
    const textLayer = textLayerRef.current
    const browserSelection = window.getSelection()
    if (!textLayer || !browserSelection || browserSelection.rangeCount === 0) return
    if (
      !browserSelection.anchorNode ||
      !browserSelection.focusNode ||
      !textLayer.contains(browserSelection.anchorNode) ||
      !textLayer.contains(browserSelection.focusNode)
    ) {
      return
    }

    const validated = validateSelectedText(browserSelection.toString())
    if (!validated.isValid) return
    const rect = browserSelection.getRangeAt(0).getBoundingClientRect()
    if (!rect.width && !rect.height) return

    onSelection({
      selectedText: validated.selectedText,
      blockIds: resolvePageBlockIds(validated.selectedText, pageBlocks),
      clientRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
      anchor: textLayer,
    })
  }

  const scheduleSelectionCapture = (
    event: PointerEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) => {
    if ("button" in event && event.button !== 0) return
    window.setTimeout(captureSelection, 0)
  }

  const pageStyle: PageStyle = {
    width: pageSize.width,
    maxWidth: "100%",
    "--paper-aspect-ratio": `${pageSize.width} / ${pageSize.height}`,
    ...(renderScale ? { "--total-scale-factor": String(renderScale) } : {}),
  }

  return (
    <section
      className={styles.reader}
      aria-label={`${title}, page ${pageNumber}`}
      aria-busy={status !== "ready" && status !== "error"}
      data-testid="pdf-paper-reader"
    >
      <div className={styles.host} ref={hostRef}>
        <div className={styles.page} style={pageStyle} data-state={status}>
          <canvas
            className={styles.canvas}
            ref={canvasRef}
            aria-hidden="true"
            data-testid="pdf-canvas"
          />
          <div
            className={styles.textLayer}
            ref={textLayerRef}
            role="document"
            aria-label={`Selectable text for page ${pageNumber}`}
            tabIndex={0}
            data-testid="pdf-text-layer"
            onPointerUp={scheduleSelectionCapture}
            onKeyUp={scheduleSelectionCapture}
          />

          {status === "loading-document" || status === "rendering" ? (
            <div className={styles.loading} role="status" aria-live="polite">
              <span className={styles.loadingLine} aria-hidden="true" />
              <span>{status === "loading-document" ? "Opening paper…" : `Rendering page ${pageNumber}…`}</span>
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.error} role="alert">
              <strong>Paper unavailable</strong>
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setStatus("loading-document")
                  setErrorMessage("")
                  setDocument(null)
                  setRetryKey((key) => key + 1)
                }}
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <p className={styles.help}>
        Select text directly on the page for a contextual explanation. Use the page buttons to navigate.
      </p>
    </section>
  )
}
