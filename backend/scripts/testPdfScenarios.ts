import { PrismaClient } from '@prisma/client'
import { buildReportData } from '../src/modules/reportPdf/reportDataBuilder.js'
import { renderReportPdf } from '../src/modules/reportPdf/pdfReportRenderer.js'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

function countPages(buffer: Buffer): number {
  // Count /Type /Page occurrences (excluding /Pages)
  const str = buffer.toString('utf8')
  const matches = str.match(/\/Type\s*\/Page[^s]/g)
  return matches ? matches.length : 1
}

async function testScenario(name: string, sessionId: string) {
  console.log(`\n=== ${name} ===`)
  try {
    const data = await buildReportData(sessionId, { verificationBaseUrl: 'http://localhost:5173' })
    console.log(`ReportId ${data.reportId} version ${data.version}`)
    console.log(`Result ${data.result.status} ${data.result.percentage}% (${data.result.obtained}/${data.result.totalMarks}) correct ${data.result.correct} incorrect ${data.result.incorrect} unanswered ${data.result.unanswered}`)
    console.log(`Integrity ${data.integrity.score} ${data.integrity.levelDisplay} signals ${data.integrity.signals.length} pendingEval=${data.meta.isPendingEvaluation}`)
    console.log(`Questions ${data.questions.length} subjective ${data.subjectiveReviews.length} timeline ${data.timeline.length} teacherReview=${!!data.teacherReview?.comments} clarification=${!!data.clarification?.message}`)
    const buf = await renderReportPdf(data)
    const pages = countPages(buf)
    console.log(`PDF generated: ${buf.length} bytes, approx pages: ${pages}`)
    const out = path.join(process.cwd(), `ExamGuard_SCENARIO_${name.replace(/\s+/g, '_')}_${data.reportId}.pdf`)
    fs.writeFileSync(out, buf)
    console.log(`Saved ${out}`)
    // checks
    if (buf.slice(0, 4).toString() !== '%PDF') throw new Error('Invalid PDF header')
    if (pages < 1) throw new Error('No pages')
    // Check persistent
    const data2 = await buildReportData(sessionId, { verificationBaseUrl: 'http://localhost:5173' })
    if (data.reportId !== data2.reportId) throw new Error('ReportId not persistent!')
    console.log('✓ PASS')
    return { name, pages, length: buf.length, data }
  } catch (e) {
    console.error(`✗ FAIL ${name}:`, e)
    return { name, error: String(e) }
  }
}

async function main() {
  console.log('=== ExamGuard PDF Scenario Tests ===')
  const allSessions = await prisma.examSession.findMany({ include: { student: true, exam: true, integrityReview: { include: { signals: true } } }, orderBy: { submittedAt: 'desc' } })
  console.log(`Total sessions: ${allSessions.length}`)

  // Map by student name for scenarios
  const byStudent = (name: string) => allSessions.find(s => s.student.name.includes(name))
  const sAarav = byStudent('Aarav')
  const sAditya = byStudent('Aditya')
  const sDiya = byStudent('Diya')
  const sAnanya = byStudent('Ananya')
  const sPriya = byStudent('Priya Singh') || allSessions.find(s => s.student.email.includes('priya'))
  // Scenario picks
  const scenarios: Array<[string, string | null]> = []

  if (sAarav) scenarios.push(['Scenario1 Normal Exam (Aarav 27% failed but integrity requires review)', sAarav.id])
  if (sAditya) scenarios.push(['Scenario2 Passed Exam (Aditya)', sAditya.id])
  if (sDiya) scenarios.push(['Scenario3 Failed Exam (Diya 24)', sDiya.id])
  // Find pending subjective: look for session where subjective ungraded
  let pendingSid: string | null = null
  for (const s of allSessions.slice(0, 8)) {
    const d = await buildReportData(s.id)
    if (d.meta.isPendingEvaluation) { pendingSid = s.id; break }
  }
  if (pendingSid) scenarios.push(['Scenario4 Pending Subjective Evaluation', pendingSid])
  else if (sAnanya) scenarios.push(['Scenario4 Pending Subjective Evaluation (fallback)', sAnanya.id])

  // Integrity review required: score 78
  const high = allSessions.find(s => s.integrityReview?.score === 78)
  if (high) scenarios.push(['Scenario5 Integrity Review Required (78)', high.id])
  else if (sAarav) scenarios.push(['Scenario5 Integrity Review Required', sAarav.id])

  // Long subjective answers — create a test session with very long answer
  // We'll modify one session's answers to be long via direct DB update for test, then generate PDF and revert
  let longSid: string | null = null
  if (sAarav) {
    // Create temporary long answer test by updating first subjective answer to long text
    const subj = await prisma.answer.findFirst({ where: { sessionId: sAarav.id }, include: { question: true } })
    if (subj) {
      const q = await prisma.question.findUnique({ where: { id: subj.questionId } })
      if (q && (q.type === 'SHORT' || q.type === 'SHORT_ANSWER' || q.type === 'LONG_ANSWER')) {
        const original = subj.answer
        const longText = `This is a very long subjective answer designed to test PDF wrapping and page break handling. `.repeat(20) + `It includes multiple sentences, detailed explanations, and should wrap naturally within the PDF's content width without overflowing or clipping. `.repeat(10) + `The student discusses the Central Limit Theorem, provides examples, defines terms, and offers nuanced understanding. ` + `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`.repeat(8)
        await prisma.answer.update({ where: { id: subj.id }, data: { answer: longText } })
        scenarios.push(['Scenario6 Long Subjective Answers', sAarav.id])
        longSid = subj.id
        // We'll revert after test
      }
    }
  }

  // Large number of questions — already 30, that's large
  if (sAarav) scenarios.push(['Scenario7 Large Number of Questions (30)', sAarav.id])

  // Long timeline — create session with many events
  let longTimelineSid: string | null = null
  if (sAarav) {
    // Insert 45 additional timeline events
    const existing = await prisma.examEvent.count({ where: { sessionId: sAarav.id } })
    console.log(`\nCreating long timeline: existing ${existing} events, adding 40 more for test...`)
    const toCreate = Array.from({ length: 40 }, (_, i) => ({
      sessionId: sAarav.id,
      eventType: (i % 3 === 0 ? 'TAB_HIDDEN' : i % 3 === 1 ? 'TAB_VISIBLE' : 'ANSWER_CHANGED') as any,
      timestamp: new Date(new Date(sAarav.startedAt).getTime() + (i + 5) * 60000),
      metadata: JSON.stringify({ test: true, idx: i }),
    }))
    await prisma.examEvent.createMany({ data: toCreate })
    scenarios.push(['Scenario8 Long Timeline (50+ events)', sAarav.id])
    longTimelineSid = sAarav.id
  }

  // No integrity signals — create session with no review or empty signals
  // Find session with minimal signals or create new one with no review? Use Diya who has 1 signal but we can test a new bare session
  // Create a fresh session without integrity review for testing
  let noSignalsSid: string | null = null
  try {
    const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } })
    const exam = await prisma.exam.findFirst({ where: { teacherId: teacher!.id } })
    const student = await prisma.user.findFirst({ where: { email: 'sneha.iyer@example.com' } })
    if (exam && student) {
      // Check if we can find a session with 0 signals via integrity review with 0 signals — but our seed always has at least 1. So create artificial session with no integrity review
      const tempSession = await prisma.examSession.create({
        data: {
          examId: exam.id,
          studentId: student.id,
          startedAt: new Date('2026-09-06T09:00:00Z'),
          submittedAt: new Date('2026-09-06T09:45:00Z'),
          status: 'SUBMITTED',
          lastActivityAt: new Date('2026-09-06T09:45:00Z'),
        }
      })
      const questions = await prisma.question.findMany({ where: { examId: exam.id }, take: 5 })
      for (const q of questions) {
        await prisma.answer.create({ data: { sessionId: tempSession.id, questionId: q.id, answer: q.correctAnswer, changeCount: 0, firstAnsweredAt: new Date() } })
      }
      await prisma.examEvent.create({ data: { sessionId: tempSession.id, eventType: 'SESSION_STARTED', timestamp: new Date('2026-09-06T09:00:00Z') } })
      await prisma.examEvent.create({ data: { sessionId: tempSession.id, eventType: 'SESSION_ENDED', timestamp: new Date('2026-09-06T09:45:00Z') } })
      // No integrity review created
      noSignalsSid = tempSession.id
      scenarios.push(['Scenario9 No Integrity Signals', noSignalsSid])
    }
  } catch (e) { console.warn('Could not create no-signals scenario', e) }

  // No teacher review — find pending review with no notes
  const pendingNoNotes = allSessions.find(s => s.integrityReview?.status === 'PENDING' && s.id !== noSignalsSid)
  if (pendingNoNotes) scenarios.push(['Scenario10 No Teacher Review (Pending)', pendingNoNotes.id])
  else if (sAnanya) scenarios.push(['Scenario10 No Teacher Review', sAnanya.id])

  console.log(`\nRunning ${scenarios.length} scenarios...`)
  const results = []
  for (const [name, sid] of scenarios) {
    if (!sid) { console.log(`Skip ${name} — no session`); continue }
    const r = await testScenario(name, sid)
    results.push(r)
  }

  // Cleanup: revert long answer and long timeline inserts and temp session
  if (longSid) {
    // revert answer to original sample
    await prisma.answer.update({ where: { id: longSid }, data: { answer: 'Sample answer for short question' } })
    console.log('\nReverted long answer test data')
  }
  if (longTimelineSid) {
    // delete test events with metadata test:true
    await prisma.examEvent.deleteMany({ where: { sessionId: longTimelineSid, metadata: { contains: '"test":true' } } })
    console.log('Cleaned long timeline test events')
  }
  if (noSignalsSid) {
    await prisma.answer.deleteMany({ where: { sessionId: noSignalsSid } })
    await prisma.examEvent.deleteMany({ where: { sessionId: noSignalsSid } })
    await prisma.examSession.delete({ where: { id: noSignalsSid } })
    await prisma.report.deleteMany({ where: { sessionId: noSignalsSid } })
    console.log('Cleaned no-signals temp session')
  }

  console.log('\n=== SUMMARY ===')
  results.forEach(r => {
    if ((r as any).error) console.log(`✗ ${r.name} FAILED`)
    else console.log(`✓ ${r.name} — pages ${(r as any).pages}, ${(r as any).length} bytes`)
  })
  console.log('\nAll scenario tests finished')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
