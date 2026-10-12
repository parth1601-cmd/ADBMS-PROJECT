import { PrismaClient } from '@prisma/client'
import { buildReportData } from '../src/modules/reportPdf/reportDataBuilder.js'
import { renderReportPdf } from '../src/modules/reportPdf/pdfReportRenderer.js'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing PDF generation...')
  // Find sessions
  const sessions = await prisma.examSession.findMany({ take: 5, include: { student: true, exam: true } })
  console.log(`Found ${sessions.length} sessions`)
  for (const s of sessions) {
    console.log(`- ${s.id.slice(-6)} ${s.student.name} ${s.exam.title} ${s.status}`)
  }
  // Pick first session for detailed test
  const testId = sessions[0]?.id
  if (!testId) {
    console.error('No sessions found - run seed')
    process.exit(1)
  }
  console.log(`\nBuilding report data for ${testId} ...`)
  const data = await buildReportData(testId, { verificationBaseUrl: 'http://localhost:5173' })
  console.log('ReportData built:', {
    reportId: data.reportId,
    version: data.version,
    student: data.student.name,
    exam: data.exam.title,
    result: data.result,
    qCount: data.questions.length,
    signals: data.integrity.signals.length,
    timeline: data.timeline.length,
    clarification: !!data.clarification?.message,
  })
  console.log('Rendering PDF...')
  const buf = await renderReportPdf(data)
  console.log(`PDF buffer length: ${buf.length} bytes`)
  // Write to temp
  const outPath = path.join(process.cwd(), `ExamGuard_TEST_${data.reportId}.pdf`)
  fs.writeFileSync(outPath, buf)
  console.log(`Written to ${outPath}`)
  // Check PDF header
  const header = buf.slice(0, 8).toString()
  console.log('PDF header:', header)
  // Verify persistent reportId: call again
  const data2 = await buildReportData(testId, { verificationBaseUrl: 'http://localhost:5173' })
  console.log(`Second build reportId: ${data2.reportId} (should match first: ${data.reportId === data2.reportId ? 'OK' : 'MISMATCH'})`)

  // Test auth: try to generate for unknown session
  // Also test verification endpoint concept: check Report table
  const reportRec = await prisma.report.findFirst({ where: { sessionId: testId } })
  console.log('Persistent Report record:', reportRec ? `${reportRec.reportId} type=${reportRec.reportType} metadata=${reportRec.metadata?.slice(0,80)}` : 'none (fallback)')

  // Test with long subjective: find session with subjectiveReviews
  const withSubjective = sessions.find(s => s.exam.title.includes('Mathematics'))
  if (withSubjective) {
    const d2 = await buildReportData(withSubjective.id, { verificationBaseUrl: 'http://localhost:5173' })
    console.log(`\nSubjective test: ${d2.subjectiveReviews.length} subjective reviews, isPending=${d2.meta.isPendingEvaluation}, status=${d2.result.status}`)
    const buf2 = await renderReportPdf(d2)
    const out2 = path.join(process.cwd(), `ExamGuard_SUBJ_${d2.reportId}.pdf`)
    fs.writeFileSync(out2, buf2)
    console.log(`Written subjective PDF ${out2} length ${buf2.length}`)
  }

  // Test large timeline: count events
  console.log('\nDone')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
