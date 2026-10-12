// @ts-nocheck
import PDFDocument from "pdfkit"
import QRCode from "qrcode"
import { brand } from "../../brand/branding.js"
import { ReportData } from "./reportTypes.js"

// Colors shortcut
const C = brand.colors

function formatDate(d: Date | string | null): string {
  if (!d) return "—"
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
  } catch { return String(d) }
}
function formatDateTime(d: Date | string | null): string {
  if (!d) return "—"
  try {
    const dt = new Date(d)
    return dt.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
  } catch { return String(d) }
}
function truncate(s: string | null, len: number): string {
  if (!s) return "—"
  const t = String(s).trim()
  if (t.length <= len) return t
  return t.slice(0, len - 1) + "…"
}

// Draw ExamGuard logo vector (shield + cap + check) — reliable in PDF without external SVG
function drawLogo(doc: any, x: number, y: number, size: number, opts?: { darkBg?: boolean; withWordmark?: boolean }) {
  const darkBg = opts?.darkBg ?? false
  const isDarkIconBg = !darkBg // light bg => dark icon background
  const rectFill = darkBg ? "#FFFFFF" : C.primary
  const shieldStroke = darkBg ? C.primary : "#FFFFFF"
  const innerFill = darkBg ? "#F1F5F9" : "#FFFFFF"
  const innerStroke = darkBg ? "#E2E8F0" : "#FFFFFF"
  const capFill = darkBg ? C.primary : "#FFFFFF"
  const checkStroke = darkBg ? C.primary : "#FFFFFF"

  const r = size * 0.22
  // rounded rect bg
  doc.save()
  doc.roundedRect(x, y, size, size, r).fill(rectFill)
  doc.restore()

  // shield outer path scaled to size 32 base
  const scale = size / 32
  const ox = x
  const oy = y
  // outer shield — we need to transform coordinates: base 32x32, shield coordinates from 0..32
  // Use doc.path with scaling manually: compute points scaled
  // Outer shield: M16 6.2 L24.2 10.8 V17.8 C24.2 22.2 21.1 26 16 28.2 C10.9 26 7.8 22.2 7.8 17.8 V10.8 L16 6.2
  // We'll draw with moveTo/lineTo/bezier
  doc.save()
  doc.strokeColor(shieldStroke).lineWidth(1.35 * scale).lineJoin("round").lineCap("round")
  doc.path(
    `M ${ox + 16 * scale} ${oy + 6.2 * scale} L ${ox + 24.2 * scale} ${oy + 10.8 * scale} L ${ox + 24.2 * scale} ${oy + 17.8 * scale} C ${ox + 24.2 * scale} ${oy + 22.2 * scale} ${ox + 21.1 * scale} ${oy + 26 * scale} ${ox + 16 * scale} ${oy + 28.2 * scale} C ${ox + 10.9 * scale} ${oy + 26 * scale} ${ox + 7.8 * scale} ${oy + 22.2 * scale} ${ox + 7.8 * scale} ${oy + 17.8 * scale} L ${ox + 7.8 * scale} ${oy + 10.8 * scale} L ${ox + 16 * scale} ${oy + 6.2 * scale} Z`
  ).stroke()
  // inner shield
  doc.strokeColor(innerStroke).fillColor(innerFill).lineWidth(0.7 * scale)
  doc.fillOpacity(darkBg ? 1 : 0.08).strokeOpacity(darkBg ? 1 : 0.18)
  doc.path(
    `M ${ox + 16 * scale} ${oy + 8.2 * scale} L ${ox + 22.2 * scale} ${oy + 11.8 * scale} L ${ox + 22.2 * scale} ${oy + 17.6 * scale} C ${ox + 22.2 * scale} ${oy + 21 * scale} ${ox + 19.8 * scale} ${oy + 24.2 * scale} ${ox + 16 * scale} ${oy + 26.1 * scale} C ${ox + 12.2 * scale} ${oy + 24.2 * scale} ${ox + 9.8 * scale} ${oy + 21 * scale} ${ox + 9.8 * scale} ${oy + 17.6 * scale} L ${ox + 9.8 * scale} ${oy + 11.8 * scale} L ${ox + 16 * scale} ${oy + 8.2 * scale} Z`
  ).fillAndStroke()
  doc.fillOpacity(1).strokeOpacity(1)
  // cap
  doc.fillColor(capFill)
  doc.strokeColor(capFill)
  doc.path(
    `M ${ox + 16 * scale} ${oy + 11.2 * scale} L ${ox + 20.8 * scale} ${oy + 13.4 * scale} L ${ox + 16 * scale} ${oy + 15.6 * scale} L ${ox + 11.2 * scale} ${oy + 13.4 * scale} Z`
  ).fill()
  doc.lineWidth(0.55 * scale).lineCap("round")
  doc.path(`M ${ox + 20.8 * scale} ${oy + 13.4 * scale} L ${ox + 20.8 * scale} ${oy + 15.2 * scale} C ${ox + 20.8 * scale} ${oy + 15.9 * scale} ${ox + 18.6 * scale} ${oy + 16.9 * scale} ${ox + 16 * scale} ${oy + 16.9 * scale}`).stroke()
  doc.circle(ox + 20.8 * scale, oy + 15.6 * scale, 0.7 * scale).fill(capFill)
  // check
  doc.strokeColor(checkStroke).lineWidth(1.65 * scale).lineCap("round").lineJoin("round")
  doc.path(`M ${ox + 11.6 * scale} ${oy + 17.9 * scale} L ${ox + 14.35 * scale} ${oy + 20.65 * scale} L ${ox + 20.9 * scale} ${oy + 13.9 * scale}`).stroke()
  doc.restore()

  if (opts?.withWordmark) {
    const tx = x + size + 10
    const ty = y + 8
    doc.save()
    doc.fillColor(darkBg ? "#FFFFFF" : C.primary).font("Helvetica-Bold").fontSize(16).text("ExamGuard", tx, ty, { lineBreak: false })
    doc.fillColor(darkBg ? "#FFFFFF" : C.muted).font("Helvetica").fontSize(6.2).text("SECURE ASSESSMENTS. FAIR FUTURES.", tx, ty + 18, { characterSpacing: 1, lineBreak: false })
    // opacity for tagline on dark
    doc.restore()
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "")
  const bigint = parseInt(h, 16)
  if (h.length === 6) return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16)
    const g = parseInt(h[1] + h[1], 16)
    const b = parseInt(h[2] + h[2], 16)
    return { r, g, b }
  }
  return { r: 15, g: 23, b: 42 }
}

export async function renderReportPdf(data: ReportData): Promise<Buffer> {
  const margins = brand.report.margins // { top:52, bottom:52, left:48, right:48 }
  const doc = new PDFDocument({
    size: "A4",
    margins,
    bufferPages: true,
    info: {
      Title: `ExamGuard Report ${data.reportId}`,
      Author: "ExamGuard",
      Subject: `Examination Performance & Integrity Report — ${data.exam.title}`,
      Keywords: "ExamGuard, report, integrity, assessment",
      Creator: `ExamGuard v${data.version}`,
    },
    autoFirstPage: true,
  })

  // Need to embed fonts? Use built-in Helvetica
  const chunks: Buffer[] = []
  doc.on("data", (c: Buffer) => chunks.push(c))
  const finished = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))))

  // Generate QR buffer if verificationUrl
  let qrBuffer: Buffer | null = null
  if (data.verification.verificationUrl) {
    try {
      // QR with small margin
      const url = data.verification.verificationUrl
      qrBuffer = await QRCode.toBuffer(url, { errorCorrectionLevel: "M", margin: 1, width: 200, color: { dark: "#0F172A", light: "#FFFFFF" } })
    } catch {}
  }

  const pageWidth = doc.page.width  // 595.28 for A4
  const pageHeight = doc.page.height // 841.89
  const contentWidth = pageWidth - margins.left - margins.right // ~499
  const footerHeight = 32
  const headerHeight = 48

  // Helper to draw header (compact) on content pages
  function drawHeader() {
    const y = margins.top - 30
    const x = margins.left
    // logo small 24
    drawLogo(doc, x, y - 6, 24)
    doc.fillColor(C.muted).font("Helvetica").fontSize(7).text("EXAMINATION PERFORMANCE & INTEGRITY REPORT", x + 32, y + 2, { lineBreak: false })
    doc.fillColor(C.slate500).font("Helvetica").fontSize(6.5).text(`Report ID: ${data.reportId}`, pageWidth - margins.right - 140, y + 2, { width: 140, align: "right", lineBreak: false })
    // thin line
    const lineY = y + 22
    doc.strokeColor(C.line).lineWidth(0.7).moveTo(x, lineY).lineTo(pageWidth - margins.right, lineY).stroke()
    doc.y = lineY + 10
  }

  function drawFooter(pageNum: number, totalPages: number) {
    const footY = pageHeight - margins.bottom + 10
    const x = margins.left
    const w = contentWidth
    doc.save()
    // top line
    doc.strokeColor(C.line).lineWidth(0.5).moveTo(x, footY - 8).lineTo(x + w, footY - 8).stroke()
    doc.fillColor(C.muted).font("Helvetica").fontSize(6)
    doc.text(brand.report.footerText, x, footY, { width: w / 2, align: "left", lineBreak: false })
    doc.text(`Page ${pageNum} of ${totalPages}`, x + w / 2, footY, { width: w / 2, align: "right", lineBreak: false })
    doc.fillColor(C.muted).fontSize(5.5).text(`Report ID: ${data.reportId}  •  v${data.version}  •  ${formatDate(data.generatedAt)}`, x, footY + 9, { width: w, align: "center", lineBreak: false })
    doc.restore()
  }

  // Will collect pages where we need to draw footers later; we buffer, so we'll draw at end

  // COVER PAGE
  {
    // No header for cover, custom layout
    const topY = 34
    // Logo centered? spec says top: logo left + tagline, right side INTEGRITY EDUCATION TRUST
    drawLogo(doc, margins.left, topY, 32, { withWordmark: true })
    // Right side vertical values
    const rightX = pageWidth - margins.right - 110
    doc.save()
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(7).text("INTEGRITY", rightX, topY + 2, { width: 110, align: "right", characterSpacing: 1.2 })
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(7).text("EDUCATION", rightX, topY + 12, { width: 110, align: "right", characterSpacing: 1.2 })
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(7).text("TRUST", rightX, topY + 22, { width: 110, align: "right", characterSpacing: 1.2 })
    doc.restore()

    // Abstract pattern — very subtle academic/security lines below top
    const patternY = topY + 42
    doc.save()
    doc.strokeColor(C.line).lineWidth(0.5)
    doc.moveTo(margins.left, patternY).lineTo(pageWidth - margins.right, patternY).stroke()
    // dots decoration
    doc.fillColor(C.secondary).fillOpacity(0.12)
    for (let i = 0; i < 5; i++) {
      const cx = margins.left + 18 + i * 14
      doc.circle(cx, patternY + 14, 1.2).fill()
    }
    doc.fillOpacity(1)
    doc.restore()

    // Hero
    const heroY = patternY + 34
    doc.save()
    // Large title - properly arranged: "&" and "INTEGRITY REPORT" on same baseline without overlap
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(28).text("EXAMINATION", margins.left, heroY, { width: contentWidth, align: "left", lineBreak: false })
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(28).text("PERFORMANCE", margins.left, heroY + 32, { width: contentWidth, align: "left", lineBreak: false })
    const amp = "&"
    const ampX = margins.left + 24
    const ampY = heroY + 64
    doc.fillColor(C.secondary).font("Helvetica-Bold").fontSize(28).text(amp, ampX, ampY, { lineBreak: false })
    const ampWidth = doc.widthOfString(amp)
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(28).text("INTEGRITY REPORT", ampX + ampWidth + 10, ampY, { lineBreak: false })
    // Subtitle
    doc.fillColor(C.muted).font("Helvetica").fontSize(10.5).text("A Comprehensive View of Your Assessment Results", margins.left, heroY + 106, { width: contentWidth, align: "left" })
    doc.fillColor(C.muted).font("Helvetica").fontSize(10.5).text("and Exam-Session Insights", margins.left, heroY + 121, { width: contentWidth, align: "left" })
    doc.restore()

    // Decorative thin accent line under subtitle
    doc.save()
    doc.strokeColor(C.secondary).lineWidth(2).moveTo(margins.left, heroY + 142).lineTo(margins.left + 48, heroY + 142).stroke()
    doc.strokeColor(C.line).lineWidth(0.7).moveTo(margins.left + 52, heroY + 142).lineTo(pageWidth - margins.right, heroY + 142).stroke()
    doc.restore()

    // Metadata grid — 2x2 cards
    const metaY = heroY + 164
    const cardGap = 12
    const cardW = (contentWidth - cardGap) / 2
    const cardH = 48
    const metaItems = [
      { label: "Report ID", value: data.reportId },
      { label: "Generated On", value: formatDate(data.generatedAt) },
      { label: "Academic Year", value: data.institution.academicYear },
      { label: "Institution", value: data.institution.name },
    ]
    metaItems.forEach((it, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const x = margins.left + col * (cardW + cardGap)
      const y = metaY + row * (cardH + cardGap)
      // card bg
      doc.save()
      doc.roundedRect(x, y, cardW, cardH, 8).fillAndStroke("#F8FAFC", C.line)
      // label
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(it.label.toUpperCase(), x + 12, y + 10, { width: cardW - 24, characterSpacing: 0.9, lineBreak: false })
      // value - wrap
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(9).text(String(it.value), x + 12, y + 23, { width: cardW - 24, lineBreak: true })
      doc.restore()
    })

    // Privacy / Purpose statement — information box
    const boxY = metaY + 2 * (cardH + cardGap) + 18
    const boxH = 76
    doc.save()
    doc.roundedRect(margins.left, boxY, contentWidth, boxH, 8).fillAndStroke(C.secondarySoft, C.secondaryRing)
    // left accent bar
    doc.roundedRect(margins.left, boxY, 4, boxH, 2).fill(C.secondary)
    // quote
    doc.fillColor(C.primaryLight).font("Helvetica-BoldOblique").fontSize(8.5).text("“ Technology assists teachers — it does not replace human judgment. ”", margins.left + 16, boxY + 14, { width: contentWidth - 32, align: "center" })
    // explanation
    doc.fillColor(C.slate600).font("Helvetica").fontSize(7.5).text("This report summarizes assessment performance and recorded exam-session observations for educational review purposes. Integrity indicators are review-priority signals, not determinations of misconduct. Final interpretation rests with the educator.", margins.left + 16, boxY + 32, { width: contentWidth - 32, align: "center", lineGap: 2 })
    // Restore font fallback — Helvetica-BoldOblique may not exist, fallback to Helvetica-Oblique or Helvetica
    doc.restore()

    // Cover footer
    const coverFootY = pageHeight - margins.bottom + 10
    doc.save()
    doc.strokeColor(C.line).lineWidth(0.5).moveTo(margins.left, coverFootY - 8).lineTo(margins.left + contentWidth, coverFootY - 8).stroke()
    doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(brand.report.footerText, margins.left, coverFootY, { width: contentWidth / 2, align: "left" })
    doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(`Page 1 of —`, margins.left + contentWidth / 2, coverFootY, { width: contentWidth / 2, align: "right" })
    doc.fillColor(C.muted).fontSize(5.5).text(`Report ID: ${data.reportId}  •  v${data.version}`, margins.left, coverFootY + 9, { width: contentWidth, align: "center" })
    doc.restore()

    // Ensure we account for cover page already, next content starts on new page
  }

  // Helper state for content pages
  let isFirstContentPage = true

  function newContentPage() {
    doc.addPage()
    drawHeader()
  }

  // Start PAGE 2 — Student, Exam, Result, Performance
  newContentPage()

  // Utility: check space and maybe new page, preserving section title with content
  function ensureSpace(needed: number) {
    if (doc.y + needed > pageHeight - margins.bottom - footerHeight) {
      newContentPage()
      return true
    }
    return false
  }

  function drawSectionHeader(num: string, title: string, subtitle?: string) {
    ensureSpace(34)
    const y = doc.y
    // number badge
    doc.save()
    doc.roundedRect(margins.left, y, 22, 22, 6).fill(C.primary)
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9).text(num, margins.left, y + 6, { width: 22, align: "center", lineBreak: false })
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(11).text(title, margins.left + 30, y + 3, { width: contentWidth - 30, lineBreak: false })
    if (subtitle) {
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(subtitle, margins.left + 30, y + 17, { width: contentWidth - 30, lineBreak: false })
    }
    doc.restore()
    doc.y = y + 28
    // divider
    doc.save()
    doc.strokeColor(C.line).lineWidth(0.6).moveTo(margins.left, doc.y).lineTo(margins.left + contentWidth, doc.y).stroke()
    doc.restore()
    doc.y += 10
  }

  function drawInfoCard(items: Array<{ label: string; value: string }>, opts?: { columns?: number }) {
    const cols = opts?.columns ?? 2
    const gap = 10
    const colW = (contentWidth - gap * (cols - 1)) / cols
    const rowH = 38
    // compute rows needed
    const rows = Math.ceil(items.length / cols)
    const needed = rows * rowH + (rows - 1) * gap
    ensureSpace(needed + 6)
    const startY = doc.y
    // draw cards grid with rounded borders
    // Instead of absolute cards, draw rows sequentially measuring heights? Use fixed height for uniformity; wrap value inside
    // We'll draw each item as a card with auto height? For simplicity uniform fixed height 38 and wrap inside
    // Need to handle long values wrapping: We'll calculate text height
    let curY = startY
    for (let r = 0; r < rows; r++) {
      const rowItems = items.slice(r * cols, (r + 1) * cols)
      // Determine max height for this row (text wrapping)
      let maxH = rowH
      // We'll compute needed height per item: measure text
      // Approximate: use doc.heightOfString
      const heights = rowItems.map(it => {
        doc.font("Helvetica-Bold").fontSize(8)
        const h = doc.heightOfString(String(it.value), { width: colW - 20 })
        return Math.max(28, h + 18) // label + value
      })
      const rowMax = Math.max(...heights, rowH)
      ensureSpace(rowMax + gap)
      curY = doc.y // update after ensure
      rowItems.forEach((it, ci) => {
        const x = margins.left + ci * (colW + gap)
        const y = curY
        doc.save()
        doc.roundedRect(x, y, colW, rowMax, 7).fillAndStroke("#FFFFFF", C.line)
        // label
        doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(String(it.label).toUpperCase(), x + 10, y + 7, { width: colW - 20, characterSpacing: 0.6, lineBreak: false })
        // value
        doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(8).text(String(it.value), x + 10, y + 16, { width: colW - 20, lineBreak: true })
        doc.restore()
      })
      doc.y = curY + rowMax + gap
    }
    doc.y += 2
  }

  function drawResultCard() {
    const isPassed = data.result.status === "PASSED"
    const isPending = data.result.status === "PENDING EVALUATION"
    // Card overall
    ensureSpace(140)
    const y0 = doc.y
    const cardH = 112
    doc.save()
    // outer card with subtle border
    doc.roundedRect(margins.left, y0, contentWidth, cardH, 10).fillAndStroke("#FFFFFF", C.line)
    // top accent
    const accent = isPending ? C.warning : isPassed ? C.success : C.danger
    doc.roundedRect(margins.left, y0, contentWidth, 4, 2).fill(accent)
    doc.restore()

    // left side: large percentage
    const leftW = contentWidth * 0.42
    const centerX = margins.left + leftW / 2
    // Circle bg for perf?
    // Percentage
    doc.save()
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(32).text(`${data.result.percentage}%`, margins.left + 12, y0 + 22, { width: leftW - 24, align: "center", lineBreak: false })
    // Status badge
    const badgeText = data.result.status
    let badgeBg = "#ECFDF5", badgeBorder = "#A7F3D0", badgeColor = "#065F46"
    if (isPending) { badgeBg = C.warningSoft; badgeBorder = C.warningBorder; badgeColor = "#92400E" }
    else if (!isPassed) { badgeBg = C.dangerSoft; badgeBorder = C.dangerBorder; badgeColor = "#991B1B" }
    const badgeY = y0 + 62
    const badgeW = 88
    const badgeX = centerX - badgeW / 2
    doc.roundedRect(badgeX, badgeY, badgeW, 18, 9).fillAndStroke(badgeBg, badgeBorder)
    doc.fillColor(badgeColor).font("Helvetica-Bold").fontSize(7).text(badgeText, badgeX, badgeY + 5, { width: badgeW, align: "center", characterSpacing: 0.7, lineBreak: false })
    // vertical divider
    doc.save()
    doc.strokeColor(C.line).lineWidth(0.7).moveTo(margins.left + leftW, y0 + 14).lineTo(margins.left + leftW, y0 + cardH - 14).stroke()
    doc.restore()
    doc.restore()

    // right side: details grid 2x2
    const rightX = margins.left + leftW + 14
    const rightW = contentWidth - leftW - 28
    const detailItems = [
      { label: "Marks Obtained", value: `${data.result.obtained} / ${data.result.totalMarks}` },
      { label: "Correct Answers", value: String(data.result.correct) },
      { label: "Incorrect", value: String(data.result.incorrect) },
      { label: "Unanswered", value: String(data.result.unanswered) },
    ]
    // Add pass/fail extra?
    // We'll draw 2 cols
    const detGap = 8
    const detColW = (rightW - detGap) / 2
    let detY = y0 + 16
    detailItems.forEach((it, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const x = rightX + col * (detColW + detGap)
      const y = detY + row * 36
      doc.save()
      doc.roundedRect(x, y, detColW, 28, 6).fillAndStroke("#F8FAFC", C.line)
      doc.fillColor(C.muted).font("Helvetica").fontSize(5.5).text(it.label.toUpperCase(), x + 8, y + 6, { width: detColW - 16, characterSpacing: 0.6, lineBreak: false })
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(8).text(it.value, x + 8, y + 14, { width: detColW - 16, lineBreak: false })
      doc.restore()
    })
    // completion time below
    if (data.result.completionText) {
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(`Completion time: ${data.result.completionText}`, rightX, y0 + cardH - 18, { width: rightW, lineBreak: false })
    }

    doc.y = y0 + cardH + 14
  }

  function drawDonutChart() {
    ensureSpace(170)
    const y0 = doc.y
    // Section already has title, now draw chart + legend side by side
    const chartAreaH = 130
    const chartW = contentWidth
    doc.save()
    doc.roundedRect(margins.left, y0, chartW, chartAreaH, 8).fillAndStroke("#FFFFFF", C.line)
    doc.restore()
    // Chart: left 140 width for donut
    const donutCenterX = margins.left + 72
    const donutCenterY = y0 + chartAreaH / 2
    const outerR = 44
    const innerR = 28
    const total = data.result.correct + data.result.incorrect + data.result.unanswered
    const segs = [
      { value: data.result.correct, color: C.success },
      { value: data.result.incorrect, color: C.danger },
      { value: data.result.unanswered, color: C.slate500 },
    ]
    let curAngle = -90 // start top
    // Draw segments
    segs.forEach((seg) => {
      if (seg.value <= 0 || total === 0) return
      const sweep = (seg.value / total) * 360
      const endAngle = curAngle + sweep
      // doc.path arc
      const startRad = (curAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180
      const x1 = donutCenterX + outerR * Math.cos(startRad)
      const y1 = donutCenterY + outerR * Math.sin(startRad)
      const x2 = donutCenterX + outerR * Math.cos(endRad)
      const y2 = donutCenterY + outerR * Math.sin(endRad)
      const x3 = donutCenterX + innerR * Math.cos(endRad)
      const y3 = donutCenterY + innerR * Math.sin(endRad)
      const x4 = donutCenterX + innerR * Math.cos(startRad)
      const y4 = donutCenterY + innerR * Math.sin(startRad)
      const large = sweep > 180 ? 1 : 0
      doc.save()
      doc.fillColor(seg.color).strokeColor(seg.color).lineWidth(0.4)
      doc.path(`M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`).fill()
      doc.restore()
      curAngle = endAngle
    })
    // Center text
    doc.save()
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(13).text(`${data.result.correct + data.result.incorrect + data.result.unanswered > 0 ? data.result.correct : 0}`, donutCenterX - 18, donutCenterY - 10, { width: 36, align: "center", lineBreak: false })
    doc.fillColor(C.muted).font("Helvetica").fontSize(5.5).text("TOTAL", donutCenterX - 18, donutCenterY + 5, { width: 36, align: "center", characterSpacing: 0.8, lineBreak: false })
    doc.restore()

    // Legend right side
    const legendX = margins.left + 144
    let ly = y0 + 18
    const legendItems = [
      { label: "Correct", value: data.result.correct, color: C.success, pct: total ? Math.round((data.result.correct / total) * 100) : 0 },
      { label: "Incorrect", value: data.result.incorrect, color: C.danger, pct: total ? Math.round((data.result.incorrect / total) * 100) : 0 },
      { label: "Unanswered", value: data.result.unanswered, color: C.slate500, pct: total ? Math.round((data.result.unanswered / total) * 100) : 0 },
    ]
    legendItems.forEach((it) => {
      doc.save()
      doc.roundedRect(legendX, ly, 10, 10, 2).fill(it.color)
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(8).text(`${it.label}`, legendX + 16, ly + 1, { lineBreak: false })
      doc.fillColor(C.muted).font("Helvetica").fontSize(7).text(`${it.value} • ${it.pct}%`, legendX + 78, ly + 1, { width: 60, align: "right", lineBreak: false })
      // subtle divider
      doc.strokeColor(C.line).lineWidth(0.4).moveTo(legendX, ly + 15).lineTo(legendX + 148, ly + 15).stroke()
      doc.restore()
      ly += 22
    })
    // Performance summary text below legend
    const summaryY = ly + 4
    doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(`Performance summary: ${data.result.correct} correct of ${total} questions • ${data.result.percentage}% overall • ${data.result.status.toLowerCase()}`, legendX, summaryY, { width: 152, lineBreak: true })
    doc.save()
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(6.5).text(`Marks: ${data.result.obtained} / ${data.result.totalMarks}`, legendX, summaryY + 22, { lineBreak: false })
    doc.restore()

    // Title above chart
    doc.fillColor(C.muted).font("Helvetica").fontSize(6).text("CHART: ANSWER DISTRIBUTION", margins.left + 14, y0 + 8, { characterSpacing: 0.8, lineBreak: false })

    doc.y = y0 + chartAreaH + 14
  }

  // Helper to draw question table with repeating header and page breaks
  function drawQuestionTable() {
    const colDefs = [
      { key: "no", title: "Q.No.", width: 34 },
      { key: "type", title: "Type", width: 54 },
      { key: "your", title: "Your Answer", width: 118 },
      { key: "correct", title: "Correct", width: 90 },
      { key: "result", title: "Result", width: 68 },
      { key: "marks", title: "Marks", width: 54 },
    ]
    // total width check: sum ~418? contentWidth 499, so leave 81 spare distribute? We'll compute total: 34+54+118+90+68+54=418 so fits with margins.
    // Adjust widths to fill contentWidth: scale factor
    const totalW = colDefs.reduce((s, c) => s + c.width, 0)
    const scale = contentWidth / totalW
    colDefs.forEach((c) => (c.width = Math.floor(c.width * scale)))
    // correct rounding ensures sum ~499
    const last = colDefs[colDefs.length - 1]
    last.width += contentWidth - colDefs.reduce((s, c) => s + c.width, 0)

    const headerH = 22
    const rowPad = 6
    const fontSize = 6.8

    function drawHeaderRow(y: number) {
      let x = margins.left
      doc.save()
      doc.roundedRect(margins.left, y, contentWidth, headerH, 4).fill(C.primary)
      // also fill rect
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(6.2)
      colDefs.forEach((col) => {
        doc.text(col.title, x + 6, y + 8, { width: col.width - 12, align: col.key === "no" || col.key === "marks" ? "center" : "left", lineBreak: false })
        x += col.width
      })
      doc.restore()
      return y + headerH
    }

    function drawRow(y: number, q: any, idx: number): number {
      // calculate needed height based on wrapping of your/correct/text
      const yourText = q.studentAnswer ? String(q.studentAnswer) : "—"
      const corrText = q.correctAnswer ? String(q.correctAnswer) : (q.subjective ? "—" : "—")
      // Measure heights
      doc.font("Helvetica").fontSize(fontSize)
      const yourH = doc.heightOfString(yourText, { width: colDefs[2].width - 12 })
      const corrH = doc.heightOfString(corrText, { width: colDefs[3].width - 12 })
      const qTypeH = 10
      const hNeeded = Math.max(yourH, corrH, qTypeH) + rowPad * 2
      const rowH = Math.max(22, hNeeded)
      // check if fits
      if (y + rowH > pageHeight - margins.bottom - footerHeight) {
        // new page
        newContentPage()
        y = drawHeaderRow(doc.y)
        // update doc.y after header?
        doc.y = y
      }
      let x = margins.left
      const isEven = idx % 2 === 0
      // bg
      doc.save()
      if (isEven) doc.roundedRect(margins.left, y, contentWidth, rowH, 0).fill("#F8FAFC")
      else doc.roundedRect(margins.left, y, contentWidth, rowH, 0).fill("#FFFFFF")
      doc.strokeColor(C.line).lineWidth(0.4).moveTo(margins.left, y + rowH).lineTo(margins.left + contentWidth, y + rowH).stroke()
      doc.restore()

      // cells
      // Q.No.
      doc.save()
      doc.fillColor(C.ink).font("Helvetica").fontSize(fontSize).text(String(idx + 1), x + 4, y + rowPad, { width: colDefs[0].width - 8, align: "center", lineBreak: false })
      x += colDefs[0].width
      // Type
      const typeDisp = q.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      doc.fillColor(C.slate600).font("Helvetica").fontSize(6.2).text(truncate(typeDisp, 18), x + 6, y + rowPad, { width: colDefs[1].width - 12, lineBreak: false })
      // small points
      doc.fillColor(C.muted).font("Helvetica").fontSize(5).text(`${q.points} pts`, x + 6, y + rowPad + 9, { width: colDefs[1].width - 12, lineBreak: false })
      x += colDefs[1].width
      // Your answer
      doc.fillColor(q.studentAnswer ? C.ink : C.muted).font("Helvetica").fontSize(fontSize).text(yourText, x + 6, y + rowPad, { width: colDefs[2].width - 12, lineBreak: true })
      x += colDefs[2].width
      // Correct
      doc.fillColor(q.correctAnswer ? C.ink : C.muted).font("Helvetica").fontSize(fontSize).text(corrText, x + 6, y + rowPad, { width: colDefs[3].width - 12, lineBreak: true })
      x += colDefs[3].width
      // Result badge
      const result = q.result
      let badgeBg = "#F1F5F9", badgeColor = "#475569", badgeBorder = "#E2E8F0"
      if (result === "Correct") { badgeBg = C.successSoft; badgeBorder = C.successBorder; badgeColor = "#065F46" }
      else if (result === "Incorrect") { badgeBg = C.dangerSoft; badgeBorder = C.dangerBorder; badgeColor = "#991B1B" }
      else if (result === "Pending") { badgeBg = C.warningSoft; badgeBorder = C.warningBorder; badgeColor = "#92400E" }
      else if (result === "Evaluated") { badgeBg = C.secondarySoft; badgeBorder = C.secondaryRing; badgeColor = C.secondary }
      const badgeW = 52
      const badgeX = x + (colDefs[4].width - badgeW) / 2
      const badgeY = y + (rowH - 14) / 2
      doc.save()
      doc.roundedRect(badgeX, badgeY, badgeW, 14, 7).fillAndStroke(badgeBg, badgeBorder)
      doc.fillColor(badgeColor).font("Helvetica-Bold").fontSize(5.2).text(result.toUpperCase(), badgeX, badgeY + 4, { width: badgeW, align: "center", characterSpacing: 0.5, lineBreak: false })
      doc.restore()
      x += colDefs[4].width
      // Marks
      const marksText = q.marksAwarded !== null && q.marksAwarded !== undefined ? `${q.marksAwarded} / ${q.points}` : (q.subjective ? "—" : "0 / " + q.points)
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(fontSize).text(marksText, x + 4, y + rowPad, { width: colDefs[5].width - 8, align: "center", lineBreak: false })
      doc.restore()

      // grid vertical lines subtle
      doc.save()
      doc.strokeColor(C.line).lineWidth(0.4)
      let vx = margins.left
      colDefs.forEach((col) => {
        vx += col.width
        if (col !== colDefs[colDefs.length - 1]) doc.moveTo(vx, y).lineTo(vx, y + rowH).stroke()
      })
      doc.restore()

      return y + rowH
    }

    // Ensure header space
    ensureSpace(headerH + 28)
    let y = drawHeaderRow(doc.y)
    doc.y = y
    let curY = y
    data.questions.forEach((q, idx) => {
      curY = drawRow(curY, q, idx)
    })
    doc.y = curY + 10
  }

  function drawSubjectiveReviews() {
    if (data.subjectiveReviews.length === 0) {
      doc.fillColor(C.muted).font("Helvetica").fontSize(7).text("No subjective answers in this examination.", margins.left, doc.y, { width: contentWidth, lineBreak: true })
      doc.y += 14
      return
    }
    data.subjectiveReviews.forEach((r, idx) => {
      // Estimate height: question text + answer + feedback
      const blockPad = 10
      const innerW = contentWidth - blockPad * 2
      // Prepare texts
      const qText = r.questionText
      const ansText = r.studentAnswer || "— No answer provided —"
      const feedbackText = r.teacherFeedback || null
      const marksText = r.marksAwarded !== null && r.marksAwarded !== undefined ? `${r.marksAwarded} / ${r.points} marks` : `Pending evaluation • ${r.points} marks`

      // Measure heights
      doc.font("Helvetica-Bold").fontSize(7)
      const qH = doc.heightOfString(`Q${r.order}. ${qText}`, { width: innerW })
      doc.font("Helvetica").fontSize(7)
      const ansH = doc.heightOfString(ansText, { width: innerW - 8 })
      const feedbackH = feedbackText ? doc.heightOfString(feedbackText, { width: innerW - 8 }) : 0
      const marksH = 12
      const totalH = 14 + qH + 10 + 12 + 10 + ansH + 10 + marksH + (feedbackText ? 10 + feedbackH + 8 : 0) + blockPad

      ensureSpace(totalH + 12)
      const y0 = doc.y
      const blockH = totalH
      // card
      doc.save()
      doc.roundedRect(margins.left, y0, contentWidth, blockH, 8).fillAndStroke("#FFFFFF", C.line)
      // left accent for pending vs evaluated
      const accent = r.marksAwarded !== null ? C.success : C.warning
      doc.roundedRect(margins.left, y0, 4, blockH, 2).fill(accent)
      doc.restore()

      let curY = y0 + blockPad
      // Header: Question number + type
      doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(`QUESTION ${r.order}  •  ${r.type.replace(/_/g, " ")}  •  ${r.points} MARKS`, margins.left + blockPad, curY, { width: innerW, characterSpacing: 0.7, lineBreak: false })
      curY += 12
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(7.5).text(`Q${r.order}. ${qText}`, margins.left + blockPad, curY, { width: innerW, lineBreak: true })
      curY += qH + 6
      // Divider
      doc.save()
      doc.strokeColor(C.line).lineWidth(0.4).moveTo(margins.left + blockPad, curY).lineTo(margins.left + blockPad + innerW, curY).stroke()
      doc.restore()
      curY += 8
      // Your Answer label
      doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(6).text("YOUR ANSWER", margins.left + blockPad, curY, { characterSpacing: 0.8, lineBreak: false })
      curY += 10
      doc.save()
      doc.roundedRect(margins.left + blockPad, curY, innerW, ansH + 12, 6).fillAndStroke(ansText.startsWith("—") ? "#F8FAFC" : "#FFFFFF", C.line)
      doc.fillColor(ansText.startsWith("—") ? C.muted : C.slate700).font("Helvetica").fontSize(7).text(ansText, margins.left + blockPad + 6, curY + 6, { width: innerW - 12, lineBreak: true })
      doc.restore()
      curY += ansH + 16
      // Marks + feedback row
      doc.fillColor(C.muted).font("Helvetica").fontSize(6).text("MARKS AWARDED", margins.left + blockPad, curY, { characterSpacing: 0.8, lineBreak: false })
      doc.fillColor(r.marksAwarded !== null ? C.success : C.warning).font("Helvetica-Bold").fontSize(7.5).text(marksText, margins.left + blockPad + 90, curY, { lineBreak: false })
      curY += 14
      if (feedbackText) {
        doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(6).text("TEACHER FEEDBACK", margins.left + blockPad, curY, { characterSpacing: 0.8, lineBreak: false })
        curY += 10
        doc.save()
        doc.roundedRect(margins.left + blockPad, curY, innerW, feedbackH + 12, 6).fillAndStroke(C.secondarySoft, C.secondaryRing)
        doc.fillColor(C.slate600).font("Helvetica").fontSize(7).text(feedbackText, margins.left + blockPad + 6, curY + 6, { width: innerW - 12, lineBreak: true })
        doc.restore()
        curY += feedbackH + 16
      } else {
        doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text("No teacher feedback provided.", margins.left + blockPad, curY, { lineBreak: false })
        curY += 12
      }

      doc.y = y0 + blockH + 10
    })
  }

  function drawIntegrityReview() {
    ensureSpace(100)
    const y0 = doc.y
    const cardH = 86
    doc.save()
    doc.roundedRect(margins.left, y0, contentWidth, cardH, 10).fillAndStroke("#FFFFFF", C.line)
    // left accent based on level
    const score = data.integrity.score ?? 0
    let levelColor = C.success
    let levelBg = C.successSoft
    if (score >= 80) { levelColor = C.danger; levelBg = C.dangerSoft }
    else if (score >= 60) { levelColor = C.warning; levelBg = C.warningSoft }
    else if (score >= 30) { levelColor = "#0284C7"; levelBg = "#F0F9FF" }
    doc.roundedRect(margins.left, y0, 4, cardH, 2).fill(levelColor)
    doc.restore()

    // Score circle left
    const scoreX = margins.left + 28
    const scoreY = y0 + cardH / 2
    const scoreR = 30
    doc.save()
    // bg circle
    doc.circle(scoreX + 22, scoreY, scoreR).fillAndStroke(levelBg, levelColor)
    doc.fillColor(levelColor).font("Helvetica-Bold").fontSize(16).text(`${score}`, scoreX + 6, scoreY - 10, { width: 32, align: "center", lineBreak: false })
    doc.fillColor(C.muted).font("Helvetica").fontSize(5.5).text("/ 100", scoreX + 6, scoreY + 8, { width: 32, align: "center", characterSpacing: 0.6, lineBreak: false })
    doc.restore()

    // Right side details
    const rightX = margins.left + 78
    const rightW = contentWidth - 78 - 16
    const levelDisp = data.integrity.levelDisplay || "—"
    const statusDisp = data.integrity.statusDisplay || "—"
    doc.fillColor(levelColor).font("Helvetica-Bold").fontSize(9).text(levelDisp.toUpperCase(), rightX, y0 + 16, { characterSpacing: 0.7, lineBreak: false })
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(8).text(statusDisp, rightX + 8 + doc.widthOfString(levelDisp.toUpperCase()) + 8, y0 + 16, { lineBreak: false })
    // Actually we did overlapping, recalc: measure
    // Simplify status below
    doc.fillColor(C.slate600).font("Helvetica").fontSize(6.5).text(`Status: ${statusDisp}`, rightX, y0 + 34, { width: rightW, lineBreak: false })
    // Important wording
    const note = "This score indicates the priority for teacher review based on exam-related activity signals. It is not an automatic determination of academic misconduct."
    doc.fillColor(C.muted).font("Helvetica").fontSize(6.2).text(note, rightX, y0 + 48, { width: rightW, lineBreak: true })
    doc.y = y0 + cardH + 14

    // Levels reference mini
    const levels = [
      { range: "0–29", label: "Normal", color: C.success },
      { range: "30–59", label: "Low Concern", color: "#0284C7" },
      { range: "60–79", label: "Requires Review", color: C.warning },
      { range: "80–100", label: "High Priority", color: C.danger },
    ]
    const lvlGap = 6
    const lvlW = (contentWidth - lvlGap * 3) / 4
    const lvlY = doc.y
    ensureSpace(30)
    levels.forEach((lvl, idx) => {
      const x = margins.left + idx * (lvlW + lvlGap)
      const isActive = (score >= 0 && score <= 29 && idx === 0) || (score >= 30 && score <= 59 && idx === 1) || (score >= 60 && score <= 79 && idx === 2) || (score >= 80 && idx === 3)
      doc.save()
      doc.roundedRect(x, lvlY, lvlW, 22, 5).fillAndStroke(isActive ? lvl.color + "14" : "#FFFFFF", isActive ? lvl.color : C.line)
      if (isActive) doc.roundedRect(x, lvlY, lvlW, 3, 2).fill(lvl.color)
      doc.fillColor(isActive ? lvl.color : C.muted).font("Helvetica-Bold").fontSize(5.5).text(lvl.range, x, lvlY + 7, { width: lvlW, align: "center", lineBreak: false })
      doc.fillColor(isActive ? lvl.color : C.slate600).font("Helvetica").fontSize(5).text(lvl.label, x, lvlY + 14, { width: lvlW, align: "center", lineBreak: false })
      doc.restore()
    })
    doc.y = lvlY + 30
  }

  function drawIntegritySignals() {
    if (!data.integrity.signals || data.integrity.signals.length === 0) {
      ensureSpace(40)
      doc.save()
      doc.roundedRect(margins.left, doc.y, contentWidth, 36, 7).fillAndStroke("#F8FAFC", C.line)
      doc.fillColor(C.muted).font("Helvetica").fontSize(7).text("No notable exam-session signals recorded.", margins.left + 12, doc.y + 13, { width: contentWidth - 24, align: "center" })
      doc.restore()
      doc.y += 46
      return
    }
    // Table: Signal | Observation | Review Impact
    const cols = [
      { title: "Signal", width: 150 },
      { title: "Observation", width: 220 },
      { title: "Review Impact", width: 129 },
    ]
    // adjust to contentWidth: 150+220+129=499 => perfect
    const headerH = 20
    ensureSpace(headerH + 28)
    let y = doc.y
    // header
    doc.save()
    doc.roundedRect(margins.left, y, contentWidth, headerH, 4).fill(C.primary)
    let x = margins.left
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(6.2)
    cols.forEach((c) => {
      doc.text(c.title, x + 8, y + 7, { width: c.width - 16, align: c.title === "Review Impact" ? "center" : "left", lineBreak: false })
      x += c.width
    })
    doc.restore()
    y += headerH
    doc.y = y

    data.integrity.signals.forEach((sig, idx) => {
      const sigTitle = sig.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
      let observation = ""
      if (Array.isArray(sig.evidence)) observation = sig.evidence.join(", ")
      else if (typeof sig.evidence === "object" && sig.evidence !== null) observation = JSON.stringify(sig.evidence).slice(0, 120)
      else observation = String(sig.evidence ?? sig.description).slice(0, 120)
      if (!observation) observation = sig.description.slice(0, 120)

      const impact = sig.severity // LOW/MEDIUM/HIGH
      // measure heights
      doc.font("Helvetica").fontSize(6.8)
      const obsH = doc.heightOfString(observation, { width: cols[1].width - 16 })
      const sigH = doc.heightOfString(sigTitle, { width: cols[0].width - 16 })
      const rowH = Math.max(28, Math.max(obsH, sigH) + 14)

      if (y + rowH > pageHeight - margins.bottom - footerHeight) {
        newContentPage()
        // re-draw header
        y = doc.y
        doc.save()
        doc.roundedRect(margins.left, y, contentWidth, headerH, 4).fill(C.primary)
        let hx = margins.left
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(6.2)
        cols.forEach((c) => {
          doc.text(c.title, hx + 8, y + 7, { width: c.width - 16, align: c.title === "Review Impact" ? "center" : "left", lineBreak: false })
          hx += c.width
        })
        doc.restore()
        y += headerH
      }

      const isEven = idx % 2 === 0
      doc.save()
      doc.rect(margins.left, y, contentWidth, rowH).fill(isEven ? "#FFFFFF" : "#F8FAFC")
      doc.strokeColor(C.line).lineWidth(0.4).moveTo(margins.left, y + rowH).lineTo(margins.left + contentWidth, y + rowH).stroke()
      // vertical lines
      let vx = margins.left + cols[0].width
      doc.moveTo(vx, y).lineTo(vx, y + rowH).stroke()
      vx += cols[1].width
      doc.moveTo(vx, y).lineTo(vx, y + rowH).stroke()
      doc.restore()

      // cells
      doc.save()
      let cx = margins.left
      // Signal + description?
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(6.8).text(sigTitle, cx + 8, y + 6, { width: cols[0].width - 16, lineBreak: true })
      // description small below? Use second line
      doc.fillColor(C.muted).font("Helvetica").fontSize(5.5).text(truncate(sig.description, 80), cx + 8, y + 6 + doc.heightOfString(sigTitle, { width: cols[0].width - 16 }) + 2, { width: cols[0].width - 16, lineBreak: true })
      cx += cols[0].width
      doc.fillColor(C.slate600).font("Helvetica").fontSize(6.8).text(observation, cx + 8, y + 7, { width: cols[1].width - 16, lineBreak: true })
      cx += cols[1].width
      // impact badge
      let badgeBg = "#F1F5F9", badgeColor = "#475569", badgeBorder = "#E2E8F0"
      if (impact === "HIGH") { badgeBg = C.dangerSoft; badgeBorder = C.dangerBorder; badgeColor = C.danger }
      else if (impact === "MEDIUM") { badgeBg = C.warningSoft; badgeBorder = C.warningBorder; badgeColor = C.warning }
      else if (impact === "LOW") { badgeBg = "#F0F9FF"; badgeBorder = "#BFDBFE"; badgeColor = "#0284C7" }
      const badgeW = 62
      const badgeX = cx + (cols[2].width - badgeW) / 2
      const badgeY = y + (rowH - 14) / 2
      doc.roundedRect(badgeX, badgeY, badgeW, 14, 7).fillAndStroke(badgeBg, badgeBorder)
      doc.fillColor(badgeColor).font("Helvetica-Bold").fontSize(5.5).text(impact, badgeX, badgeY + 4, { width: badgeW, align: "center", characterSpacing: 0.6, lineBreak: false })
      doc.restore()

      y += rowH
      doc.y = y
    })
    doc.y = y + 6
    // explanatory note
    doc.save()
    doc.fillColor(C.muted).font("Helvetica").fontSize(6).text("Recorded signals provide context for educator review. Individual signals are not proof of misconduct.", margins.left, doc.y, { width: contentWidth, align: "center", lineBreak: true })
    doc.restore()
    doc.y += 12
  }

  function drawTimeline() {
    if (!data.timeline || data.timeline.length === 0) {
      doc.fillColor(C.muted).font("Helvetica").fontSize(7).text("No timeline events recorded.", margins.left, doc.y, { width: contentWidth })
      doc.y += 14
      return
    }
    // Vertical timeline with dots, left line
    const leftX = margins.left + 10
    const lineX = leftX + 6
    const contentX = leftX + 26
    const contentW = contentWidth - 26 - 10
    // Draw timeline incrementally, handling pagination
    let y = doc.y
    // We'll need to ensure we have space for at least 2 events before new page
    // Draw line background per page? Easier: For each event, draw segment
    // We'll maintain per event position, when new page starts, restart line from top
    let pageStartY = y
    // Draw initial line segment? We'll draw events one by one, extending line

    data.timeline.forEach((ev, idx) => {
      const timeStr = formatDateTime(ev.timestamp)
      const title = ev.title
      const meta = ev.metadata ? (typeof ev.metadata === "string" ? ev.metadata : JSON.stringify(ev.metadata).slice(0, 140)) : null

      // Measure heights
      doc.font("Helvetica-Bold").fontSize(6.5)
      const timeH = doc.heightOfString(timeStr, { width: contentW })
      doc.font("Helvetica-Bold").fontSize(7.2)
      const titleH = doc.heightOfString(title, { width: contentW })
      doc.font("Helvetica").fontSize(6)
      const metaH = meta ? doc.heightOfString(String(meta).slice(0, 140), { width: contentW }) : 0
      const blockH = timeH + titleH + (meta ? metaH + 4 : 0) + 10

      if (y + blockH > pageHeight - margins.bottom - footerHeight) {
        // draw remaining line to bottom before page break
        doc.save()
        doc.strokeColor(C.line).lineWidth(1).moveTo(lineX, pageStartY).lineTo(lineX, y + 4).stroke()
        doc.restore()
        newContentPage()
        y = doc.y
        pageStartY = y
      }

      // dot
      doc.save()
      doc.circle(lineX, y + 6, 4.5).fillAndStroke("#FFFFFF", C.secondary)
      doc.circle(lineX, y + 6, 2.2).fill(C.secondary)
      doc.restore()

      // time
      doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(timeStr, contentX, y, { width: contentW, lineBreak: false })
      let curY = y + timeH + 2
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(7.2).text(title, contentX, curY, { width: contentW, lineBreak: true })
      curY += titleH + 2
      if (meta) {
        doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(String(meta).slice(0, 140), contentX, curY, { width: contentW, lineBreak: true })
        curY += metaH + 2
      }

      y = curY + 10
      doc.y = y
    })
    // final line to last event
    doc.save()
    doc.strokeColor(C.line).lineWidth(1).moveTo(lineX, pageStartY).lineTo(lineX, y - 6).stroke()
    doc.restore()
    doc.y = y + 4
  }

  function drawTeacherReview() {
    if (!data.teacherReview) {
      doc.save()
      doc.roundedRect(margins.left, doc.y, contentWidth, 36, 7).fillAndStroke("#F8FAFC", C.line)
      doc.fillColor(C.muted).font("Helvetica").fontSize(7).text("Teacher review pending.", margins.left + 12, doc.y + 13, { width: contentWidth - 24, align: "center" })
      doc.restore()
      doc.y += 46
      return
    }
    const tr = data.teacherReview
    const status = tr.status || "PENDING"
    const comments = tr.comments || (tr.notes[0]?.note ?? null)

    const cardStart = doc.y
    // We'll compute needed height: reviewer line + date + comments
    const innerPad = 12
    const innerW = contentWidth - innerPad * 2
    doc.font("Helvetica").fontSize(7)
    const commentsH = comments ? doc.heightOfString(comments, { width: innerW - 8 }) : 16
    const needed = 52 + (comments ? commentsH + 24 : 16)
    ensureSpace(needed)

    const y0 = doc.y
    doc.save()
    doc.roundedRect(margins.left, y0, contentWidth, needed, 8).fillAndStroke("#FFFFFF", C.line)
    // status color accent
    const isReviewed = status === "REVIEWED"
    const acc = isReviewed ? C.success : status === "PENDING" ? C.warning : C.secondary
    doc.roundedRect(margins.left, y0, 4, needed, 2).fill(acc)
    doc.restore()

    let curY = y0 + innerPad
    // title row
    doc.fillColor(C.muted).font("Helvetica").fontSize(6).text("TEACHER REVIEW", margins.left + innerPad, curY, { characterSpacing: 0.8, lineBreak: false })
    // badge on right
    const statusDisp = status.replace(/_/g, " ")
    let badgeBg = "#F1F5F9", badgeColor = "#475569", badgeBorder = "#E2E8F0"
    if (status === "REVIEWED") { badgeBg = C.successSoft; badgeBorder = C.successBorder; badgeColor = "#065F46" }
    else if (status === "PENDING") { badgeBg = C.warningSoft; badgeBorder = C.warningBorder; badgeColor = "#92400E" }
    else if (status === "IN_REVIEW") { badgeBg = "#F0F9FF"; badgeBorder = "#BFDBFE"; badgeColor = "#0284C7" }
    const badgeW = 90
    const badgeX = margins.left + contentWidth - innerPad - badgeW
    doc.save()
    doc.roundedRect(badgeX, curY - 2, badgeW, 16, 8).fillAndStroke(badgeBg, badgeBorder)
    doc.fillColor(badgeColor).font("Helvetica-Bold").fontSize(6).text(statusDisp.toUpperCase(), badgeX, curY + 2, { width: badgeW, align: "center", characterSpacing: 0.5, lineBreak: false })
    doc.restore()

    curY += 16
    // reviewer + date line
    const reviewerLine = `Reviewed By: ${tr.reviewerName || "—"}`
    const dateLine = `Review Date: ${tr.reviewDate ? formatDate(tr.reviewDate) : "—"}`
    doc.fillColor(C.slate600).font("Helvetica").fontSize(7).text(reviewerLine, margins.left + innerPad, curY, { width: innerW, lineBreak: false })
    curY += 12
    doc.fillColor(C.slate600).font("Helvetica").fontSize(7).text(dateLine, margins.left + innerPad, curY, { width: innerW, lineBreak: false })
    curY += 16
    // comments box
    if (comments) {
      doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(6).text("COMMENTS", margins.left + innerPad, curY, { characterSpacing: 0.8, lineBreak: false })
      curY += 10
      doc.save()
      doc.roundedRect(margins.left + innerPad, curY, innerW, commentsH + 12, 6).fillAndStroke("#F8FAFC", C.line)
      doc.fillColor(C.slate700).font("Helvetica").fontSize(7).text(comments, margins.left + innerPad + 6, curY + 6, { width: innerW - 12, lineBreak: true })
      doc.restore()
      curY += commentsH + 16
      // if multiple notes, list them? Show first only per spec, but we have notes array, maybe show count
      if (tr.notes.length > 1) {
        doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(`+ ${tr.notes.length - 1} additional note(s) on file`, margins.left + innerPad, curY, { lineBreak: false })
        curY += 10
      }
    } else {
      doc.save()
      doc.roundedRect(margins.left + innerPad, curY, innerW, 28, 6).fillAndStroke("#F8FAFC", C.line)
      doc.fillColor(C.muted).font("Helvetica").fontSize(7).text("No comments provided yet.", margins.left + innerPad + 6, curY + 9, { width: innerW - 12, align: "center" })
      doc.restore()
      curY += 32
    }

    doc.y = y0 + needed + 10
  }

  function drawClarification() {
    if (!data.clarification || !data.clarification.message) {
      doc.save()
      doc.roundedRect(margins.left, doc.y, contentWidth, 36, 7).fillAndStroke("#F8FAFC", C.line)
      doc.fillColor(C.muted).font("Helvetica").fontSize(7).text("No clarification submitted.", margins.left + 12, doc.y + 13, { width: contentWidth - 24, align: "center" })
      doc.restore()
      doc.y += 46
      return
    }
    const clar = data.clarification
    const msg = clar.message || ""
    const resp = clar.response || null
    const msgH = doc.heightOfString(msg, { width: contentWidth - 32 })
    const respH = resp ? doc.heightOfString(resp, { width: contentWidth - 32 }) : 0
    const needed = 28 + msgH + 16 + (resp ? 20 + respH + 14 : 14) + 16
    ensureSpace(needed)

    const y0 = doc.y
    doc.save()
    doc.roundedRect(margins.left, y0, contentWidth, needed, 8).fillAndStroke("#FFFFFF", C.line)
    doc.roundedRect(margins.left, y0, 4, needed, 2).fill(C.secondary)
    doc.restore()

    let curY = y0 + 12
    doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(6).text("STUDENT CLARIFICATION", margins.left + 12, curY, { characterSpacing: 0.8, lineBreak: false })
    doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(formatDate(clar.createdAt), margins.left + contentWidth - 100, curY, { width: 88, align: "right", lineBreak: false })
    curY += 16
    doc.fillColor(C.slate700).font("Helvetica").fontSize(7).text(msg, margins.left + 12, curY, { width: contentWidth - 24, lineBreak: true })
    curY += msgH + 12
    if (resp) {
      doc.save()
      doc.strokeColor(C.line).lineWidth(0.4).moveTo(margins.left + 12, curY).lineTo(margins.left + contentWidth - 12, curY).stroke()
      doc.restore()
      curY += 8
      doc.fillColor(C.muted).font("Helvetica-Bold").fontSize(6).text("TEACHER RESPONSE", margins.left + 12, curY, { characterSpacing: 0.8, lineBreak: false })
      doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(clar.respondedAt ? formatDate(clar.respondedAt) : "", margins.left + contentWidth - 100, curY, { width: 88, align: "right", lineBreak: false })
      curY += 12
      doc.save()
      doc.roundedRect(margins.left + 12, curY, contentWidth - 24, respH + 12, 6).fillAndStroke(C.secondarySoft, C.secondaryRing)
      doc.fillColor(C.slate600).font("Helvetica").fontSize(7).text(resp, margins.left + 18, curY + 6, { width: contentWidth - 36, lineBreak: true })
      doc.restore()
      curY += respH + 16
    } else {
      doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text("No teacher response yet.", margins.left + 12, curY, { lineBreak: false })
      curY += 12
    }

    doc.y = y0 + needed + 10
  }

  // NOW sequentially draw sections with proper pagination

  // 1. Student Information
  drawSectionHeader("1", "Student Information")
  drawInfoCard([
    { label: "Full Name", value: data.student.name },
    { label: "Student ID", value: data.student.studentId },
    { label: "Email", value: data.student.email },
    { label: "Class", value: data.student.className },
    { label: "Section", value: data.student.section },
    { label: "Academic Year", value: data.student.academicYear },
  ])

  // 2. Examination Information
  drawSectionHeader("2", "Examination Information")
  drawInfoCard([
    { label: "Test Title", value: data.exam.title },
    { label: "Subject", value: data.exam.subject },
    { label: "Teacher", value: data.exam.teacherName },
    { label: "Exam Date", value: formatDate(data.exam.examDate) },
    { label: "Duration", value: `${data.exam.durationMinutes} minutes` },
    { label: "Total Marks", value: String(data.exam.totalMarks) },
    { label: "Total Questions", value: String(data.exam.totalQuestions) },
    { label: "Attempts Allowed", value: String(data.exam.attemptsAllowed) },
  ])

  // 3. Final Result
  drawSectionHeader("3", "Final Result", data.meta.isPendingEvaluation ? "Subjective evaluation pending" : `${data.result.obtained} of ${data.result.totalMarks} marks`)
  drawResultCard()

  // 4. Performance Overview
  drawSectionHeader("4", "Performance Overview", "Answer distribution and summary")
  drawDonutChart()

  // 5. Question-wise Performance — may span multiple pages
  drawSectionHeader("5", "Question-wise Performance", `All ${data.questions.length} questions with responses`)
  drawQuestionTable()

  // 6. Subjective Answer Review
  drawSectionHeader("6", "Subjective Answer Review", data.subjectiveReviews.length ? `${data.subjectiveReviews.length} long-answer question(s)` : "No long-answer questions")
  drawSubjectiveReviews()

  // 7. Exam Integrity Review
  drawSectionHeader("7", "Exam Integrity Review", "Priority for educator review — not an automatic verdict")
  if (data.integrity.score !== null) drawIntegrityReview()
  else {
    doc.save()
    doc.roundedRect(margins.left, doc.y, contentWidth, 36, 7).fillAndStroke("#F8FAFC", C.line)
    doc.fillColor(C.muted).font("Helvetica").fontSize(7).text("No integrity review available yet.", margins.left + 12, doc.y + 13, { width: contentWidth - 24, align: "center" })
    doc.restore()
    doc.y += 46
  }

  // 8. Integrity Signals
  drawSectionHeader("8", "Integrity Signals", `${data.integrity.signals.length} signal(s) recorded`)
  drawIntegritySignals()

  // 9. Exam Activity Timeline
  drawSectionHeader("9", "Exam Activity Timeline", `${data.timeline.length} event(s) • chronological`)
  drawTimeline()

  // 10. Teacher Review
  drawSectionHeader("10", "Teacher Review", data.teacherReview?.status ? data.teacherReview.status : "Pending")
  drawTeacherReview()

  // 11. Student Clarification
  drawSectionHeader("11", "Student Clarification", data.clarification?.message ? "Submitted" : "None submitted")
  drawClarification()

  // Report Interpretation conclusion
  {
    ensureSpace(110)
    const y0 = doc.y
    const boxH = 88
    doc.save()
    doc.roundedRect(margins.left, y0, contentWidth, boxH, 8).fillAndStroke("#F8FAFC", C.line)
    doc.roundedRect(margins.left, y0, 4, boxH, 2).fill(C.primary)
    doc.fillColor(C.primary).font("Helvetica-Bold").fontSize(7.5).text("Report Interpretation", margins.left + 16, y0 + 12, { characterSpacing: 0.6, lineBreak: false })
    const interp = "• Performance reflects recorded assessment results from ExamGuard.\n• Integrity indicators summarize exam-session observations for educator context.\n• Teacher review remains the final interpretation. Recorded signals should be interpreted in context and do not independently establish misconduct.\n• This report is generated from ExamGuard records and is intended for educational review purposes."
    doc.fillColor(C.slate600).font("Helvetica").fontSize(6.5).text(interp, margins.left + 16, y0 + 26, { width: contentWidth - 32, lineGap: 2, lineBreak: true })
    doc.restore()
    doc.y = y0 + boxH + 14

    // Footnote
    doc.fillColor(C.muted).font("Helvetica-Oblique").fontSize(5.8).text("ExamGuard provides exam-session insights for educational review. Recorded signals should be interpreted in context and do not independently establish misconduct.", margins.left, doc.y, { width: contentWidth, align: "center", lineBreak: true })
    doc.y += 18
  }

  // Final page — verification + QR
  {
    // Ensure final verification appears clean, if space low create new page
    ensureSpace(180)
    const y0 = doc.y
    const boxH = 148
    doc.save()
    doc.roundedRect(margins.left, y0, contentWidth, boxH, 10).fillAndStroke("#FFFFFF", C.line)
    // left side text
    const leftW = contentWidth - 132
    drawLogo(doc, margins.left + 12, y0 + 12, 28)
    doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(9).text("ExamGuard", margins.left + 48, y0 + 14, { lineBreak: false })
    doc.fillColor(C.muted).font("Helvetica").fontSize(6).text("Secure Assessment & Integrity Platform", margins.left + 48, y0 + 26, { lineBreak: false })
    doc.fillColor(C.slate600).font("Helvetica").fontSize(6.5).text(`Report ID: ${data.reportId}`, margins.left + 12, y0 + 44, { lineBreak: false })
    doc.fillColor(C.slate600).font("Helvetica").fontSize(6.5).text(`Generated: ${formatDateTime(data.generatedAt)}`, margins.left + 12, y0 + 54, { lineBreak: false })
    doc.fillColor(C.slate600).font("Helvetica").fontSize(6.5).text(`Version: v${data.version}`, margins.left + 12, y0 + 64, { lineBreak: false })
    doc.fillColor(C.primaryLight).font("Helvetica-BoldOblique").fontSize(7).text("“ Technology assists teachers — it does not replace human judgment. ”", margins.left + 12, y0 + 82, { width: leftW - 8, align: "left", lineBreak: true })
    // verification details
    doc.fillColor(C.muted).font("Helvetica").fontSize(5.5).text("Verification", margins.left + 12, y0 + 106, { characterSpacing: 0.8, lineBreak: false })
    doc.fillColor(C.secondary).font("Helvetica").fontSize(6).text(truncate(data.verification.verificationUrl, 64), margins.left + 12, y0 + 116, { width: leftW - 8, lineBreak: true })
    doc.fillColor(C.muted).font("Helvetica").fontSize(5).text(`Scan QR to verify report authenticity at ${brand.domain}/verify`, margins.left + 12, y0 + 132, { width: leftW - 8, lineBreak: false })
    doc.restore()

    // QR on right
    const qrSize = 108
    const qrX = margins.left + contentWidth - qrSize - 12
    const qrY = y0 + 14
    if (qrBuffer) {
      try {
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })
      } catch {
        doc.save()
        doc.roundedRect(qrX, qrY, qrSize, qrSize, 6).fillAndStroke("#F8FAFC", C.line)
        doc.fillColor(C.muted).font("Helvetica").fontSize(5).text("QR unavailable", qrX, qrY + qrSize / 2 - 4, { width: qrSize, align: "center" })
        doc.restore()
      }
    } else {
      doc.save()
      doc.roundedRect(qrX, qrY, qrSize, qrSize, 6).fillAndStroke("#F8FAFC", C.line)
      doc.fillColor(C.muted).font("Helvetica").fontSize(5).text("No QR", qrX, qrY + qrSize / 2 - 4, { width: qrSize, align: "center" })
      doc.restore()
    }
    // QR caption
    doc.fillColor(C.muted).font("Helvetica").fontSize(5).text("QR Verification", qrX, qrY + qrSize + 4, { width: qrSize, align: "center", lineBreak: false })

    doc.y = y0 + boxH + 14
  }

  // Finalize: add footers to all pages with correct page numbers
  const range = doc.bufferedPageRange() // { start:0, count:N }
  const totalPages = range.count
  console.log(`[ExamGuard PDF] Total pages: ${totalPages} for report ${data.reportId}`)
  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i)
    const pageNum = i + 1
    if (pageNum === 1) {
      // cover already has footer page 1 of total
      // update cover footer to show correct total
      // The cover footer we drew earlier had placeholder; now redraw? Simpler: overlay correct footer at same position
      // We'll not redraw to avoid double, but patch: we can draw a white rect over old and redraw footer
      const coverFootY = pageHeight - margins.bottom + 10
      const x = margins.left
      const w = contentWidth
      // cover footer area height 20, clear
      doc.save()
      doc.rect(x, coverFootY - 10, w, 22).fill("#FFFFFF")
      doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(brand.report.footerText, x, coverFootY, { width: w / 2, align: "left" })
      doc.fillColor(C.muted).font("Helvetica").fontSize(6).text(`Page 1 of ${totalPages}`, x + w / 2, coverFootY, { width: w / 2, align: "right" })
      doc.fillColor(C.muted).fontSize(5.5).text(`Report ID: ${data.reportId}  •  v${data.version}  •  ${formatDate(data.generatedAt)}`, x, coverFootY + 9, { width: w, align: "center" })
      doc.restore()
    } else {
      drawFooter(pageNum, totalPages)
      // header is already drawn on each content page via drawHeader at page creation; but for pages created via ensureSpace newContentPage we did draw header.
      // For pages that were auto-added due to overflow without explicit header? Our ensureSpace always uses newContentPage which draws header.
      // So we are good. However we need to also ensure header for buffered pages that might have been auto created by doc.addPage fallback (not via our helper) — rare.
      // We'll ensure header present: if not, we could check but skip.
    }
  }

  doc.end()
  const buffer = await finished
  return buffer
}
