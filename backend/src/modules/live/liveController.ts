// @ts-nocheck
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth.js'
import { prisma } from '../../utils/prisma.js'
import { Forbidden, NotFound } from '../../utils/errors.js'

function connectionStateForSession(sess: any, recentEvents: any[]): string {
  if (sess.status === 'SUBMITTED') return 'SUBMITTED'
  if (sess.status === 'EXPIRED') return 'INACTIVE'
  const now = Date.now()
  const lastSeen = sess.lastSeenAt ? new Date(sess.lastSeenAt).getTime() : new Date(sess.lastActivityAt).getTime()
  const gap = now - lastSeen
  if (gap > 120000) return 'DISCONNECTED'
  if (gap > 45000) return 'INACTIVE'
  const lastFocus = [...recentEvents].reverse().find(e => e.eventType === 'TAB_HIDDEN' || e.eventType === 'WINDOW_BLUR')
  const lastVisible = [...recentEvents].reverse().find(e => e.eventType === 'TAB_VISIBLE' || e.eventType === 'WINDOW_FOCUS')
  if (lastFocus && (!lastVisible || new Date(lastFocus.timestamp).getTime() > new Date(lastVisible.timestamp).getTime())) {
    const lastFocusTime = new Date(lastFocus.timestamp).getTime()
    if (now - lastFocusTime < 30000) return 'FOCUS_LOST'
  }
  return sess.connectionState || 'ACTIVE'
}

function sanitizeLive(v:any): string | undefined {
  if (v===undefined || v===null) return undefined
  const s=String(v).trim()
  if (!s || s==='undefined' || s==='null') return undefined
  return s
}
export async function getLiveSessions(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role !== 'TEACHER') throw Forbidden()
    const teacherId = req.user.id
    let { status, search, examId } = req.query as any
    status = sanitizeLive(status); search = sanitizeLive(search); examId = sanitizeLive(examId)

    const teacherExams = await prisma.exam.findMany({ where:{ teacherId }, select:{ id:true }})
    const examIds = teacherExams.map(e=>e.id)
    if(examIds.length===0) return res.json({ success:true, data: { sessions: [], total:0, counts:{ all:0, ACTIVE:0, FOCUS_LOST:0, DISCONNECTED:0, INACTIVE:0, SUBMITTED:0 }}})
    const where:any = { examId:{ in: examIds }, status: 'IN_PROGRESS' as any }
    if(examId) where.examId = examId

    let sessions = await prisma.examSession.findMany({
      where,
      include:{ student:true, exam:true, answers:true, events:{ orderBy:{ timestamp:'desc'}, take:10 }},
      orderBy:{ lastActivityAt:'desc' },
      take:100
    })

    // Enrich
    let enriched = await Promise.all(sessions.map(async s=>{
      const totalQ = await prisma.question.count({ where:{ examId:s.examId }})
      const answered = s.answers.length
      const progress = totalQ ? Math.round(answered/totalQ*100):0
      let remainingSec = 0
      if(s.deadlineAt){
        remainingSec = Math.max(0, Math.floor((new Date(s.deadlineAt).getTime() - Date.now())/1000))
      } else {
        const duration = s.exam.durationMinutes*60*1000
        remainingSec = Math.max(0, Math.floor((duration - (Date.now() - new Date(s.startedAt).getTime()))/1000))
      }
      const conn = connectionStateForSession(s, s.events)
      // integrity activity: count focus/clipboard events in last 5 min
      const fiveMinAgo = Date.now() - 5*60*1000
      const recentActivity = s.events.filter(e=> new Date(e.timestamp).getTime() > fiveMinAgo && ['TAB_HIDDEN','WINDOW_BLUR','COPY','PASTE','FULLSCREEN_EXITED'].includes(e.eventType)).length
      // last activity timestamp
      const lastActivity = s.lastSeenAt || s.lastActivityAt
      // determine current question: last QUESTION_OPENED event or currentQuestionId
      let currentQ = s.currentQuestionId || null
      const lastOpened = s.events.find(e=> e.eventType==='QUESTION_OPENED')
      if(!currentQ && lastOpened) currentQ = lastOpened.questionId
      let currentQuestionOrder: number | null = null
      if(currentQ){
        const q = await prisma.question.findUnique({ where:{id:currentQ}}).catch(()=>null)
        if(q) currentQuestionOrder = (q as any).order
      }
      return {
        sessionId: s.id,
        session: { id:s.id, status:s.status, startedAt:s.startedAt, deadlineAt:s.deadlineAt, submittedAt:s.submittedAt, lastActivityAt:s.lastActivityAt, lastSeenAt:s.lastSeenAt, connectionState:conn, currentQuestionId:currentQ },
        student: { id:s.student.id, name:s.student.name, email:s.student.email, studentId:`STU-${s.student.id.slice(-5).toUpperCase()}` },
        exam: { id:s.exam.id, title:s.exam.title, subject:s.exam.subject, durationMinutes:s.exam.durationMinutes },
        progress: { answered, total: totalQ, percent: progress },
        timeRemainingSec: remainingSec,
        connectionState: conn,
        integrityActivity: recentActivity,
        lastActivityAt: lastActivity,
        currentQuestion: currentQuestionOrder ? `Q${currentQuestionOrder}` : null,
        currentQuestionId: currentQ,
        submittedAt: s.submittedAt,
        startedAt: s.startedAt,
        recentEvents: s.events.slice(0,5).map(e=> ({ id:e.id, eventType:e.eventType, timestamp:e.timestamp, questionId:e.questionId }))
      }
    }))

    // Filters
    if(search){
      const q = search.toLowerCase()
      enriched = enriched.filter(e=> e.student.name.toLowerCase().includes(q) || e.exam.title.toLowerCase().includes(q) || e.student.email.toLowerCase().includes(q))
    }
    if(status && status!=='All' && status!=='all'){
      const norm = status.toUpperCase()
      enriched = enriched.filter(e=> e.connectionState===norm || e.session.status===norm)
    }

    const counts = {
      all: enriched.length,
      ACTIVE: enriched.filter(e=> e.connectionState==='ACTIVE').length,
      FOCUS_LOST: enriched.filter(e=> e.connectionState==='FOCUS_LOST').length,
      DISCONNECTED: enriched.filter(e=> e.connectionState==='DISCONNECTED').length,
      INACTIVE: enriched.filter(e=> e.connectionState==='INACTIVE').length,
      SUBMITTED: enriched.filter(e=> e.connectionState==='SUBMITTED').length,
    }

    res.json({ success:true, data:{ sessions: enriched, total: enriched.length, counts }})
  }catch(e){ next(e)}
}

export async function getLiveSessionDetail(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role !== 'TEACHER') throw Forbidden()
    const { id } = req.params
    const sess = await prisma.examSession.findUnique({ where:{ id }, include:{ student:true, exam:true, answers:true, events:{ orderBy:{ timestamp:'asc'}} }})
    if(!sess) throw NotFound('Session not found')
    if(sess.exam.teacherId !== req.user!.id) throw Forbidden()
    const totalQ = await prisma.question.count({ where:{ examId:sess.examId }})
    const answered = sess.answers.length
    let remainingSec = 0
    if(sess.deadlineAt) remainingSec = Math.max(0, Math.floor((new Date(sess.deadlineAt).getTime() - Date.now())/1000))
    const conn = connectionStateForSession(sess, sess.events)
    // recent 20 events
    const recent = sess.events.slice(-20).reverse()
    res.json({ success:true, data:{
      sessionId: sess.id,
      session: { id:sess.id, status:sess.status, startedAt:sess.startedAt, deadlineAt:sess.deadlineAt, lastSeenAt:sess.lastSeenAt, lastActivityAt:sess.lastActivityAt, connectionState:conn, currentQuestionId:sess.currentQuestionId, heartbeatCount:sess.heartbeatCount, fullscreenExits:sess.fullscreenExits },
      student: { id:sess.student.id, name:sess.student.name, email:sess.student.email, studentId:`STU-${sess.student.id.slice(-5).toUpperCase()}` },
      exam: { id:sess.exam.id, title:sess.exam.title, subject:sess.exam.subject },
      progress:{ answered, total: totalQ, percent: totalQ? Math.round(answered/totalQ*100):0 },
      timeRemainingSec: remainingSec,
      connectionState: conn,
      recentEvents: recent.map(e=> ({ id:e.id, eventType:e.eventType, timestamp:e.timestamp, questionId:e.questionId, metadata:e.metadata? (()=>{ try{return JSON.parse(e.metadata)}catch{return e.metadata}})():null })),
      answeredCount: answered,
    }})
  }catch(e){ next(e)}
}

export async function getLiveEvents(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role !== 'TEACHER') throw Forbidden()
    const teacherId = req.user.id
    let sinceRaw = req.query.since as string | undefined
    if (sinceRaw === 'undefined' || sinceRaw === 'null' || sinceRaw === '') sinceRaw = undefined
    let since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 60000)
    if (isNaN(since.getTime())) since = new Date(Date.now() - 60000)
    const teacherExams = await prisma.exam.findMany({ where:{ teacherId }, select:{ id:true }})
    const examIds = teacherExams.map(e=>e.id)
    if(examIds.length===0) return res.json({ success:true, data:[]})
    const sessions = await prisma.examSession.findMany({ where:{ examId:{in:examIds}, status:'IN_PROGRESS'}, select:{id:true}})
    const sids = sessions.map(s=> s.id)
    if(sids.length===0) return res.json({ success:true, data:[]})
    const events = await prisma.examEvent.findMany({ where:{ sessionId:{in:sids}, timestamp:{gte:since}}, orderBy:{ timestamp:'desc'}, take:50, include:{ session:{ include:{ student:true, exam:true } } }})
    const mapped = events.map(ev=> ({
      id:ev.id, timestamp:ev.timestamp, eventType:ev.eventType, metadata: ev.metadata ? (()=>{ try{return JSON.parse(ev.metadata)}catch{return ev.metadata}})():null, questionId:ev.questionId,
      student: { id: ev.session.student.id, name: ev.session.student.name },
      exam: { id: ev.session.exam.id, title: ev.session.exam.title },
      sessionId: ev.sessionId,
      title: ev.eventType.replace(/_/g,' ')
    }))
    res.json({ success:true, data: mapped })
  }catch(e){ next(e)}
}

export async function streamLive(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(!req.user || req.user.role!=='TEACHER'){ res.status(401).end(); return}
    const teacherId = req.user.id
    res.setHeader('Content-Type','text/event-stream')
    res.setHeader('Cache-Control','no-cache')
    res.setHeader('Connection','keep-alive')
    // CORS already handled, but ensure
    res.flushHeaders?.()
    const interval = setInterval(async ()=>{
      try{
        const teacherExams = await prisma.exam.findMany({ where:{ teacherId }, select:{id:true}})
        const examIds = teacherExams.map(e=> e.id)
        if(examIds.length===0){ res.write(`data: ${JSON.stringify({ type:'heartbeat', count:0 })}\n\n`); return}
        const sessions = await prisma.examSession.findMany({ where:{ examId:{in:examIds}, status:'IN_PROGRESS'}, include:{ student:true, exam:true, answers:true }})
        // simple payload: count and list
        const payload = sessions.map(s=> ({
          sessionId:s.id, student:{name:s.student.name}, exam:{title:s.exam.title},
          connectionState: s.connectionState || 'ACTIVE',
          progress:{ answered:s.answers.length },
          lastSeenAt: s.lastSeenAt || s.lastActivityAt
        }))
        res.write(`data: ${JSON.stringify({ type:'snapshot', sessions: payload, ts: new Date().toISOString() })}\n\n`)
      }catch(e){ console.error('SSE error', e)}
    }, 3000)
    // send initial
    res.write(`data: ${JSON.stringify({ type:'connected', ts:new Date().toISOString() })}\n\n`)
    req.on('close', ()=>{ clearInterval(interval); res.end() })
  }catch(e){ next(e)}
}

export async function postBroadcast(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { examId } = req.params
    const { message, sessionId, target } = req.body
    if(!message || String(message).trim().length<3) return res.status(400).json({ error:'Message required' })
    const exam = await prisma.exam.findUnique({ where:{ id: examId }})
    if(!exam) throw NotFound('Exam not found')
    if(exam.teacherId !== req.user.id) throw Forbidden()
    const broadcast = await prisma.broadcast.create({ data:{
      examId: exam.id,
      sessionId: sessionId || null,
      teacherId: req.user.id,
      message: String(message).trim().slice(0,500),
      target: target === 'SINGLE' && sessionId ? 'SINGLE' : 'ALL'
    }})
    await prisma.auditLog.create({ data:{ actorId:req.user.id, actorRole:'TEACHER', action:'ANNOUNCEMENT_SENT', entityType:'Broadcast', entityId:broadcast.id, metadata:JSON.stringify({ examId, message:broadcast.message }) }})
    // also create notifications for affected students
    if(sessionId){
      const sess = await prisma.examSession.findUnique({ where:{ id: sessionId }})
      if(sess){
        await prisma.notification.create({ data:{ userId: sess.studentId, title:`Exam Announcement — ${exam.title}`, message: broadcast.message, type:'ANNOUNCEMENT', entityId: broadcast.id }})
      }
    } else {
      const sessions = await prisma.examSession.findMany({ where:{ examId: exam.id, status:'IN_PROGRESS' }, select:{ studentId:true }})
      for(const s of sessions){
        await prisma.notification.create({ data:{ userId: s.studentId, title:`Exam Announcement — ${exam.title}`, message: broadcast.message, type:'ANNOUNCEMENT', entityId: broadcast.id }})
      }
    }
    res.status(201).json({ success:true, data:broadcast })
  }catch(e){ next(e)}
}

export async function getBroadcastsForStudent(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const sessionId = req.query.sessionId as string | undefined
    const examId = req.params.examId || req.query.examId as string
    // Student fetches broadcasts for their exam/session
    if(req.user?.role === 'STUDENT'){
      // ensure they have session for exam
      let sids:string[]=[]
      if(sessionId){
        const sess = await prisma.examSession.findUnique({ where:{ id: sessionId }})
        if(!sess || sess.studentId !== req.user.id) throw Forbidden()
        sids=[sessionId]
        // fetch broadcasts for exam + for session
        const broadcasts = await prisma.broadcast.findMany({ where:{ examId: sess.examId, OR:[{ target:'ALL'}, { sessionId }]}, orderBy:{ createdAt:'desc'}, take:10 })
        return res.json(broadcasts)
      }
      if(examId){
        const broadcasts = await prisma.broadcast.findMany({ where:{ examId, target:'ALL'}, orderBy:{ createdAt:'desc'}, take:10 })
        return res.json(broadcasts)
      }
      return res.json([])
    }
    // Teacher view
    if(req.user?.role === 'TEACHER'){
      const broadcasts = await prisma.broadcast.findMany({ where:{ examId: examId }, orderBy:{ createdAt:'desc'}, take:20 })
      return res.json({ success:true, data: broadcasts })
    }
    throw Forbidden()
  }catch(e){ next(e)}
}


