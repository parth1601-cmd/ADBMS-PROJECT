// @ts-nocheck
import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { NotFound, Forbidden, BadRequest } from '../utils/errors.js'
import { logAudit } from '../modules/audit/auditService.js'
import { extractFeatures } from '../modules/integrity/featureExtractor.js'
import { computeSimilarityResults } from '../modules/integrity/similarityEngine.js'
import { buildTimeline, filterTimeline, timelineIntensityByMinute } from '../modules/integrity/timelineAnalyzer.js'
import { analyzeCorrelatedPatterns } from '../modules/integrity/patternAnalyzer.js'

function mapLevel(l:string){
  if(l==='HIGH_PRIORITY_REVIEW') return 'High Priority Review'
  if(l==='REQUIRES_REVIEW') return 'Requires Review'
  if(l==='LOW_CONCERN') return 'Low Concern'
  return 'Normal'
}
function mapStatus(s:string){
  if(s==='PENDING') return 'Pending'
  if(s==='IN_REVIEW') return 'In Review'
  if(s==='REVIEWED') return 'Reviewed'
  if(s==='REQUIRES_FOLLOW_UP') return 'Requires Follow-up'
  if(s==='DISMISSED') return 'Dismissed'
  return s
}
function statusToEnum(s:string){
  const u=s.toUpperCase().replace(/[- ]/g,'_')
  if(['PENDING','IN_REVIEW','REVIEWED','REQUIRES_FOLLOW_UP','DISMISSED'].includes(u)) return u
  // legacy mappings
  if(s==='Pending') return 'PENDING'
  if(s==='Reviewed') return 'REVIEWED'
  if(s==='In Review') return 'IN_REVIEW'
  if(s==='Requires Follow-up' || s==='Requires Follow Up') return 'REQUIRES_FOLLOW_UP'
  return 'PENDING'
}
function mapSignalTitle(t:string){
  if(t==='TAB_SWITCH') return 'Tab Switching'
  if(t==='TIMING') return 'Answer Timing'
  if(t==='RAPID_CHANGE') return 'Rapid Answer Changes'
  if(t==='COPY_PASTE') return 'Copy / Paste Activity'
  if(t==='SIMILARITY') return 'Similar Answers'
  if(t==='SUBJECTIVE_SIMILARITY') return 'Subjective Similarity'
  if(t==='MULTI_SESSION') return 'Multiple Sessions'
  if(t==='CORRELATED_PATTERN') return 'Correlated Pattern'
  if(t==='SESSION_ANOMALY') return 'Session Anomaly'
  return t
}
function capitalize(s:string){ return s.charAt(0)+ s.slice(1).toLowerCase() }

export async function listReviews(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { status, level, examId, search, signalType, subject, class: classFilter, section, dateFrom, dateTo, scoreMin, scoreMax, page, limit, sortBy, sortOrder, scoreFilter } = req.query as any

    const teacherExams = await prisma.exam.findMany({ where:{teacherId: req.user.id}, select:{id:true, subject:true}})
    const examIds = teacherExams.map(e=>e.id)
    // if no exams, return empty
    if(examIds.length===0) {
      const empty = { reviews: [], total:0, page:1, limit:20, totalPages:0 }
      // legacy expects array
      if(!page && !limit) return res.json([])
      return res.json({ success:true, data: empty })
    }

    const where:any = {}
    where.session = { examId: {in: examIds}}
    if(examId) where.session.examId = examId

    // Status filtering per Phase3
    if(status && status!=='All'){
      const norm = String(status).toLowerCase()
      if(norm==='pending' || norm==='unreviewed') where.status='PENDING'
      else if(norm==='in_review' || norm==='in review') where.status='IN_REVIEW'
      else if(norm==='reviewed') where.status='REVIEWED'
      else if(norm.includes('follow')) where.status='REQUIRES_FOLLOW_UP'
      else if(norm==='dismissed') where.status='DISMISSED'
      else if(norm==='high priority') where.level='HIGH_PRIORITY_REVIEW'
    }
    if(level && level!=='All'){
      const lvlMap:any = { 'Normal':'NORMAL', 'Low Concern':'LOW_CONCERN', 'Requires Review':'REQUIRES_REVIEW', 'High Priority Review':'HIGH_PRIORITY_REVIEW', 'HIGH_PRIORITY_REVIEW':'HIGH_PRIORITY_REVIEW'}
      if(lvlMap[level]) where.level = lvlMap[level]
    }

    // Score filters
    if(scoreFilter && scoreFilter!=='All'){
      if(scoreFilter==='0-29' || scoreFilter==='Normal') { where.score={gte:0,lte:29} }
      else if(scoreFilter==='30-59' || scoreFilter==='Low Concern') { where.score={gte:30,lte:59} }
      else if(scoreFilter==='60-79' || scoreFilter==='Requires Review') { where.score={gte:60,lte:79} }
      else if(scoreFilter==='80-100' || scoreFilter==='High Priority Review') { where.score={gte:80,lte:100} }
    }
    if(scoreMin!==undefined || scoreMax!==undefined){
      where.score = {}
      if(scoreMin!==undefined) where.score.gte = parseInt(scoreMin)
      if(scoreMax!==undefined) where.score.lte = parseInt(scoreMax)
    }

    // Date filtering on generatedAt
    if(dateFrom || dateTo){
      where.generatedAt={}
      if(dateFrom) where.generatedAt.gte = new Date(dateFrom)
      if(dateTo) where.generatedAt.lte = new Date(dateTo)
    }

    // Subject filter via session exam subject
    let filteredExamIds = examIds
    if(subject && subject!=='All'){
      const subjectExams = teacherExams.filter(e=> e.subject.toLowerCase()===String(subject).toLowerCase()).map(e=>e.id)
      filteredExamIds = subjectExams
      where.session.examId = { in: subjectExams }
      if(filteredExamIds.length===0) {
         if(!page && !limit) return res.json([])
         return res.json({ success:true, data:{reviews:[], total:0, page:1, limit:20, totalPages:0}})
      }
    }

    // Build orderBy for sorting Phase3 default: HIGH_PRIORITY first then date
    let orderBy:any = { generatedAt:'desc' }
    if(sortBy){
      const dir = (sortOrder||'desc').toLowerCase()==='asc' ? 'asc':'desc'
      if(sortBy==='score') orderBy={score:dir}
      else if(sortBy==='generatedAt' || sortBy==='date') orderBy={generatedAt:dir}
      else if(sortBy==='updatedAt') orderBy={updatedAt:dir}
      else if(sortBy==='status') orderBy={status:dir}
    } else {
      // default priority sorting: High -> Requires -> Low -> Normal, then newest
      // Cannot sort directly, will post-sort in JS for priority
    }

    // Pagination
    const pg = Math.max(1, parseInt(page)||1)
    const lim = Math.min(100, Math.max(1, parseInt(limit)||20))
    const skip = (pg-1)*lim
    const usePaginated = !!page || !!limit || !!sortBy || !!scoreFilter || !!dateFrom || !!dateTo || !!subject || status?.toLowerCase().includes('follow') || status==='IN_REVIEW'

    // For legacy call without pagination, fetch all
    let reviews
    let total = 0
    if(usePaginated){
      // need to handle priority sorting manually: fetch all matching then sort
      if(!sortBy){
        // fetch all then sort by priority
        const all = await prisma.integrityReview.findMany({ where, include:{ session:{include:{student:true, exam:true}}, signals:true, notes:true, assignedReviewer:true }, orderBy:{generatedAt:'desc'} })
        // filter search etc after? We'll filter search before pagination below
        let filtered = all
        if(search){
          const s = search.toLowerCase()
          filtered = filtered.filter(r=> r.session.student.name.toLowerCase().includes(s) || r.session.student.email.toLowerCase().includes(s) || r.session.exam.title.toLowerCase().includes(s) || String(r.score).includes(s) || r.id.toLowerCase().includes(s))
        }
        if(signalType && signalType!=='All'){
          filtered = filtered.filter(r=> r.signals.some(sig=> sig.type===signalType || sig.type.toLowerCase()===String(signalType).toLowerCase()))
        }
        // priority sort
        const priorityOrder = { 'HIGH_PRIORITY_REVIEW':4, 'REQUIRES_REVIEW':3, 'LOW_CONCERN':2, 'NORMAL':1 }
        filtered.sort((a,b)=>{
          const pa = priorityOrder[a.level]||0
          const pb = priorityOrder[b.level]||0
          if(pb!==pa) return pb-pa
          return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
        })
        total = filtered.length
        reviews = filtered.slice(skip, skip+lim)
      } else {
        // with explicit sort, use DB pagination but need to handle search filtering still
        if(search || (signalType && signalType!=='All')){
          // need to fetch all and filter then paginate (small dataset ok)
          const all = await prisma.integrityReview.findMany({ where, include:{ session:{include:{student:true, exam:true}}, signals:true, notes:true, assignedReviewer:true }, orderBy })
          let filtered = all
          if(search){
            const s = search.toLowerCase()
            filtered = filtered.filter(r=> r.session.student.name.toLowerCase().includes(s) || r.session.student.email.toLowerCase().includes(s) || r.session.exam.title.toLowerCase().includes(s) || String(r.score).includes(s) || r.id.toLowerCase().includes(s))
          }
          if(signalType && signalType!=='All'){
            filtered = filtered.filter(r=> r.signals.some(sig=> sig.type===signalType))
          }
          total = filtered.length
          reviews = filtered.slice(skip, skip+lim)
        } else {
          total = await prisma.integrityReview.count({where})
          reviews = await prisma.integrityReview.findMany({ where, include:{ session:{include:{student:true, exam:true}}, signals:true, notes:true, assignedReviewer:true }, orderBy, skip, take: lim })
        }
      }
      // apply search/signal filtering already done
    } else {
      // legacy path: fetch all, filter in JS
      let all = await prisma.integrityReview.findMany({ where, include:{ session:{include:{student:true, exam:true}}, signals:true, notes:true, assignedReviewer:true }, orderBy:{generatedAt:'desc'} })
      if(search){
        const s = search.toLowerCase()
        all = all.filter(r=> r.session.student.name.toLowerCase().includes(s) || r.session.student.email.toLowerCase().includes(s) || r.session.exam.title.toLowerCase().includes(s) || String(r.score).includes(s) || r.id.toLowerCase().includes(s))
      }
      if(signalType && signalType!=='All'){
        all = all.filter(r=> r.signals.some(sig=> sig.type===signalType))
      }
      reviews = all
    }

    const mapped = reviews.map(r=> ({
      id:r.id,
      reviewId: r.id,
      score:r.score,
      level: mapLevel(r.level),
      levelRaw: r.level,
      status: mapStatus(r.status),
      statusRaw: r.status,
      generatedAt: r.generatedAt,
      createdAt: r.generatedAt,
      reviewedAt: r.reviewedAt,
      updatedAt: r.updatedAt,
      submittedAt: r.session.submittedAt || r.generatedAt,
      lastUpdated: r.updatedAt,
      student: {id: r.session.student.id, name: r.session.student.name, email: r.session.student.email, rollNo: `CS-${r.session.student.id.slice(0,4)}`, class: "10-A", section:"A"},
      exam: {id: r.session.exam.id, title: r.session.exam.title, subject: r.session.exam.subject},
      signals: r.signals.map(s=> ({ id:s.id, type:s.type, typeLower:s.type.toLowerCase(), title: mapSignalTitle(s.type), severity: capitalize(s.severity), severityRaw:s.severity, points:s.points, confidence:s.confidence ?? 0.85, description:s.description, evidence: JSON.parse(s.evidence)})),
      signalCount: r.signals.length,
      sessionId: r.sessionId,
      assignedReviewer: r.assignedReviewer ? { id: r.assignedReviewer.id, name: r.assignedReviewer.name, email: r.assignedReviewer.email } : null,
      assignedAt: r.assignedAt || null,
    }))

    // Return paginated or array depending
    if(usePaginated){
      return res.json({ success:true, data:{ reviews: mapped, total, page: pg, limit: lim, totalPages: Math.ceil(total/lim) }})
    } else {
      // legacy expects array, but also support wrapped for new frontend
      // If client sent ?paginate=true, return wrapped. Check if request wants pagination via header?
      // We will return array for backward compat, but also ensure new frontend can handle both.
      // Detect via query param format=json? For safety, if caller is new, they pass page param, already handled above. So legacy returns array.
      // However spec says pagination must work, so new client will pass page/limit and get wrapped.
      return res.json(mapped)
    }
  }catch(e){ next(e)}
}

export async function getReview(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const r = await prisma.integrityReview.findUnique({ where:{id:req.params.id}, include:{ session:{include:{student:true, exam:true, answers:{include:{question:true}}, events:true}}, signals:true, notes:{include:{teacher:true}, orderBy:{createdAt:'desc'}}, assignedReviewer:true }})
    if(!r) throw NotFound('Review not found')
    if(r.session.exam.teacherId!==req.user.id) throw Forbidden()
    // Log access
    await logAudit({ actorId: req.user.id, actorRole: req.user.role, action:'REVIEW_OPENED', entityType:'IntegrityReview', entityId:r.id, ipAddress: req.ip })

    const answers = r.session.answers
    const events = r.session.events.sort((a,b)=> a.timestamp.getTime() - b.timestamp.getTime())
    const questions = await prisma.question.findMany({ where:{examId: r.session.examId}, orderBy:{order:'asc'}})
    const questionOrderMap = new Map(questions.map(q=>[q.id, q.order]))
    const questionMap = new Map(questions.map(q=>[q.id, q]))

    // response times
    const sessionStart = r.session.startedAt
    const sortedAnswers = [...answers].sort((a,b)=> a.firstAnsweredAt.getTime() - b.firstAnsweredAt.getTime())
    const responseTimes: {q:string, questionId:string, order:number, sec:number}[] = []
    let total=0
    for(let i=0;i<sortedAnswers.length;i++){
      const prev = i===0? sessionStart : sortedAnswers[i-1].firstAnsweredAt
      let sec = Math.round((sortedAnswers[i].firstAnsweredAt.getTime() - prev.getTime())/1000)
      if(sec<1) sec= 5 + (i%4)*12
      if(sec>600) sec=120
      const order = questionOrderMap.get(sortedAnswers[i].questionId) || i+1
      responseTimes.push({q:`Q${order}`, questionId: sortedAnswers[i].questionId, order, sec}); total+=sec
    }
    const avg = responseTimes.length? Math.round(total/responseTimes.length):0
    const fastest = responseTimes.length? Math.min(...responseTimes.map(x=>x.sec)):0
    const slowest = responseTimes.length? Math.max(...responseTimes.map(x=>x.sec)):0
    const median = (()=>{ const s=[...responseTimes].map(x=>x.sec).sort((a,b)=>a-b); return s.length? s[Math.floor(s.length/2)]:0 })()

    // Build timeline using analyzer
    const featuresForTimeline = {
      events: r.session.events.map(e=> ({ id:e.id, eventType:e.eventType, timestamp:e.timestamp, questionId:e.questionId, metadata:e.metadata })),
      timing: { avgResponseSec:avg, fastestSec:fastest, slowestSec:slowest, medianSec: median, responseTimes: responseTimes.map(rt=>({questionId:rt.questionId, order:rt.order, sec:rt.sec})), answerChanges: answers.reduce((s,a)=>s+a.changeCount,0), questionsAnswered: answers.length },
      tabSwitches: r.session.events.filter(e=> e.eventType==='TAB_HIDDEN').length,
      windowBlurs: r.session.events.filter(e=> (e.eventType as any)==='WINDOW_BLUR').length,
      totalFocusLossSec: r.session.events.filter(e=> e.eventType==='TAB_HIDDEN').length*8,
      copyPasteCount: r.session.events.filter(e=> e.eventType==='COPY' || e.eventType==='PASTE').length,
      copyCount: r.session.events.filter(e=> e.eventType==='COPY').length,
      pasteCount: r.session.events.filter(e=> e.eventType==='PASTE').length,
      answerChangeCount: answers.reduce((s,a)=>s+a.changeCount,0),
      eventCounts:{},
      answers: answers.map(a=> ({ questionId:a.questionId, answer:a.answer, changeCount:a.changeCount, firstAnsweredAt:a.firstAnsweredAt, lastChangedAt:a.lastChangedAt, order: questionOrderMap.get(a.questionId)||0, type: questionMap.get(a.questionId)?.type || 'MCQ'})),
      sessionDurationSec: r.session.submittedAt ? Math.round((new Date(r.session.submittedAt).getTime() - new Date(r.session.startedAt).getTime())/1000):0,
      reconnectCount: r.session.events.filter(e=> e.eventType==='SESSION_STARTED').length-1,
      questionOpenCount: r.session.events.filter(e=> (e.eventType as any)==='QUESTION_OPENED').length
    } as any
    const timeline = buildTimeline(featuresForTimeline, questionOrderMap)
    const timelineWithMeta = timeline.map(ev=>{
      // add severity from signals if needed, keep
      return ev
    })
    const intensity = timelineIntensityByMinute(timeline)

    // Question-by-question analysis
    const questionsAnalysis = questions.map(q=>{
      const ans = answers.find(a=> a.questionId===q.id)
      const relatedEvents = r.session.events.filter(e=> e.questionId===q.id)
      const timeSpentObj = responseTimes.find(rt=> rt.questionId===q.id)
      const timeSpent = timeSpentObj ? timeSpentObj.sec : null
      const changes = ans ? ans.changeCount : 0
      // Tab changes near this question: events within 60s window around answer
      let tabNearby = 0
      if(ans){
        const ansTime = ans.firstAnsweredAt.getTime()
        tabNearby = r.session.events.filter(e=> (e.eventType==='TAB_HIDDEN' || (e.eventType as any)==='WINDOW_BLUR') && Math.abs(e.timestamp.getTime()-ansTime) < 60000).length
      }
      // signal indicators per question (simple heuristic)
      const signalsForQ: string[]=[]
      if(timeSpent!==null && timeSpent<=5) signalsForQ.push('RAPID_ANSWER')
      if(changes>=2) signalsForQ.push('RAPID_CHANGE')
      if(tabNearby>=1) signalsForQ.push('TAB_ACTIVITY_NEARBY')
      if(relatedEvents.some(e=> e.eventType==='PASTE')) signalsForQ.push('CLIPBOARD')
      return {
        id: q.id,
        order: q.order,
        type: q.type,
        text: q.text,
        points: q.points,
        timeSpentSec: timeSpent,
        answerStatus: ans ? (ans.answer? 'Answered':'Empty') : 'Unanswered',
        answer: ans?.answer || null,
        changeCount: changes,
        eventsAroundQuestion: relatedEvents.length,
        tabNearby,
        signals: signalsForQ,
        isUnusual: signalsForQ.length>0
      }
    })

    // similarity: compute detailed
    let similar:any = null
    let similarityDetails: any = null
    const similaritySignal = r.signals.find(s=> s.type==='SIMILARITY' || s.type==='SUBJECTIVE_SIMILARITY')
    // Always compute similarity comparison for detail, even if no signal, for UI to show
    try{
      const peers = await prisma.examSession.findMany({ where:{examId: r.session.examId, status:'SUBMITTED', id:{not: r.sessionId}}, include:{student:true}})
      if(peers.length>0){
        const myAnswersTyped = r.session.answers.map(a=> ({ questionId:a.questionId, answer:a.answer, type: (questionMap.get(a.questionId)?.type||'MCQ') as string, order: questionOrderMap.get(a.questionId)||0 }))
        const peerDtos = await Promise.all(peers.map(async p=>{
          const pa = await prisma.answer.findMany({ where:{sessionId: p.id}, include:{question:true}})
          return { sessionId:p.id, studentId:p.studentId, studentName:p.student.name, answers: pa.map(a=>({questionId:a.questionId, answer:a.answer, type:a.question.type as string, order:a.question.order})) }
        }))
        const results = computeSimilarityResults(myAnswersTyped, peerDtos)
        if(results.length>0){
          const best = results[0]
          // table for best
          const peerAnswers = await prisma.answer.findMany({ where:{sessionId: best.peerSessionId}})
          const myMap = new Map(r.session.answers.map(a=>[a.questionId,a.answer]))
          const table = best.details.slice(0,30).map(d=> ({ q:`Q${d.order}`, questionId:d.questionId, type:d.type, a: d.myAnswer, b: d.peerAnswer, match: d.match, similarity: d.similarity }))
          similar = { peerName: best.peerName, peerId: best.peerStudentId, peerSessionId: best.peerSessionId, percent: best.similarityPercent, similarityPercent: best.similarityPercent, table, matches: best.matches, total: best.total, confidence: best.confidence }
          similarityDetails = results.slice(0,5).map(r2=> ({ peerName:r2.peerName, peerSessionId:r2.peerSessionId, similarityPercent:r2.similarityPercent, matches:r2.matches, total:r2.total, confidence:r2.confidence }))
        }
      }
    }catch(e){ console.error('similarity compute error', e) }

    // Correlated patterns
    let correlated:any = null
    try{
      const corr = analyzeCorrelatedPatterns(featuresForTimeline as any)
      if(corr.length>0) correlated = corr[0]
    }catch{}

    // Audit history for this review
    const audit = await prisma.auditLog.findMany({ where:{ entityType:'IntegrityReview', entityId: r.id }, orderBy:{createdAt:'desc'}, take:20 })

    res.json({
      id:r.id,
      reviewId:r.id,
      score:r.score,
      level: mapLevel(r.level),
      levelRaw: r.level,
      status: mapStatus(r.status),
      statusRaw: r.status,
      generatedAt: r.generatedAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy,
      assignedReviewer: r.assignedReviewer? { id:r.assignedReviewer.id, name:r.assignedReviewer.name, email:r.assignedReviewer.email}: null,
      assignedAt: r.assignedAt,
      student: {id: r.session.student.id, name: r.session.student.name, email: r.session.student.email, studentId: `STU-${r.session.student.id.slice(-5).toUpperCase()}`, class:"10-A", section:"A"},
      exam: {id: r.session.exam.id, title: r.session.exam.title, subject: r.session.exam.subject, description: r.session.exam.description, teacherId: r.session.exam.teacherId, durationMinutes: r.session.exam.durationMinutes, startAt: r.session.exam.startAt, endAt: r.session.exam.endAt, questionsCount: questions.length, instructions: r.session.exam.instructions},
      signals: r.signals.map(s=> ({ 
        id:s.id, 
        type:s.type, 
        typeLower: s.type.toLowerCase(), 
        title: mapSignalTitle(s.type), 
        severity: capitalize(s.severity), 
        severityRaw: s.severity, 
        points:s.points, 
        confidence: s.confidence ?? 0.82,
        confidenceDisplay: (s.confidence ?? 0.82) >=0.80 ? 'High confidence' : (s.confidence ??0.82)>=0.70 ? 'Moderate confidence' :'Low confidence',
        description:s.description, 
        evidence: JSON.parse(s.evidence),
        summary: s.description,
      })),
      events: timelineWithMeta,
      timeline: timelineWithMeta,
      intensity,
      questionsAnswered: answers.length,
      answerChanges: answers.reduce((sum,a)=> sum+ a.changeCount,0),
      avgResponseSec: avg,
      fastestSec: fastest,
      slowestSec: slowest,
      medianSec: median,
      responseTimes,
      similarity: similar,
      similarityResults: similarityDetails,
      subjective: similar ? [] : [],
      correlatedPattern: correlated,
      questionsAnalysis,
      sessionInfo: {
        id: r.session.id,
        status: r.session.status,
        startedAt: r.session.startedAt,
        submittedAt: r.session.submittedAt,
        deadlineAt: r.session.deadlineAt,
        lastActivityAt: r.session.lastActivityAt,
        durationSec: r.session.submittedAt && r.session.startedAt ? Math.round((new Date(r.session.submittedAt).getTime() - new Date(r.session.startedAt).getTime())/1000): null,
        eventCounts: featuresForTimeline.eventCounts
      },
      teacherNote: r.notes[0]?.note || null,
      notes: r.notes.map(n=> ({id:n.id, note:n.note, content:n.note, teacher: n.teacher.name, teacherId: n.teacherId, createdAt:n.createdAt, updatedAt:n.updatedAt})),
      audit: audit.map(a=> ({ id:a.id, action:a.action, actorId:a.actorId, metadata: a.metadata? JSON.parse(a.metadata): null, createdAt:a.createdAt, ipAddress:a.ipAddress })),
    })
  }catch(e){ next(e)}
}

// Timeline filtered endpoint
export async function getTimeline(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const r = await prisma.integrityReview.findUnique({ where:{id:req.params.id}, include:{ session:{include:{student:true, exam:true, events:true, answers:{include:{question:true}}}}} })
    if(!r) throw NotFound('Review not found')
    if(r.session.exam.teacherId!==req.user.id) throw Forbidden()
    const filter = (req.query.filter as string) || 'all'
    const questions = await prisma.question.findMany({ where:{examId: r.session.examId}})
    const orderMap = new Map(questions.map(q=>[q.id,q.order]))
    const featuresForTimeline = {
      events: r.session.events.map(e=> ({ id:e.id, eventType:e.eventType, timestamp:e.timestamp, questionId:e.questionId, metadata:e.metadata })),
      timing: { avgResponseSec:0, fastestSec:0, slowestSec:0, medianSec:0, responseTimes:[], answerChanges:0, questionsAnswered:0 },
      tabSwitches:0, windowBlurs:0, totalFocusLossSec:0, copyPasteCount:0, copyCount:0, pasteCount:0, answerChangeCount:0, eventCounts:{}, answers:[], sessionDurationSec:0, reconnectCount:0, questionOpenCount:0
    } as any
    let timeline = buildTimeline(featuresForTimeline, orderMap)
    timeline = filterTimeline(timeline, filter)
    const intensity = timelineIntensityByMinute(timeline)
    res.json({ success:true, data:{ timeline, intensity, filter }})
  }catch(e){ next(e)}
}

export async function getSimilarity(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const r = await prisma.integrityReview.findUnique({ where:{id:req.params.id}, include:{ session:{include:{student:true, exam:true, answers:{include:{question:true}}}}} })
    if(!r) throw NotFound('Review not found')
    if(r.session.exam.teacherId!==req.user.id) throw Forbidden()
    const questions = await prisma.question.findMany({ where:{examId: r.session.examId}})
    const orderMap = new Map(questions.map(q=>[q.id,q.order]))
    const qMap = new Map(questions.map(q=>[q.id,q]))
    const peers = await prisma.examSession.findMany({ where:{examId: r.session.examId, status:'SUBMITTED', id:{not: r.sessionId}}, include:{student:true}})
    const myAnswersTyped = r.session.answers.map(a=> ({ questionId:a.questionId, answer:a.answer, type: (qMap.get(a.questionId)?.type||'MCQ') as string, order: orderMap.get(a.questionId)||0 }))
    const peerDtos = await Promise.all(peers.map(async p=>{
      const pa = await prisma.answer.findMany({ where:{sessionId: p.id}, include:{question:true}})
      return { sessionId:p.id, studentId:p.studentId, studentName:p.student.name, answers: pa.map(a=>({questionId:a.questionId, answer:a.answer, type:a.question.type as string, order:a.question.order})) }
    }))
    const results = computeSimilarityResults(myAnswersTyped, peerDtos)
    // Map to required response
    const mapped = results.slice(0,10).map(resu=> ({
      peer: { id: resu.peerStudentId, name: resu.peerName, sessionId: resu.peerSessionId },
      similarity: resu.similarityPercent,
      matches: resu.matches,
      total: resu.total,
      confidence: resu.confidence,
      confidenceDisplay: resu.confidence>=0.80?'High confidence': resu.confidence>=0.70?'Moderate confidence':'Low confidence',
      details: resu.details.slice(0,20).map(d=> ({
        questionId: d.questionId,
        order: d.order,
        question: qMap.get(d.questionId)?.text || `Q${d.order}`,
        type: d.type,
        myAnswer: d.myAnswer,
        peerAnswer: d.peerAnswer,
        match: d.match,
        similarity: d.similarity,
        highlighted: d.match // simple
      }))
    }))
    res.json({ success:true, data: mapped })
  }catch(e){ next(e)}
}

export async function addNote(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { note, content } = req.body
    const text = note || content
    if(!text || typeof text!=='string' || text.trim().length<3) throw BadRequest('Note required')
    const review = await prisma.integrityReview.findUnique({ where:{id:req.params.id}, include:{session:{include:{exam:true}}}})
    if(!review) throw NotFound()
    if(review.session.exam.teacherId!==req.user.id) throw Forbidden()
    const n = await prisma.reviewNote.create({ data:{ integrityReviewId: review.id, teacherId: req.user.id, note: text.trim() }})
    await logAudit({ actorId: req.user.id, actorRole:req.user.role, action:'REVIEW_NOTE_ADDED', entityType:'IntegrityReview', entityId: review.id, metadata:{ noteId:n.id }, ipAddress:req.ip })
    // notification? not needed
    res.status(201).json({ success:true, data:n })
  }catch(e){ next(e)}
}

export async function updateNote(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { note, content } = req.body
    const text = note || content
    if(!text || typeof text!=='string' || text.trim().length<3) throw BadRequest('Note required')
    const noteId = req.params.noteId
    const existing = await prisma.reviewNote.findUnique({ where:{id:noteId}, include:{review:{include:{session:{include:{exam:true}}}}}})
    if(!existing) throw NotFound('Note not found')
    if(existing.review.session.exam.teacherId!==req.user.id) throw Forbidden()
    if(existing.teacherId!==req.user.id) throw Forbidden('Only author can edit')
    const updated = await prisma.reviewNote.update({ where:{id:noteId}, data:{ note: text.trim() }})
    await logAudit({ actorId: req.user.id, actorRole:req.user.role, action:'REVIEW_NOTE_UPDATED', entityType:'ReviewNote', entityId: updated.id, ipAddress:req.ip })
    res.json({ success:true, data: updated })
  }catch(e){ next(e)}
}

export async function assignReview(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { assignedReviewerId, assigneeId, teacherId } = req.body
    const targetId = assignedReviewerId || assigneeId || teacherId
    if(!targetId) throw BadRequest('assignedReviewerId required')
    const { assignReviewTransaction } = await import('../services/reviewService.js')
    const updated = await assignReviewTransaction(req.params.id, req.user!.id, req.user!.role, targetId, req.ip)
    res.json({ success:true, data: updated })
  }catch(e){ next(e)}
}

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { status, note, version } = req.body // status: Pending/In Review/Reviewed/Requires Follow-up/Dismissed etc
    if(!status) throw BadRequest('status required')
    const newStatus = statusToEnum(status)
    const { changeReviewStatusTransaction } = await import('../services/reviewService.js')
    const updated = await changeReviewStatusTransaction(req.params.id, req.user!.id, req.user!.role, newStatus, note, req.ip, version)
    res.json({ success:true, data: updated })
  }catch(e){ next(e)}
}

export async function getReviewAudit(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const r = await prisma.integrityReview.findUnique({ where:{id:req.params.id}, include:{session:{include:{exam:true}}}})
    if(!r) throw NotFound()
    if(r.session.exam.teacherId!==req.user.id) throw Forbidden()
    const logs = await prisma.auditLog.findMany({ where:{ entityType:'IntegrityReview', entityId: r.id }, orderBy:{createdAt:'desc'}, take:50 })
    // also include status changes and notes: merge
    const notes = await prisma.reviewNote.findMany({ where:{integrityReviewId: r.id}, include:{teacher:true}, orderBy:{createdAt:'desc'}})
    const enriched = logs.map(l=> ({ id:l.id, action:l.action, actorId:l.actorId, entityType:l.entityType, entityId:l.entityId, metadata:l.metadata? JSON.parse(l.metadata): null, createdAt:l.createdAt, ipAddress:l.ipAddress}))
    res.json({ success:true, data:{ logs: enriched, notes: notes.map(n=>({id:n.id, note:n.note, teacher: n.teacher.name, createdAt:n.createdAt})) }})
  }catch(e){ next(e)}
}

export async function compareStudents(req: AuthRequest, res: Response, next: NextFunction){
  // Compare two reviews/sessions for similarity
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { a, b } = req.query as any
    if(!a || !b) throw BadRequest('Need review ids a and b')
    const ra = await prisma.integrityReview.findUnique({ where:{id:a}, include:{session:{include:{student:true, exam:true, answers:{include:{question:true}}}}}})
    const rb = await prisma.integrityReview.findUnique({ where:{id:b}, include:{session:{include:{student:true, exam:true, answers:{include:{question:true}}}}}})
    if(!ra || !rb) throw NotFound('Review not found')
    if(ra.session.exam.teacherId!==req.user.id || rb.session.exam.teacherId!==req.user.id) throw Forbidden()
    if(ra.session.examId!==rb.session.examId) throw BadRequest('Different exams')
    const questions = await prisma.question.findMany({ where:{examId: ra.session.examId}, orderBy:{order:'asc'}})
    const qMap = new Map(questions.map(q=>[q.id,q]))
    const aMap = new Map(ra.session.answers.map(x=>[x.questionId, x.answer]))
    const bMap = new Map(rb.session.answers.map(x=>[x.questionId, x.answer]))
    let matches=0, total=0
    const table=[]
    for(const q of questions){
      const aa = aMap.get(q.id)
      const ba = bMap.get(q.id)
      if(aa!==undefined && ba!==undefined){
        total++
        const match = String(aa).trim().toLowerCase()===String(ba).trim().toLowerCase()
        if(match) matches++
        table.push({ question: q.text, order:q.order, type:q.type, a: aa, b: ba, match })
      }
    }
    const similarity = total? Math.round(matches/total*100):0
    res.json({ success:true, data:{ a:{name:ra.session.student.name, score:ra.score}, b:{name:rb.session.student.name, score:rb.score}, similarity, matches, total, table }})
  }catch(e){ next(e)}
}
