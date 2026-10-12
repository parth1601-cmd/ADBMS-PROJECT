// @ts-nocheck
import { prisma } from "../../utils/prisma.js"
import { brand } from "../../brand/branding.js"

export function generateDeterministicReportId(sessionId: string): string {
  const year = new Date().getFullYear()
  let sum = 0
  for (let i = 0; i < sessionId.length; i++) sum = (sum * 31 + sessionId.charCodeAt(i)) % 10000000
  const num = Math.abs(sum) % 1000000
  return `EG-${year}-${String(num).padStart(6, "0")}`
}

export async function ensurePersistentReport(sessionId: string, examId?: string | null, reviewId?: string | null, studentId?: string | null): Promise<{ reportId: string; version: string }> {
  const deterministicId = generateDeterministicReportId(sessionId)
  // Try to find existing Report for this session
  try {
    let existing = await prisma.report.findFirst({ where: { sessionId } })
    if (existing) {
      // Ensure reportId matches deterministic? If existing has different, keep existing (persistent)
      // Update metadata version if needed, also update reviewId/examId if missing
      const meta = existing.metadata ? JSON.parse(existing.metadata) : {}
      const currentVersion = meta.version || brand.report.version
      // Update reviewId/examId if not set
      if ((!existing.reviewId && reviewId) || (!existing.examId && examId)) {
        try {
          await prisma.report.update({ where: { id: existing.id }, data: { reviewId: reviewId || existing.reviewId, examId: examId || existing.examId } })
        } catch {}
      }
      return { reportId: existing.reportId, version: currentVersion }
    }
    // Not found — try by reportId deterministic uniqueness (maybe collision)
    const byReportId = await prisma.report.findUnique({ where: { reportId: deterministicId } }).catch(() => null)
    if (byReportId) {
      // If deterministic collides with other session's report, generate alternative with suffix
      // Use session suffix to ensure uniqueness
      const alt = `${deterministicId}-${sessionId.slice(-3).toUpperCase()}`
      const checkAlt = await prisma.report.findUnique({ where: { reportId: alt } }).catch(() => null)
      if (checkAlt && checkAlt.sessionId === sessionId) return { reportId: alt, version: brand.report.version }
      if (!checkAlt) {
        // create with alt
        const createdAlt = await prisma.report.create({
          data: {
            reportId: alt,
            sessionId,
            examId: examId || null,
            reviewId: reviewId || null,
            reportType: "RESULT",
            metadata: JSON.stringify({ version: brand.report.version, generatedAt: new Date().toISOString() }),
          },
        })
        return { reportId: createdAlt.reportId, version: brand.report.version }
      }
      // fallback
      return { reportId: deterministicId, version: brand.report.version }
    }
    // Create new
    const created = await prisma.report.create({
      data: {
        reportId: deterministicId,
        sessionId,
        examId: examId || null,
        reviewId: reviewId || null,
        reportType: "RESULT",
        metadata: JSON.stringify({ version: brand.report.version, generatedAt: new Date().toISOString() }),
      },
    })
    return { reportId: created.reportId, version: brand.report.version }
  } catch (e) {
    // If DB fails (e.g., Report table missing), fallback to deterministic without persistence
    return { reportId: deterministicId, version: brand.report.version }
  }
}

export function sanitizeFilename(input: string): string {
  // Allow alphanumeric, dash, underscore, dot; replace others with underscore, limit length 120
  let s = String(input || "Report").replace(/[^a-zA-Z0-9\-_ .]/g, "_")
  s = s.replace(/\s+/g, "_").replace(/__+/g, "_")
  if (s.length > 120) s = s.slice(0, 120)
  // Prevent path traversal
  s = s.replace(/\.\./g, "_")
  s = s.replace(/^\/+/, "")
  return s
}

export function buildPdfFilename(data: { studentName: string; examTitle: string; reportId: string }): string {
  const student = sanitizeFilename(data.studentName.replace(/\s+/g, "_"))
  const exam = sanitizeFilename(data.examTitle.replace(/\s+/g, "_"))
  const report = sanitizeFilename(data.reportId)
  // Pattern: ExamGuard_Student_Exam_ReportId.pdf
  return `ExamGuard_${student}_${exam}_${report}.pdf`
}
