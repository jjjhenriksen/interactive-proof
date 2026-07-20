"use client"

import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"

import { normalizeMathDelimiters } from "../../lib/explanation/markdown"

type MarkdownContentProps = {
  children: string
}

/** Render model prose as learner-facing Markdown, including inline and display math. */
export function MarkdownContent({ children }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      skipHtml
    >
      {normalizeMathDelimiters(children)}
    </ReactMarkdown>
  )
}
