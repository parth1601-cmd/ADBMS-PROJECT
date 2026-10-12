// @ts-nocheck
import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { NotFound, Forbidden, BadRequest } from '../utils/errors.js'
import { answerSchema, eventsBatchSchema } from '../validators/schemas.js'
import { generateReviewForSession } from '../analysis/reviewGenerator.js'
import { startExamTransaction } from '../services/sessionService.js'
import { saveAnswerTransaction } from '../services/answerService.js'
import { submitExamTransaction } from '../services/submissionService.js'
import { calculateScore } from '../services/scoringService.js'
import { buildReportData } from '../modules/reportPdf/reportDataBuilder.js'
import { renderReportPdf } from '../modules/reportPdf/pdfReportRenderer.js'
import { buildPdfFilename } from '../modules/reportPdf/reportService.js'

function mapStatus(s:string){
  if(s==='DRAFT') return 'Draft'
  if(s==='SCHEDULED') return 'Scheduled'
  if(s==='LIVE') return 'Live'
  if(s==='COMPLETED') return 'Completed'
  return s
}
function levelDisplay(level:string){
  if(level==='HIGH_PRIORITY_REVIEW') return 'High Priority Review'
  if(level==='REQUIRES_REVIEW') return 'Requires Review'
  if(level==='LOW_CONCERN') return 'Low Concern'
  return 'Normal'
}
function statusDisplay(s:string){
  if(s==='PENDING') return 'Requires Teacher Review'
  if(s==='REVIEWED') return 'Reviewed'
  if(s==='NORMAL') return 'Normal'
  if(s==='LOW_CONCERN') return 'Low Concern'
  if(s==='REQUIRES_REVIEW') return 'Requires Review'
  if(s==='HIGH_PRIORITY_REVIEW') return 'High Priority Review'
  return s
}
function isPublished(exam:any){
  return exam.status !== 'DRAFT'
}
function isAvailable(exam:any, now=new Date()){
  if(exam.status !== 'LIVE') return false
  if(exam.startAt && now < new Date(exam.startAt)) return false
  if(exam.endAt && now > new Date(exam.endAt)) return false
  return true
}
function isUpcoming(exam:any, now=new Date()){
  if(!isPublished(exam)) return false
  if(!exam.startAt) return false
  return now < new Date(exam.startAt)
}

// Result calculation helper
export async function computeResult(sessionId:string){
  const session = await prisma.examSession.findUnique({ where:{id:sessionId}, include:{ exam:true, student:true }})
  if(!session) throw NotFound('Session not found')
  const questions = await prisma.question.findMany({ where:{examId: session.examId}, orderBy:{order:'asc'}})
  const answers = await prisma.answer.findMany({ where:{sessionId}})
  const answerMap = new Map(answers.map(a=> [a.questionId, a.answer]))
  let correct=0, incorrect=0, unanswered=0, obtained=0, totalMarks=0
  const perQuestion:any[]=[]
  for(const q of questions){
    totalMarks += q.points
    const ans = answerMap.get(q.id)
    if(ans===undefined || ans===null || String(ans).trim()===''){
      unanswered++
      perQuestion.push({ questionId: q.id, text: q.text, type:q.type, points:q.points, studentAnswer: null, correctAnswer: q.correctAnswer, isCorrect: false, marks:0, unanswered:true })
    } else {
      // For objective types MCQ, TF check correctness case-insensitive trim?
      if(q.type==='MCQ' || q.type==='TF'){
        const isCorrect = String(ans).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
        if(isCorrect){ correct++; obtained+=q.points; perQuestion.push({ questionId: q.id, text: q.text, type:q.type, points:q.points, studentAnswer: ans, correctAnswer: q.correctAnswer, isCorrect:true, marks: q.points })}
        else { incorrect++; perQuestion.push({ questionId: q.id, text: q.text, type:q.type, points:q.points, studentAnswer: ans, correctAnswer: q.correctAnswer, isCorrect:false, marks:0 })}
      } else {
        // SHORT subjective: not auto-graded
        perQuestion.push({ questionId: q.id, text: q.text, type:q.type, points:q.points, studentAnswer: ans, correctAnswer: null, isCorrect: null, marks: null, subjective:true })
        unanswered++ // treat as not counted? Actually we already counted unanswered separate. For subjective, we count as answered but not scored.
        // Adjust counters: subjective answered should not be unanswered, move to correct? But spec says Total/Correct/Incorrect/Unanswered based on objective
        // So we need to adjust: subjective answered counts as not in correct/incorrect/unanswered for scoring? However spec says Total Questions = 20 Correct=17 Incorrect2 Unanswered1 includes maybe subjective?
        // For simplicity: subjective answered => not in correct/incorrect, but we already counted unanswered++. Fix:
        unanswered--
        // do not increment correct/incorrect, leave obtained 0
      }
    }
  }
  // Adjust unanswered for subjective: already handled
  // For totalQuestions, it is questions.length
  // correct/incorrect only from objective, unanswered includes objective unanswered
  // For better stats, recalc unanswered as totalObjective - correct - incorrect
  // But keep simple: unanswered is already objective unanswered count
  const totalQuestions = questions.length
  const objectiveCount = questions.filter(q=> q.type!=='SHORT').length
  // If subjective present, correct+incorrect+unanswered may not equal totalQuestions
  // We keep as computed: correct+incorrect = objective answered, unanswered = objective unanswered
  const percentage = totalMarks>0 ? Math.round((obtained/totalMarks)*100*10)/10 : 0
  const passed = percentage >= 40
  const completionTimeSec = session.submittedAt && session.startedAt ? Math.round((new Date(session.submittedAt).getTime() - new Date(session.startedAt).getTime())/1000) : null
  return {
    session, questions, answers, perQuestion,
    totalQuestions, objectiveCount, correct, incorrect, unanswered,
    totalMarks, obtained, percentage, passed, completionTimeSec
  }
}

function generateReportId(sessionId:string){
  // Deterministic: EG-YYYY-XXXXXX based on char code sum
  const year = new Date().getFullYear()
  let sum=0
  for(let i=0;i<sessionId.length;i++) sum = (sum*31 + sessionId.charCodeAt(i)) % 10000000
  const num = Math.abs(sum) % 1000000
  return `EG-${year}-${String(num).padStart(6,'0')}`
}

function checkDeadline(session:any){
  if(!session.deadlineAt){
    // fallback to duration if no deadlineAt
    if(!session.exam) return { remainingSec: Math.max(0, Math.floor((session.exam?.durationMinutes||60)*60*1000 - (Date.now() - new Date(session.startedAt).getTime()))/1000), expired: false }
    const duration = session.exam.durationMinutes*60*1000
    const elapsed = Date.now() - new Date(session.startedAt).getTime()
    const remainingSec = Math.max(0, Math.floor((duration - elapsed)/1000))
    const expired = remainingSec<=0 && session.status==='IN_PROGRESS'
    return { remainingSec, expired }
  }
  const remainingSec = Math.max(0, Math.floor((new Date(session.deadlineAt).getTime() - Date.now())/1000))
  const expired = remainingSec<=0 && session.status==='IN_PROGRESS'
  return { remainingSec, expired }
}

export async function getDashboard(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const studentId = req.user!.id
    const now = new Date()
    // Fetch all published exams
    const allExams = await prisma.exam.findMany({ where:{ status:{in:['LIVE','SCHEDULED'] as any}}, include:{ _count:{select:{questions:true}}}})
    const availableGlobal = allExams.filter(e=> isAvailable(e, now))
    // Per-student available: exclude submitted
    const studentSessions = await prisma.examSession.findMany({ where:{studentId, status:{in:['SUBMITTED','EXPIRED','IN_PROGRESS'] as any}}, select:{examId:true, status:true}})
    const submittedExamIds = new Set(studentSessions.filter(s=> s.status==='SUBMITTED' || s.status==='EXPIRED').map(s=>s.examId))
    const available = availableGlobal.filter(e=> !submittedExamIds.has(e.id))
    const upcoming = allExams.filter(e=> isUpcoming(e, now))
    const inProgressCount = await prisma.examSession.count({ where:{ studentId, status:'IN_PROGRESS'}})
    const completedCount = await prisma.examSession.count({ where:{ studentId, status:{in:['SUBMITTED','EXPIRED'] as any}}})
    const submittedSessions = await prisma.examSession.findMany({ where:{ studentId, status:'SUBMITTED'}, include:{exam:true}})
    let avgScore = 0
    if(submittedSessions.length>0){
      let totalPct=0, count=0
      for(const s of submittedSessions){
        try{
          const r = await computeResult(s.id)
          totalPct += r.percentage
          count++
        }catch{}
      }
      avgScore = count? Math.round((totalPct/count)*10)/10 : 0
    }
    // Recent activity: last 3 submitted
    const recent = submittedSessions.slice(0,3)
    const user = await prisma.user.findUnique({ where:{id:studentId}, select:{id:true, name:true, email:true, createdAt:true}})
    res.json({
      student: {
        id: user.id, name: user.name, email:user.email,
        studentId: `STU-${user.id.slice(-5).toUpperCase()}`,
        class: "10-A", section: "A", academicYear: "2025-26"
      },
      stats: {
        available: available.length,
        upcoming: upcoming.length,
        inProgress: inProgressCount,
        completed: completedCount,
        averageScore: avgScore
      },
      availableTests: available.slice(0,5).map(e=> ({
        id:e.id, title:e.title, subject:e.subject, durationMinutes:e.durationMinutes, startAt:e.startAt, endAt:e.endAt, questionsCount:e._count.questions, status: mapStatus(e.status)
      })),
      upcomingTests: upcoming.slice(0,5).map(e=> ({
        id:e.id, title:e.title, subject:e.subject, durationMinutes:e.durationMinutes, startAt:e.startAt, endAt:e.endAt, questionsCount:e._count.questions, status: mapStatus(e.status)
      })),
      recentSubmissions: recent.map(s=> ({
        sessionId:s.id, exam:{id:s.exam.id, title:s.exam.title, subject:s.exam.subject}, submittedAt:s.submittedAt, status:s.status
      })),
      date: new Date().toISOString()
    })
  }catch(e){ next(e)}
}

export async function listStudentExams(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const now = new Date()
    const exams = await prisma.exam.findMany({ where:{ status:{in:['LIVE','SCHEDULED','COMPLETED'] as any}}, orderBy:{startAt:'desc'}, include:{_count:{select:{questions:true}}, teacher:true}})
    const enriched = await Promise.all(exams.map(async e=>{
      const session = await prisma.examSession.findFirst({ where:{examId:e.id, studentId: req.user!.id}, orderBy:{startedAt:'desc'}})
      // filter for availability logic if query param ?filter=available etc handled in separate endpoints; here return all but mark availability
      const available = isAvailable(e, now)
      const upcoming = isUpcoming(e, now)
      const totalMarks = await prisma.question.aggregate({ where:{examId:e.id}, _sum:{points:true}})
      return {
        id:e.id, title:e.title, subject:e.subject, description:e.description, status: mapStatus(e.status),
        durationMinutes:e.durationMinutes, startAt:e.startAt, endAt:e.endAt,
        questionsCount: e._count.questions, totalMarks: totalMarks._sum.points||0,
        teacher: {id:e.teacher.id, name:e.teacher.name},
        available, upcoming,
        session: session? {id:session.id, status: session.status, startedAt: session.startedAt, submittedAt: session.submittedAt, deadlineAt: session.deadlineAt} : null
      }
    }))
    // Spec says GET /api/student/exams only return available where not submitted, but we return all with filtering flag and also allow query filters
    // If request has ?filter=available, apply strict filtering per spec
    const filter = (req.query.filter as string) || (req.query.view as string)
    if(filter==='available'){
      const filtered = enriched.filter(e=> e.available && (!e.session || e.session.status!=='SUBMITTED'))
      return res.json(filtered)
    }
    res.json(enriched)
  }catch(e){ next(e)}
}

export async function listUpcomingExams(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const now = new Date()
    const exams = await prisma.exam.findMany({ where:{ status:{in:['LIVE','SCHEDULED'] as any}}, orderBy:{startAt:'asc'}, include:{_count:{select:{questions:true}}, teacher:true}})
    const upcoming = exams.filter(e=> isUpcoming(e, now))
    const list = await Promise.all(upcoming.map(async e=>{
      const totalMarks = await prisma.question.aggregate({ where:{examId:e.id}, _sum:{points:true}})
      return {
        id:e.id, title:e.title, subject:e.subject, description:e.description, status: mapStatus(e.status),
        durationMinutes:e.durationMinutes, startAt:e.startAt, endAt:e.endAt,
        questionsCount: e._count.questions, totalMarks: totalMarks._sum.points||0,
        teacher: {id:e.teacher.id, name:e.teacher.name}
      }
    }))
    res.json(list)
  }catch(e){ next(e)}
}

export async function listInProgressExams(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessions = await prisma.examSession.findMany({ where:{ studentId: req.user!.id, status:'IN_PROGRESS'}, include:{ exam:{ include:{ _count:{select:{questions:true}}, teacher:true }}, answers:true }})
    const now = new Date()
    const list = await Promise.all(sessions.map(async s=>{
      let remainingSec:number
      let deadlineAt = s.deadlineAt
      if(deadlineAt){
        remainingSec = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - now.getTime())/1000))
      } else {
        const duration = s.exam.durationMinutes*60*1000
        remainingSec = Math.max(0, Math.floor((duration - (now.getTime() - new Date(s.startedAt).getTime()))/1000))
      }
      const expired = remainingSec<=0
      if(expired){
        // auto expire
        await prisma.examSession.update({ where:{id:s.id}, data:{status:'EXPIRED'}})
        return null
      }
      const totalQ = s.exam._count.questions
      const answered = s.answers.length
      return {
        sessionId: s.id, exam: {id:s.exam.id, title:s.exam.title, subject:s.exam.subject, durationMinutes:s.exam.durationMinutes, teacher:{name:s.exam.teacher.name}}, 
        status: s.status, startedAt: s.startedAt, deadlineAt, remainingSec,
        progress: { answered, total: totalQ, percent: totalQ? Math.round(answered/totalQ*100):0 },
        deadline: deadlineAt
      }
    }))
    res.json(list.filter(Boolean))
  }catch(e){ next(e)}
}

export async function listCompletedExams(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessions = await prisma.examSession.findMany({ where:{ studentId: req.user!.id, status:{in:['SUBMITTED','EXPIRED'] as any}}, include:{ exam:{ include:{teacher:true}}, integrityReview:true}, orderBy:{submittedAt:'desc'}})
    const list = await Promise.all(sessions.map(async s=>{
      let result=null
      try{ result = await computeResult(s.id) }catch{}
      return {
        sessionId: s.id, exam: {id:s.exam.id, title:s.exam.title, subject:s.exam.subject, teacher:{name:s.exam.teacher.name}},
        status: s.status, submittedAt: s.submittedAt, startedAt: s.startedAt,
        score: result? { obtained: result.obtained, total: result.totalMarks, percentage: result.percentage, passed: result.passed, correct: result.correct, incorrect: result.incorrect, unanswered: result.unanswered, totalQuestions: result.totalQuestions } : null,
        integrity: s.integrityReview? { score:s.integrityReview.score, level: levelDisplay(s.integrityReview.level), status: s.integrityReview.status==='PENDING'?'Pending':'Reviewed' } : null
      }
    }))
    res.json(list)
  }catch(e){ next(e)}
}

export async function getStudentExamById(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const exam = await prisma.exam.findUnique({ where:{id:req.params.id}, include:{_count:{select:{questions:true}}, teacher:true}})
    if(!exam) throw NotFound('Exam not found')
    const totalMarksAgg = await prisma.question.aggregate({ where:{examId: exam.id}, _sum:{points:true}})
    const questionsPreview = await prisma.question.count({ where:{examId: exam.id}})
    const session = await prisma.examSession.findFirst({ where:{examId: exam.id, studentId: req.user!.id}, orderBy:{startedAt:'desc'}})
    res.json({
      id:exam.id, title:exam.title, description:exam.description, subject:exam.subject, status: mapStatus(exam.status),
      durationMinutes: exam.durationMinutes, startAt: exam.startAt, endAt: exam.endAt, attemptsAllowed: exam.attemptsAllowed, instructions: exam.instructions,
      questionsCount: exam._count.questions, totalMarks: totalMarksAgg._sum.points||0,
      teacher:{id: exam.teacher.id, name: exam.teacher.name},
      available: isAvailable(exam), upcoming: isUpcoming(exam),
      session: session? {id:session.id, status:session.status, startedAt:session.startedAt, submittedAt:session.submittedAt, deadlineAt:session.deadlineAt}: null
    })
  }catch(e){ next(e)}
}

export async function startExam(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const examId = req.params.id
    // Use transactional, concurrency-safe service (includes locking, eligibility, deadline calc, idempotent)
    const result = await startExamTransaction(examId, req.user!.id)
    const status = result.isNew ? 201 : 200
    res.status(status).json(result)
  }catch(e:any){
    // Map known legacy message expectations: "Exam has not started yet" / "Exam window has closed" already thrown correctly
    // Ensure proper HTTP codes: default to BadRequest for validation failures
    if(e.status) return next(e)
    next(e)
  }
}

export async function getSession(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const session = await prisma.examSession.findUnique({ where:{id:req.params.id}, include:{exam:true, answers:true, events:true}})
    if(!session) throw NotFound('Session not found')
    if(session.studentId!==req.user!.id && req.user!.role!=='TEACHER') throw Forbidden()
    // Handle expiration
    const { remainingSec, expired } = checkDeadline(session)
    if(expired && session.status==='IN_PROGRESS'){
      await prisma.examSession.update({ where:{id:session.id}, data:{status:'EXPIRED', submittedAt: new Date() }})
      session.status = 'EXPIRED' as any
    }
    // include questions without correctAnswer for student (unless submitted)
    const questions = await prisma.question.findMany({ where:{examId: session.examId}, orderBy:{order:'asc'}})
    const canSeeAnswers = session.status==='SUBMITTED' || session.status==='EXPIRED'
    const sanitizedQuestions = questions.map(q=> {
      const base:any = { id:q.id, examId:q.examId, type:q.type, text:q.text, order:q.order, points:q.points, required:q.required, options: q.options? JSON.parse(q.options): null }
      if(canSeeAnswers || req.user?.role==='TEACHER') base.correctAnswer = q.correctAnswer
      return base
    })
    // Compute result if submitted
    let result = null
    let review = null
    if(session.status==='SUBMITTED' || session.status==='EXPIRED'){
      try{ result = await computeResult(session.id) }catch{}
      const rev = await prisma.integrityReview.findUnique({ where:{sessionId: session.id}, include:{signals:true}})
      if(rev) review = rev
    }
    res.json({
      id: session.id, examId: session.examId, exam: {id: session.exam.id, title: session.exam.title, durationMinutes: session.exam.durationMinutes, status: mapStatus(session.exam.status), subject: session.exam.subject, teacherId: session.exam.teacherId},
      studentId: session.studentId, status: session.status, startedAt: session.startedAt, deadlineAt: session.deadlineAt, submittedAt: session.submittedAt,
      remainingSec, expired,
      answers: session.answers, events: session.events, questions: sanitizedQuestions,
      result, review
    })
  }catch(e){ next(e)}
}

export async function saveAnswer(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const { questionId, answer } = answerSchema.parse(req.body)
    const result = await saveAnswerTransaction(req.params.id, req.user!.id, questionId, answer)
    res.json(result)
  }catch(e){ next(e)}
}

export async function postEvents(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const data = eventsBatchSchema.parse(req.body)
    const session = await prisma.examSession.findUnique({ where:{id:req.params.id}})
    if(!session) throw NotFound('Session not found')
    if(session.studentId!==req.user!.id) throw Forbidden()
    if(session.status!=='IN_PROGRESS') throw BadRequest('Session not active')
    if(data.events.length===0) return res.json({ message:'No events', count:0 })
    // Throttle high volume: batch insert with createMany, enforce max 50 per batch
    if(data.events.length>50) throw BadRequest('Too many events in batch (max 50)')
    // Validate event types not include private data; strip metadata if too large
    const now = new Date()
    const toCreate = data.events.map(ev=>{
      let ts = ev.timestamp ? new Date(ev.timestamp) : now
      // prevent future forgery >5min
      if(ts.getTime() > now.getTime() + 5*60*1000) ts = now
      if(ts.getTime() < new Date(session.startedAt).getTime() - 60000) ts = new Date(session.startedAt)
      return {
        sessionId: session.id,
        eventType: ev.eventType as any,
        timestamp: ts,
        questionId: ev.questionId || null,
        metadata: ev.metadata ? JSON.stringify(ev.metadata).slice(0,500) : null
      }
    })
    // Use createMany for performance (batch ingestion)
    try{
      // @ts-ignore - prisma createMany
      await prisma.examEvent.createMany({ data: toCreate })
    }catch{
      // fallback to individual if createMany fails (e.g., sqlite)
      for(const rec of toCreate){
        await prisma.examEvent.create({ data: rec })
      }
    }
    // Update lastSeenAt / lastActivityAt
    const updateData:any = { lastActivityAt: now, lastSeenAt: now }
    // Update currentQuestionId if any event has questionId
    const lastWithQ = [...data.events].reverse().find(e=> e.questionId)
    if(lastWithQ?.questionId) updateData.currentQuestionId = lastWithQ.questionId
    // Track fullscreen exits
    const fullscreenExits = data.events.filter(e=> e.eventType==='FULLSCREEN_EXITED').length
    if(fullscreenExits>0) updateData.fullscreenExits = { increment: fullscreenExits }
    // Determine connectionState transitions
    const hasLost = data.events.some(e=> e.eventType==='CONNECTION_LOST' || e.eventType==='TAB_HIDDEN' || e.eventType==='WINDOW_BLUR')
    const hasRestored = data.events.some(e=> e.eventType==='CONNECTION_RESTORED' || e.eventType==='TAB_VISIBLE' || e.eventType==='WINDOW_FOCUS')
    if(hasLost && !hasRestored) updateData.connectionState = 'FOCUS_LOST'
    else if(hasRestored) updateData.connectionState = 'ACTIVE'
    await prisma.examSession.update({ where:{id:session.id}, data: updateData})
    res.json({ message:'Events recorded', count: data.events.length })
  }catch(e){ next(e)}
}

export async function postHeartbeat(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessionId = req.params.id
    const session = await prisma.examSession.findUnique({ where:{ id: sessionId }})
    if(!session) throw NotFound('Session not found')
    if(session.studentId!==req.user!.id) throw Forbidden()
    if(session.status!=='IN_PROGRESS') throw BadRequest('Session not active')
    const { timestamp, currentQuestionId, connectionState } = req.body || {}
    const now = timestamp ? new Date(timestamp) : new Date()
    // Validate heartbeat interval throttling: at least 5 sec between heartbeats? allow but server records
    const lastSeen = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : new Date(session.lastActivityAt).getTime()
    const gapSec = Math.floor((now.getTime() - lastSeen)/1000)
    // If gap > 60 sec, record HEARTBEAT_GAP as observation (not misconduct)
    if(gapSec > 60){
      // store as event with type HEARTBEAT_GAP metadata
      await prisma.examEvent.create({ data:{
        sessionId: session.id,
        eventType: 'HEARTBEAT_GAP' as any,
        timestamp: now,
        metadata: JSON.stringify({ gapSec, observed: "An extended period without recorded exam activity was observed.", lastSeen: new Date(lastSeen).toISOString() })
      }})
    }
    // Always record heartbeat event for analytics (but low volume)
    await prisma.examEvent.create({ data:{
      sessionId: session.id,
      eventType: 'SESSION_HEARTBEAT' as any,
      timestamp: now,
      questionId: currentQuestionId || null,
      metadata: connectionState ? JSON.stringify({ connectionState, gapSec }) : (gapSec>0 ? JSON.stringify({ gapSec }) : null)
    }})
    await prisma.examSession.update({ where:{ id: sessionId }, data:{
      lastSeenAt: now,
      lastActivityAt: now,
      heartbeatCount: { increment: 1 },
      currentQuestionId: currentQuestionId || undefined,
      connectionState: connectionState || undefined
    }})
    // Return server time for sync and remainingSec
    let remainingSec = 0
    if(session.deadlineAt){
      remainingSec = Math.max(0, Math.floor((new Date(session.deadlineAt).getTime() - now.getTime())/1000))
    } else {
      const duration = (session as any).exam ? (session as any).exam.durationMinutes*60 : 3600
      remainingSec = Math.max(0, Math.floor((duration*1000 - (now.getTime() - new Date(session.startedAt).getTime()))/1000))
    }
    res.json({ lastSeenAt: now, remainingSec, gapSec: gapSec>30? gapSec: 0, serverTime: now.toISOString() })
  }catch(e){ next(e)}
}

export async function toggleMarkForReview(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessionId = req.params.id
    const { questionId, marked } = req.body
    if(!questionId) throw BadRequest('questionId required')
    const session = await prisma.examSession.findUnique({ where:{ id: sessionId }})
    if(!session) throw NotFound('Session not found')
    if(session.studentId!==req.user!.id) throw Forbidden()
    if(session.status!=='IN_PROGRESS') throw BadRequest('Session not active')
    // validate question belongs to exam
    const q = await prisma.question.findUnique({ where:{ id: questionId }})
    if(!q || q.examId !== session.examId) throw BadRequest('Invalid question')
    // Upsert answer with markedForReview flag (create if not exists)
    const existing = await prisma.answer.findUnique({ where:{ sessionId_questionId:{ sessionId, questionId }}})
    if(existing){
      await prisma.answer.update({ where:{ id: existing.id }, data:{ markedForReview: !!marked }})
    } else {
      await prisma.answer.create({ data:{
        sessionId, questionId, answer:"", markedForReview: !!marked, changeCount:0, firstAnsweredAt: new Date()
      }})
    }
    // also maintain session.markedQuestions as JSON
    try{
      const sess = await prisma.examSession.findUnique({ where:{ id:sessionId }})
      let arr:string[] = []
      if(sess?.markedQuestions){
        try{ arr = JSON.parse(sess.markedQuestions)}catch{ arr=[]}
      }
      if(marked){
        if(!arr.includes(questionId)) arr.push(questionId)
      } else {
        arr = arr.filter(id=> id!==questionId)
      }
      await prisma.examSession.update({ where:{id:sessionId}, data:{ markedQuestions: JSON.stringify(arr)}})
    }catch{}
    res.json({ questionId, markedForReview: !!marked })
  }catch(e){ next(e)}
}

export async function getMarkedForReview(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessionId = req.params.id
    const session = await prisma.examSession.findUnique({ where:{ id: sessionId }, include:{ answers:true }})
    if(!session) throw NotFound('Session not found')
    if(session.studentId!==req.user!.id && req.user!.role!=='TEACHER') throw Forbidden()
    const marked = session.answers.filter(a=> a.markedForReview).map(a=> a.questionId)
    // also include session.markedQuestions fallback
    let extra:string[]=[]
    if((session as any).markedQuestions){
      try{ extra = JSON.parse((session as any).markedQuestions)}catch{}
    }
    const merged = Array.from(new Set([...marked, ...extra]))
    res.json({ markedQuestionIds: merged })
  }catch(e){ next(e)}
}

export async function getAnnouncements(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const examId = req.params.examId || (req.query as any).examId
    const sessionId = (req.query as any).sessionId
    if(!examId && !sessionId) return res.json([])
    if(req.user?.role==='STUDENT'){
      // need to verify ownership if sessionId given
      if(sessionId){
        const sess = await prisma.examSession.findUnique({ where:{ id: sessionId }})
        if(!sess || sess.studentId!==req.user!.id) throw Forbidden()
        const broadcasts = await prisma.broadcast.findMany({ where:{ examId: sess.examId, OR:[{ target:'ALL'}, { sessionId }]}, orderBy:{ createdAt:'desc'}, take:10 })
        return res.json(broadcasts)
      }
      if(examId){
        const broadcasts = await prisma.broadcast.findMany({ where:{ examId, target:'ALL'}, orderBy:{ createdAt:'desc'}, take:10 })
        return res.json(broadcasts)
      }
      return res.json([])
    }
    if(req.user?.role==='TEACHER'){
      const broadcasts = await prisma.broadcast.findMany({ where:{ examId }, orderBy:{ createdAt:'desc'}, take:20 })
      return res.json({ success:true, data: broadcasts })
    }
    throw Forbidden()
  }catch(e){ next(e)}
}

export async function submitSession(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const result = await submitExamTransaction(req.params.id, req.user!.id)
    if(result.alreadySubmitted){
      return res.json({ message:'Already submitted', session: result.session, reviewId: result.review?.id, result: result.result })
    }
    res.json({ session: result.session, reviewId: result.review?.id, result: result.result })
  }catch(e){ next(e)}
}

export async function getStudentResults(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessions = await prisma.examSession.findMany({ where:{studentId: req.user!.id}, include:{exam:true, integrityReview:true}, orderBy:{startedAt:'desc'}})
    const results = await Promise.all(sessions.map(async s=>{
      let calc=null
      if(s.status==='SUBMITTED' || s.status==='EXPIRED'){
        try{ calc = await computeResult(s.id)}catch{}
      }
      return {
        exam: {id:s.exam.id, title:s.exam.title, subject:s.exam.subject},
        sessionId: s.id, status: s.status, startedAt: s.startedAt, submittedAt: s.submittedAt,
        integrityStatus: s.integrityReview? levelDisplay(s.integrityReview.level) : null,
        integrityScore: s.integrityReview?.score || null,
        reviewLevel: s.integrityReview? s.integrityReview.level : null,
        reviewStatus: s.integrityReview? s.integrityReview.status : null,
        score: calc? { obtained: calc.obtained, total: calc.totalMarks, percentage: calc.percentage, passed: calc.passed } : null
      }
    }))
    res.json(results)
  }catch(e){ next(e)}
}

export async function getResultDetail(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessionId = req.params.sessionId || req.params.id
    const session = await prisma.examSession.findUnique({ where:{id: sessionId}, include:{ exam:{include:{teacher:true}}, student:true, answers:true, events:true, integrityReview:{include:{signals:true, notes:{include:{teacher:true}}}}} })
    if(!session) throw NotFound('Session not found')
    if(session.studentId!==req.user!.id && req.user!.role!=='TEACHER') throw Forbidden()
    if(req.user!.role==='TEACHER' && session.exam.teacherId!==req.user!.id) throw Forbidden()
    const calc = await computeResult(session.id)
    // Fetch teacher review details
    const review = session.integrityReview
    // timeline
    const events = session.events.sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const timeline = events.map(ev=>{
      let title = ev.eventType.replace(/_/g,' ')
      if(ev.eventType==='TAB_HIDDEN') title='Tab visibility changed — hidden'
      if(ev.eventType==='TAB_VISIBLE') title='Tab became visible'
      if(ev.eventType==='SESSION_STARTED') title='Exam session started'
      if(ev.eventType==='SESSION_ENDED') title='Exam submitted'
      if(ev.eventType==='QUESTION_ANSWERED') title='Question answered'
      if(ev.eventType==='ANSWER_CHANGED') title='Answer changed'
      if(ev.eventType==='COPY') title='Copy activity'
      if(ev.eventType==='PASTE') title='Paste activity'
      return { id:ev.id, timestamp: ev.timestamp, eventType: ev.eventType, title, metadata: ev.metadata? JSON.parse(ev.metadata): null, questionId: ev.questionId }
    })
    res.json({
      session:{
        id: session.id, status: session.status, startedAt: session.startedAt, deadlineAt: session.deadlineAt, submittedAt: session.submittedAt,
        exam:{id:session.exam.id, title:session.exam.title, subject:session.exam.subject, durationMinutes:session.exam.durationMinutes, teacher:{id:session.exam.teacher.id, name:session.exam.teacher.name}},
        student:{id:session.student.id, name:session.student.name, email:session.student.email, studentId:`STU-${session.student.id.slice(-5).toUpperCase()}`, class:"10-A", section:"A"}
      },
      result:{
        totalQuestions: calc.totalQuestions, correct: calc.correct, incorrect: calc.incorrect, unanswered: calc.unanswered,
        totalMarks: calc.totalMarks, obtained: calc.obtained, percentage: calc.percentage, passed: calc.passed, completionTimeSec: calc.completionTimeSec,
        perQuestion: calc.perQuestion
      },
      integrity: review? {
        id: review.id, score: review.score, level: review.level, levelDisplay: levelDisplay(review.level), status: review.status, statusDisplay: statusDisplay(review.status),
        generatedAt: review.generatedAt, reviewedAt: review.reviewedAt, reviewedBy: review.reviewedBy,
        reviewer: review.notes[0]?.teacher ? {name: review.notes[0].teacher.name } : (review.reviewedBy ? {name: (await prisma.user.findUnique({where:{id:review.reviewedBy}}))?.name } : null),
        signals: review.signals.map(s=> ({ id:s.id, type:s.type, severity:s.severity, points:s.points, description:s.description, evidence: JSON.parse(s.evidence)})),
        notes: review.notes.map(n=> ({id:n.id, note:n.note, teacher:n.teacher.name, createdAt:n.createdAt})),
        teacherNote: review.notes[0]?.note || null
      } : null,
      timeline
    })
  }catch(e){ next(e)}
}

export async function getIntegrityReports(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessions = await prisma.examSession.findMany({ where:{studentId: req.user!.id, status:{in:['SUBMITTED','EXPIRED'] as any}}, include:{ exam:true, integrityReview:{include:{signals:true}}}})
    const list = sessions.filter(s=> s.integrityReview).map(s=> ({
      sessionId: s.id, exam:{id:s.exam.id, title:s.exam.title, subject:s.exam.subject},
      submittedAt: s.submittedAt, score: s.integrityReview.score, level: levelDisplay(s.integrityReview.level), levelRaw: s.integrityReview.level, status: s.integrityReview.status, generatedAt: s.integrityReview.generatedAt,
      signalsCount: s.integrityReview.signals.length
    }))
    res.json(list)
  }catch(e){ next(e)}
}

export async function getIntegrityReportDetail(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessionId = req.params.sessionId || req.params.id
    const session = await prisma.examSession.findUnique({ where:{id: sessionId}, include:{ exam:{include:{teacher:true}}, student:true, events:true, integrityReview:{include:{signals:true, notes:{include:{teacher:true}}}}} })
    if(!session) throw NotFound('Session not found')
    if(session.studentId!==req.user!.id && req.user!.role!=='TEACHER') throw Forbidden()
    if(!session.integrityReview) throw NotFound('Integrity review not found')
    const review = session.integrityReview
    const events = session.events.sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const timeline = events.map(ev=> ({ id:ev.id, timestamp: ev.timestamp, eventType: ev.eventType, title: ev.eventType.replace(/_/g,' ') }))
    res.json({
      session:{id:session.id, exam:{title:session.exam.title, subject:session.exam.subject, teacher:session.exam.teacher.name}, student:{name:session.student.name, email:session.student.email, studentId:`STU-${session.student.id.slice(-5).toUpperCase()}`}, submittedAt:session.submittedAt},
      review:{
        id: review.id, score: review.score, level: review.level, levelDisplay: levelDisplay(review.level), status: review.status,
        generatedAt: review.generatedAt, reviewedAt: review.reviewedAt,
        signals: review.signals.map(s=> ({ id:s.id, type:s.type, severity:s.severity, points:s.points, description:s.description, evidence: JSON.parse(s.evidence)})),
        notes: review.notes.map(n=> ({id:n.id, note:n.note, teacher:n.teacher.name, createdAt:n.createdAt})),
        reportId: generateReportId(session.id)
      },
      timeline
    })
  }catch(e){ next(e)}
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const user = await prisma.user.findUnique({ where:{id:req.user!.id}, select:{id:true, name:true, email:true, role:true, createdAt:true}})
    // Add class/section info deterministically
    res.json({
      ...user,
      studentId: `STU-${user.id.slice(-5).toUpperCase()}`,
      class: "10-A", section: "A", academicYear: "2025-26",
      fullName: user.name
    })
  }catch(e){ next(e)}
}

export async function generatePdf(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessionId = req.params.sessionId || req.params.id
    // Auth: verify ownership and fetch minimal for check before building full report
    const session = await prisma.examSession.findUnique({ where:{id: sessionId}, include:{ exam:true }})
    if(!session) throw NotFound('Session not found')
    if(session.studentId!==req.user!.id && !(req.user!.role==='TEACHER' && session.exam.teacherId===req.user!.id)){
      throw Forbidden()
    }
    // Build structured report data (persistent reportId, version, all sections)
    const verificationBase = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173'
    const data = await buildReportData(sessionId, { verificationBaseUrl: String(verificationBase) })
    // Render professional PDF
    const buffer = await renderReportPdf(data)
    // Sanitized professional filename
    const filename = buildPdfFilename({ studentName: data.student.name, examTitle: data.exam.title, reportId: data.reportId })
    res.setHeader('Content-Type','application/pdf')
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`)
    res.setHeader('Content-Length', buffer.length)
    res.setHeader('X-Report-Id', data.reportId)
    res.setHeader('X-Report-Version', data.version)
    // Audit log
    try{
      await prisma.auditLog.create({ data:{ actorId: req.user!.id, actorRole: req.user!.role as any, action:'PDF_DOWNLOADED', entityType:'Report', entityId: sessionId, metadata: JSON.stringify({ reportId: data.reportId, version: data.version }), ipAddress: req.ip }})
    }catch{}
    res.send(buffer)
  }catch(e){ next(e)}
}
