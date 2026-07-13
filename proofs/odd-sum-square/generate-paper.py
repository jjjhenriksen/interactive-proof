#!/usr/bin/env python3
"""Generate the authored one-page paper for the odd-sum-square proof package."""

import hashlib
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Paragraph
from reportlab.pdfgen.canvas import Canvas


OUTPUT = Path(__file__).with_name("odd-sum-square-paper.pdf")
PAGES_OUTPUT = Path(__file__).with_name("paper.pages.json")
PAGE_WIDTH, PAGE_HEIGHT = letter

INK = colors.HexColor("#20261F")
MUTED = colors.HexColor("#5D665C")
GREEN = colors.HexColor("#2F6A4F")
GREEN_LIGHT = colors.HexColor("#DCEADF")
GOLD = colors.HexColor("#D6A748")
PAPER = colors.HexColor("#FCFAF5")
RULE = colors.HexColor("#D9D8CF")


def paragraph(canvas: Canvas, text: str, x: float, y_top: float, width: float, style: ParagraphStyle) -> float:
    item = Paragraph(text, style)
    _, height = item.wrap(width, PAGE_HEIGHT)
    item.drawOn(canvas, x, y_top - height)
    return height


def draw_square_model(canvas: Canvas, x: float, y: float) -> None:
    cell = 0.255 * inch
    size = 5
    canvas.setFillColor(PAPER)
    canvas.roundRect(x - 0.18 * inch, y - 0.22 * inch, 2.12 * inch, 1.93 * inch, 7, fill=1, stroke=0)

    for row in range(size):
        for col in range(size):
            layer = max(row, col)
            fill = GREEN_LIGHT if layer < 4 else colors.HexColor("#F3DDAF")
            canvas.setFillColor(fill)
            canvas.setStrokeColor(colors.white)
            canvas.rect(x + col * cell, y + (size - 1 - row) * cell, cell, cell, fill=1, stroke=1)

    canvas.setStrokeColor(GREEN)
    canvas.setLineWidth(1.2)
    canvas.rect(x, y, size * cell, size * cell, fill=0, stroke=1)
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawString(x, y + size * cell + 0.11 * inch, "A 4 x 4 square grows to 5 x 5")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(x, y - 0.16 * inch, "The new border has 4 + 5 = 9 cells.")


def build() -> None:
    canvas = Canvas(str(OUTPUT), pagesize=letter, pageCompression=1, invariant=1)
    canvas.setTitle("Why the First n Odd Numbers Sum to n^2")
    canvas.setAuthor("Interactive Proof Project")
    canvas.setSubject("An educational proof by induction with a geometric interpretation")
    canvas.setFillColor(colors.HexColor("#F7F4EC"))
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)

    margin = 0.72 * inch
    content_width = PAGE_WIDTH - 2 * margin
    top = PAGE_HEIGHT - 0.68 * inch

    canvas.setFillColor(GREEN)
    canvas.setFont("Helvetica-Bold", 8.5)
    canvas.drawString(margin, top, "INTERACTIVE PROOF - ELEMENTARY NUMBER THEORY")
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(2)
    canvas.line(margin, top - 0.13 * inch, margin + 0.75 * inch, top - 0.13 * inch)

    title_style = ParagraphStyle(
        "Title",
        fontName="Times-Bold",
        fontSize=26,
        leading=28,
        textColor=INK,
        spaceAfter=0,
    )
    h = paragraph(
        canvas,
        "Why Odd Numbers<br/>Build Perfect Squares",
        margin,
        top - 0.34 * inch,
        content_width,
        title_style,
    )
    byline_y = top - 0.56 * inch - h
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 9)
    canvas.drawString(margin, byline_y, "Interactive Proof Project  /  July 2026")

    theorem_top = byline_y - 0.30 * inch
    canvas.setFillColor(colors.white)
    canvas.roundRect(margin, theorem_top - 0.85 * inch, content_width, 0.85 * inch, 8, fill=1, stroke=0)
    canvas.setFillColor(GREEN)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(margin + 0.18 * inch, theorem_top - 0.21 * inch, "THEOREM")
    theorem_style = ParagraphStyle(
        "Theorem",
        fontName="Times-Roman",
        fontSize=13,
        leading=18,
        textColor=INK,
    )
    paragraph(
        canvas,
        "For every natural number <i>n</i>, the sum of the first <i>n</i> odd numbers is <i>n</i><super>2</super>:<br/>"
        "1 + 3 + 5 + ... + (2<i>n</i> - 1) = <i>n</i><super>2</super>.",
        margin + 0.18 * inch,
        theorem_top - 0.33 * inch,
        content_width - 0.36 * inch,
        theorem_style,
    )

    body_top = theorem_top - 1.14 * inch
    left_width = 4.15 * inch
    right_x = margin + 4.47 * inch

    section_style = ParagraphStyle(
        "Section",
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=GREEN,
        spaceAfter=0,
    )
    body_style = ParagraphStyle(
        "Body",
        fontName="Times-Roman",
        fontSize=10.6,
        leading=15.2,
        textColor=INK,
    )

    paragraph(canvas, "PROOF BY INDUCTION", margin, body_top, left_width, section_style)
    proof_text = (
        "Write <i>S</i><sub>n</sub> for 1 + 3 + ... + (2<i>n</i> - 1). "
        "For <i>n</i> = 0, the sum is empty, so <i>S</i><sub>0</sub> = 0 = 0<super>2</super>. "
        "Now assume <i>S</i><sub>n</sub> = <i>n</i><super>2</super>. The next odd number is 2<i>n</i> + 1, hence"
    )
    paragraph(canvas, proof_text, margin, body_top - 0.20 * inch, left_width, body_style)

    equation_style = ParagraphStyle(
        "Equation",
        fontName="Times-Roman",
        fontSize=13,
        leading=19,
        alignment=TA_CENTER,
        textColor=INK,
    )
    equation_top = body_top - 1.38 * inch
    canvas.setFillColor(colors.white)
    canvas.roundRect(margin, equation_top - 0.66 * inch, left_width, 0.66 * inch, 6, fill=1, stroke=0)
    paragraph(
        canvas,
        "<i>S</i><sub>n+1</sub> = <i>S</i><sub>n</sub> + (2<i>n</i> + 1) = "
        "<i>n</i><super>2</super> + 2<i>n</i> + 1 = (<i>n</i> + 1)<super>2</super>.",
        margin + 0.10 * inch,
        equation_top - 0.16 * inch,
        left_width - 0.20 * inch,
        equation_style,
    )
    paragraph(
        canvas,
        "Therefore the identity holds for <i>n</i> + 1, and induction proves it for every natural number <i>n</i>.",
        margin,
        equation_top - 0.84 * inch,
        left_width,
        body_style,
    )

    draw_square_model(canvas, right_x, body_top - 1.67 * inch)

    insight_top = body_top - 2.78 * inch
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.8)
    canvas.line(margin, insight_top, margin + content_width, insight_top)
    paragraph(canvas, "WHY THE ALGEBRA MATCHES THE PICTURE", margin, insight_top - 0.28 * inch, content_width, section_style)
    paragraph(
        canvas,
        "To enlarge an <i>n</i> by <i>n</i> square, attach one column of <i>n</i> cells and one row of "
        "<i>n</i> + 1 cells. The new L-shaped border contains 2<i>n</i> + 1 cells - exactly the next odd number. "
        "The equation (<i>n</i> + 1)<super>2</super> - <i>n</i><super>2</super> = 2<i>n</i> + 1 is the same growth step written algebraically.",
        margin,
        insight_top - 0.48 * inch,
        content_width,
        body_style,
    )

    formal_top = insight_top - 1.25 * inch
    paragraph(canvas, "FORMALIZATION NOTE", margin, formal_top, content_width, section_style)
    formal_style = ParagraphStyle(
        "Formal",
        fontName="Courier",
        fontSize=8.6,
        leading=12.5,
        textColor=INK,
    )
    paragraph(
        canvas,
        "Lean defines oddSum recursively: oddSum 0 = 0 and oddSum (n + 1) = oddSum n + (2 * n + 1). "
        "The theorem follows the same induction as the paper; simplification expands the successor square and closes the arithmetic step.",
        margin,
        formal_top - 0.20 * inch,
        content_width,
        formal_style,
    )

    footer_y = 0.52 * inch
    canvas.setStrokeColor(RULE)
    canvas.line(margin, footer_y + 0.19 * inch, margin + content_width, footer_y + 0.19 * inch)
    canvas.setFont("Helvetica", 7.4)
    canvas.setFillColor(MUTED)
    notice = "Copyright 2026 Interactive Proof Project. Licensed CC BY 4.0 - creativecommons.org/licenses/by/4.0/"
    canvas.drawString(margin, footer_y, notice)
    page_label = "1 / 1"
    canvas.drawString(margin + content_width - stringWidth(page_label, "Helvetica", 7.4), footer_y, page_label)

    canvas.showPage()
    canvas.save()
    blocks = [
        {"id": "page-1-block-1", "kind": "metadata", "text": "INTERACTIVE PROOF - ELEMENTARY NUMBER THEORY"},
        {"id": "page-1-block-2", "kind": "heading", "text": "Why Odd Numbers Build Perfect Squares"},
        {"id": "page-1-block-3", "kind": "heading", "text": "THEOREM"},
        {"id": "page-1-block-4", "kind": "body", "text": "For every natural number n, the sum of the first n odd numbers is n2: 1 + 3 + 5 + ... + (2n - 1) = n2."},
        {"id": "page-1-block-5", "kind": "heading", "text": "PROOF BY INDUCTION"},
        {"id": "page-1-block-6", "kind": "body", "text": "Write Sn for 1 + 3 + ... + (2n - 1). For n = 0, the sum is empty, so S0 = 0 = 02. Now assume Sn = n2. The next odd number is 2n + 1, hence"},
        {"id": "page-1-block-7", "kind": "equation", "text": "Sn+1 = Sn + (2n + 1) = n2 + 2n + 1 = (n + 1)2."},
        {"id": "page-1-block-8", "kind": "body", "text": "Therefore the identity holds for n + 1, and induction proves it for every natural number n."},
        {"id": "page-1-block-9", "kind": "heading", "text": "WHY THE ALGEBRA MATCHES THE PICTURE"},
        {"id": "page-1-block-10", "kind": "body", "text": "To enlarge an n by n square, attach one column of n cells and one row of n + 1 cells. The new L-shaped border contains 2n + 1 cells - exactly the next odd number. The equation (n + 1)2 - n2 = 2n + 1 is the same growth step written algebraically."},
        {"id": "page-1-block-11", "kind": "heading", "text": "FORMALIZATION NOTE"},
        {"id": "page-1-block-12", "kind": "body", "text": "Lean defines oddSum recursively: oddSum 0 = 0 and oddSum (n + 1) = oddSum n + (2 * n + 1). The theorem follows the same induction as the paper; simplification expands the successor square and closes the arithmetic step."},
        {"id": "page-1-block-13", "kind": "metadata", "text": "Copyright 2026 Interactive Proof Project. Licensed CC BY 4.0 - creativecommons.org/licenses/by/4.0/"},
    ]
    pages = {
        "schemaVersion": 1,
        "pdfSha256": hashlib.sha256(OUTPUT.read_bytes()).hexdigest(),
        "pages": [{"number": 1, "text": "\n\n".join(block["text"] for block in blocks), "blocks": blocks}],
    }
    PAGES_OUTPUT.write_text(json.dumps(pages, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)
    print(PAGES_OUTPUT)


if __name__ == "__main__":
    build()
