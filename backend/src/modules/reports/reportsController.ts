// @ts-nocheck
import { Response, NextFunction } from "express"
import { AuthRequest } from "../../middleware/auth.js"
import { prisma } from "../../utils/prisma.js"
import PDFDocument from "pdfkit"
import { logAudit } from "../audit/auditService.js"
import { buildReportData } from "../reportPdf/reportDataBuilder.js"
import { renderReportPdf } from "../reportPdf/pdfReportRenderer.js"
import { buildPdfFilename } from "../reportPdf/reportService.js"

function generateReportId(sessionId:string){
  const year = new Date().getFullYear()
  let sum=0
  for(let i=0;i<sessionId.length;i++) sum = (sum*31 + sessionId.charCodeAt(i)) % 10000000
  const num = Math.abs(sum) % 1000000
  return `EG-${year}-${String(num).padStart(6,'0')}`
}

export async function generateStudentReport(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessionId = req.params.sessionId || req.params.id
    const session = await prisma.examSession.findUnique({ where:{id: sessionId}, include:{ exam:true }})
    if(!session) return res.status(404).json({ success:false, error:{message:'Session not found'}})
    // Fetch exam teacher for auth
    const exam = await prisma.exam.findUnique({ where:{ id: session.examId }})
    if(!exam) return res.status(404).json({ success:false, error:{message:'Exam not found'}})
    if(session.studentId!==req.user!.id && !(req.user!.role==='TEACHER' && exam.teacherId===req.user!.id)){
      return res.status(403).json({ success:false, error:{code:'FORBIDDEN', message:'Forbidden'}})
    }
    // Use centralized professional renderer
    const verificationBase = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173'
    const data = await buildReportData(sessionId, { verificationBaseUrl: String(verificationBase) })
    const buffer = await renderReportPdf(data)
    const filename = buildPdfFilename({ studentName: data.student.name, examTitle: data.exam.title, reportId: data.reportId })
    res.setHeader('Content-Type','application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', buffer.length)
    res.setHeader('X-Report-Id', data.reportId)
    res.setHeader('X-Report-Version', data.version)
    res.send(buffer)
    await logAudit({ actorId: req.user!.id, actorRole:req.user!.role, action:'REPORT_GENERATED', entityType:'StudentReport', entityId: sessionId, metadata:{ reportId: data.reportId, version: data.version, type:'STUDENT_RESULT' }, ipAddress:req.ip })
  }catch(e){ next(e)}
}

export async function generateIntegrityReport(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const reviewId = req.params.reviewId || req.params.id
    const review = await prisma.integrityReview.findUnique({ where:{id:reviewId}, include:{ session:{include:{student:true, exam:{include:{teacher:true}}, events:true}}, signals:true, notes:{include:{teacher:true}} }})
    if(!review) return res.status(404).json({ success:false, error:{message:'Review not found'}})
    // auth: teacher owns exam or student owns session
    const isTeacher = req.user!.role==='TEACHER' && review.session.exam.teacherId===req.user!.id
    const isStudent = review.session.studentId===req.user!.id
    if(!isTeacher && !isStudent) return res.status(403).json({ success:false, error:{code:'FORBIDDEN', message:'Forbidden'}})
    // Student should not see teacher private notes? For integrity report visible to student, we strip private? Provide limited.
    const reportId = generateReportId(review.sessionId)
    const doc = new PDFDocument({ size:'A4', margin:50, info:{Title:`Integrity Report ${reportId}`, Author:'ExamGuard'}})
    const chunks=[]
    doc.on('data',c=> chunks.push(c))
    const finished = new Promise<Buffer>(resolve=> doc.on('end',()=> resolve(Buffer.concat(chunks))))
    doc.fontSize(10).fillColor('#4338ca').text('EXAMGUARD', {align:'left'})
    doc.fontSize(16).fillColor('#0f172a').text('Integrity Review Report')
    doc.moveDown(0.3)
    doc.fontSize(8).fillColor('#64748b').text(`Report ID: ${reportId}  •  Generated: ${new Date().toLocaleString()}`)
    doc.moveDown(0.5)
    doc.moveTo(50,doc.y).lineTo(545,doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.8)
    doc.fontSize(11).fillColor('#0f172a').text('STUDENT & EXAM SUMMARY')
    doc.moveDown(0.4)
    doc.fontSize(9).fillColor('#334155')
    const sidDisp = `STU-${review.session.student.id.slice(-5).toUpperCase()}`
    doc.text(`Student Name: ${review.session.student.name}`)
    doc.text(`Student ID: ${sidDisp}`)
    doc.text(`Exam: ${review.session.exam.title} (${review.session.exam.subject})`)
    doc.text(`Teacher: ${review.session.exam.teacher.name}`)
    doc.text(`Submitted: ${review.session.submittedAt? new Date(review.session.submittedAt).toLocaleString(): review.generatedAt.toLocaleString()}`)
    doc.moveDown(0.6)
    doc.moveTo(50,doc.y).lineTo(545,doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.8)
    doc.fontSize(11).fillColor('#0f172a').text('INTEGRITY REVIEW SCORE')
    doc.moveDown(0.4)
    doc.fontSize(12).fillColor('#0f172a').text(`${review.score} / 100`)
    const levelMap = { NORMAL:'Normal', LOW_CONCERN:'Low Concern', REQUIRES_REVIEW:'Requires Review', HIGH_PRIORITY_REVIEW:'High Priority Review'}
    doc.fontSize(9).fillColor(review.score>=60?'#d97706':'#059669').text(levelMap[review.level]|| review.level)
    doc.moveDown(0.3)
    doc.fontSize(8).fillColor('#64748b').text('Integrity signals indicate patterns that may require review. They are not proof of misconduct.', {width:495})
    doc.moveDown(0.5)
    doc.fontSize(9).fillColor('#334155').text('Signal Breakdown:')
    for(const s of review.signals){
      const ev = JSON.parse(s.evidence)
      doc.fontSize(8).fillColor('#0f172a').text(`• ${s.type}: ${s.description} (${s.severity}, ${s.points} pts, confidence ${(s.confidence||0.85).toFixed(2)})`)
      doc.fontSize(7).fillColor('#64748b').text(`  Evidence: ${Array.isArray(ev)? ev.join(', '): String(ev)}`)
    }
    doc.moveDown(0.6)
    doc.moveTo(50,doc.y).lineTo(545,doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.8)
    doc.fontSize(11).fillColor('#0f172a').text('EVENT TIMELINE (first 30)')
    doc.moveDown(0.4)
    doc.fontSize(7).fillColor('#334155')
    for(const ev of review.session.events.slice(0,30)){
      const ts = new Date(ev.timestamp).toLocaleString()
      doc.text(`${ts} — ${ev.eventType.replace(/_/g,' ')}`)
    }
    if(review.session.events.length>30) doc.text(`... and ${review.session.events.length-30} more events`)
    doc.moveDown(0.6)
    doc.moveTo(50,doc.y).lineTo(545,doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.8)
    doc.fontSize(11).fillColor('#0f172a').text('TEACHER REVIEW')
    doc.moveDown(0.4)
    doc.fontSize(9).fillColor('#334155')
    if(isTeacher){
      doc.text(`Status: ${review.status}`)
      if(review.assignedReviewerId) doc.text(`Assigned: ${review.assignedReviewerId}`)
      if(review.notes.length>0){
        doc.text(`Notes:`)
        for(const n of review.notes.slice(0,3)){
          doc.fontSize(8).text(`- ${n.teacher.name} (${new Date(n.createdAt).toLocaleDateString()}): ${n.note.slice(0,120)}`)
        }
      } else doc.text('No teacher notes yet.')
    } else {
      doc.text(`Status: ${review.status==='PENDING'? 'Requires Teacher Review': review.status}`)
      doc.fontSize(8).fillColor('#64748b').text('Detailed teacher notes are not visible to students.', {width:495})
    }
    doc.moveDown(1)
    doc.fontSize(7).fillColor('#64748b').text('ExamGuard  •  Integrity Review System • This report is for review purposes only.', {align:'center'})
    doc.text(`Report ID: ${reportId}`, {align:'center'})
    doc.end()
    const buffer = await finished
    res.setHeader('Content-Type','application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="ExamGuard-Integrity-${reportId}.pdf"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
    await logAudit({ actorId: req.user!.id, actorRole:req.user!.role, action:'PDF_DOWNLOADED', entityType:'IntegrityReview', entityId: reviewId, metadata:{ reportId }, ipAddress:req.ip })
  }catch(e){ next(e)}
}

export async function generateExamAnalyticsReport(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const examId = req.params.examId || req.params.id
    if(req.user!.role!=='TEACHER') return res.status(403).json({ success:false, error:{code:'FORBIDDEN', message:'Forbidden'}})
    const exam = await prisma.exam.findUnique({ where:{id:examId}})
    if(!exam) return res.status(404).json({ success:false, error:{message:'Exam not found'}})
    if(exam.teacherId!==req.user!.id) return res.status(403).json({ success:false, error:{code:'FORBIDDEN', message:'Forbidden'}})
    const sessions = await prisma.examSession.findMany({ where:{examId}})
    const questions = await prisma.question.findMany({ where:{examId}})
    const reviews = await prisma.integrityReview.findMany({ where:{session:{examId}}})
    const reportId = generateReportId(examId)
    const doc = new PDFDocument({ size:'A4', margin:50, info:{Title:`Exam Analytics ${reportId}`, Author:'ExamGuard'}})
    const chunks=[]
    doc.on('data',c=> chunks.push(c))
    const finished = new Promise<Buffer>(resolve=> doc.on('end',()=> resolve(Buffer.concat(chunks))))
    doc.fontSize(10).fillColor('#4338ca').text('EXAMGUARD', {align:'left'})
    doc.fontSize(16).fillColor('#0f172a').text('Exam Analytics Report')
    doc.moveDown(0.3)
    doc.fontSize(8).fillColor('#64748b').text(`Report ID: ${reportId}  •  Generated: ${new Date().toLocaleString()}  •  Exam: ${exam.title}`)
    doc.moveDown(0.5)
    doc.moveTo(50,doc.y).lineTo(545,doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.8)
    doc.fontSize(11).fillColor('#0f172a').text('EXAM PERFORMANCE SUMMARY')
    doc.moveDown(0.4)
    doc.fontSize(9).fillColor('#334155')
    doc.text(`Exam: ${exam.title} (${exam.subject})`)
    doc.text(`Status: ${exam.status}`)
    doc.text(`Questions: ${questions.length}`)
    doc.text(`Total Students (sessions): ${sessions.length}`)
    doc.text(`Submitted: ${sessions.filter(s=> s.status==='SUBMITTED').length}`)
    doc.text(`Expired: ${sessions.filter(s=> s.status==='EXPIRED').length}`)
    const avgScore = reviews.length? Math.round(reviews.reduce((s,r)=>s+r.score,0)/reviews.length):0
    doc.text(`Average Integrity Score: ${avgScore}`)
    doc.moveDown(0.6)
    doc.moveTo(50,doc.y).lineTo(545,doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.8)
    doc.fontSize(11).fillColor('#0f172a').text('QUESTION STATISTICS')
    doc.moveDown(0.4)
    doc.fontSize(7).fillColor('#334155')
    for(const q of questions.slice(0,15)){
      const attempts = await prisma.answer.count({ where:{questionId: q.id}})
      doc.text(`Q${q.order} (${q.type} ${q.points}pts): ${q.text.slice(0,70)} ... Attempts: ${attempts}`)
    }
    if(questions.length>15) doc.text(`... and ${questions.length-15} more questions`)
    doc.moveDown(0.6)
    doc.moveTo(50,doc.y).lineTo(545,doc.y).strokeColor('#e2e8f0').stroke()
    doc.moveDown(0.8)
    doc.fontSize(11).fillColor('#0f172a').text('INTEGRITY SUMMARY')
    doc.moveDown(0.4)
    doc.fontSize(8).fillColor('#334155')
    const distro = { NORMAL: reviews.filter(r=> r.level==='NORMAL').length, LOW_CONCERN: reviews.filter(r=> r.level==='LOW_CONCERN').length, REQUIRES_REVIEW: reviews.filter(r=> r.level==='REQUIRES_REVIEW').length, HIGH_PRIORITY_REVIEW: reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW').length }
    doc.text(`Normal: ${distro.NORMAL}, Low Concern: ${distro.LOW_CONCERN}, Requires Review: ${distro.REQUIRES_REVIEW}, High Priority: ${distro.HIGH_PRIORITY_REVIEW}`)
    doc.text(`Reviews Generated: ${reviews.length}`)
    doc.moveDown(1)
    doc.fontSize(7).fillColor('#64748b').text(`Report ID: ${reportId} • ExamGuard Analytics`, {align:'center'})
    doc.end()
    const buffer = await finished
    res.setHeader('Content-Type','application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="ExamGuard-Analytics-${reportId}.pdf"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
    await logAudit({ actorId: req.user!.id, actorRole:req.user!.role, action:'REPORT_GENERATED', entityType:'Exam', entityId: examId, metadata:{ reportId, type:'EXAM_ANALYTICS' }, ipAddress:req.ip })
  }catch(e){ next(e)}
}
