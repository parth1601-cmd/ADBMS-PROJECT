// @ts-nocheck
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth.js'
import { prisma } from '../../utils/prisma.js'
import { Forbidden, NotFound, BadRequest } from '../../utils/errors.js'

function sanitize(v:any): string | undefined {
  if (v===undefined || v===null) return undefined
  const s=String(v).trim()
  if (!s || s==='undefined' || s==='null') return undefined
  return s
}
export async function getGradingQueue(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const teacherId = req.user.id
    let { status, examId, page, limit, search } = req.query as any
    status = sanitize(status); examId = sanitize(examId); search = sanitize(search)
    const pg = Math.max(1, parseInt(page)||1)
    const lim = Math.min(100, parseInt(limit)||20)
    const skip = (pg-1)*lim
    // Find exams for teacher
    const exams = await prisma.exam.findMany({ where:{ teacherId }, select:{ id:true }})
    const examIds = exams.map(e=> e.id)
    if(examIds.length===0) return res.json({ success:true, data:{ items:[], total:0, page:pg, totalPages:0 }})
    let whereExam:any = { examId:{ in: examIds }}
    if(examId) whereExam.examId = examId
    // Fetch questions that are short answer
    const shortQs = await prisma.question.findMany({ where:{ ...whereExam, type:{ in:['SHORT','SHORT_ANSWER','LONG_ANSWER'] as any } }, select:{ id:true, text:true, points:true, examId:true, order:true }})
    const qIds = shortQs.map(q=> q.id)
    if(qIds.length===0) return res.json({ success:true, data:{ items:[], total:0, page:pg, totalPages:0 }})
    // Find answers pending grading – for SHORT, pending = gradedAt is null (marksAwarded may be 0 due to default)
    const whereAns:any = { questionId:{ in: qIds }, gradedAt: null }
    // Include session filtering for SUBMITTED only
    const all = await prisma.answer.findMany({
      where: whereAns,
      include:{
        session:{ include:{ student:true, exam:true }},
        question:true
      },
      orderBy:{ createdAt:'desc' }
    })
    // Filter only where session status SUBMITTED
    let filtered = all.filter(a=> a.session.status==='SUBMITTED' && examIds.includes(a.session.examId))
    if(search){
      const s = search.toLowerCase()
      filtered = filtered.filter(a=> a.session.student.name.toLowerCase().includes(s) || a.question.text.toLowerCase().includes(s) || a.session.exam.title.toLowerCase().includes(s))
    }
    // Filter by grading status (gradedAt null = pending)
    if(status && status!=='All'){
      if(status==='Pending') filtered = filtered.filter(a=> !a.gradedAt)
      else if(status==='Graded') filtered = filtered.filter(a=> !!a.gradedAt)
    } else {
      // default pending only
      filtered = filtered.filter(a=> !a.gradedAt)
    }
    const total = filtered.length
    const items = filtered.slice(skip, skip+lim).map(a=> ({
      answerId: a.id,
      sessionId: a.sessionId,
      exam: { id: a.session.exam.id, title: a.session.exam.title, subject: a.session.exam.subject },
      question: { id: a.question.id, text: a.question.text, order: (a.question as any).order, points: a.question.points, type: a.question.type },
      student: { id: a.session.student.id, name: a.session.student.name, email: a.session.student.email, studentId:`STU-${a.session.student.id.slice(-5).toUpperCase()}` },
      answer: a.answer,
      marksAwarded: a.marksAwarded,
      teacherFeedback: a.teacherFeedback,
      gradedBy: a.gradedBy,
      gradedAt: a.gradedAt,
      firstAnsweredAt: a.firstAnsweredAt,
      submittedAt: a.session.submittedAt,
      status: !a.gradedAt ? 'Pending' : 'Graded'
    }))
    // Also provide summary counts (gradedAt based)
    const pendingCount = all.filter(a=> !a.gradedAt && a.session.status==='SUBMITTED').length
    const gradedAll = await prisma.answer.findMany({ where:{ questionId:{ in: qIds }, gradedAt: { not: null } }, include:{ session:true }})
    const gradedCount = gradedAll.filter(a=> a.session.status==='SUBMITTED').length
    res.json({ success:true, data:{ items, total, page:pg, limit:lim, totalPages: Math.ceil(total/lim), pendingCount, gradedCount }})
  }catch(e){ next(e)}
}

export async function gradeAnswer(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { answerId } = req.params
    const { marksAwarded, teacherFeedback, feedback } = req.body
    const fb = teacherFeedback || feedback
    const answer = await prisma.answer.findUnique({ where:{ id: answerId }, include:{ question:true, session:{ include:{ exam:true } } }})
    if(!answer) throw NotFound('Answer not found')
    if(answer.session.exam.teacherId !== req.user.id) throw Forbidden()
    const max = answer.question.points
    const marks = Number(marksAwarded)
    if(Number.isNaN(marks) || marks <0 || marks > max) throw BadRequest(`marksAwarded must be 0-${max}`)
    const updated = await prisma.answer.update({ where:{ id: answerId }, data:{
      marksAwarded: marks,
      teacherFeedback: fb ? String(fb).slice(0,1000) : null,
      gradedBy: req.user.id,
      gradedAt: new Date(),
      isCorrect: marks===max ? true : marks===0 ? false : null // partial
    }})
    await prisma.auditLog.create({ data:{
      actorId: req.user.id, actorRole:'TEACHER', action:'GRADE_UPDATED', entityType:'Answer', entityId: answerId, metadata: JSON.stringify({ marks, max, questionId: answer.questionId, sessionId: answer.sessionId })
    }})
    // Optionally update total result? computeResult will reflect new marks via marksAwarded fallback if needed
    res.json({ success:true, data: updated })
  }catch(e){ next(e)}
}

export async function getSessionForGrading(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { sessionId } = req.params
    const session = await prisma.examSession.findUnique({ where:{ id: sessionId }, include:{ student:true, exam:true, answers:{ include:{ question:true }}, events:true }})
    if(!session) throw NotFound('Session not found')
    if(session.exam.teacherId !== req.user.id) throw Forbidden()
    const shortAnswers = session.answers.filter(a=> {
      const t = (a.question as any).type
      return t==='SHORT' || t==='SHORT_ANSWER' || t==='LONG_ANSWER'
    })
    // map
    const items = shortAnswers.map(a=> ({
      answerId: a.id,
      question: { id: a.question.id, text: a.question.text, order:(a.question as any).order, points: a.question.points, type: a.question.type, correctAnswer: (a.question as any).correctAnswer },
      answer: a.answer,
      marksAwarded: a.marksAwarded,
      teacherFeedback: a.teacherFeedback,
      status: !a.gradedAt ? 'Pending' : 'Graded'
    }))
    res.json({ success:true, data:{ session:{ id: session.id, student:{ name: session.student.name, email: session.student.email }, exam:{ title: session.exam.title } }, items }})
  }catch(e){ next(e)}
}

export async function bulkGrade(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { grades } = req.body as { grades:{ answerId:string, marksAwarded:number, feedback?:string }[]}
    if(!Array.isArray(grades) || grades.length===0) throw BadRequest('grades array required')
    let updated = 0
    for(const g of grades){
      const ans = await prisma.answer.findUnique({ where:{ id: g.answerId }, include:{ question:true, session:{ include:{ exam:true } } }})
      if(!ans) continue
      if(ans.session.exam.teacherId !== req.user.id) continue
      if(g.marksAwarded <0 || g.marksAwarded > ans.question.points) continue
      await prisma.answer.update({ where:{ id: g.answerId }, data:{
        marksAwarded: g.marksAwarded,
        teacherFeedback: g.feedback?.slice(0,1000) || null,
        gradedBy: req.user.id,
        gradedAt: new Date()
      }})
      updated++
    }
    res.json({ success:true, data:{ updated }})
  }catch(e){ next(e)}
}


