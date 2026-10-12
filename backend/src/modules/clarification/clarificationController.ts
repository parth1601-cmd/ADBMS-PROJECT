// @ts-nocheck
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth.js'
import { prisma } from '../../utils/prisma.js'
import { Forbidden, NotFound, BadRequest } from '../../utils/errors.js'

export async function createClarification(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='STUDENT') throw Forbidden()
    const { reviewId, sessionId, message } = req.body
    if(!message || String(message).trim().length < 10) throw BadRequest('Message must be at least 10 characters')
    if(!reviewId && !sessionId) throw BadRequest('reviewId or sessionId required')
    let review:any = null
    let sid = sessionId
    if(reviewId){
      review = await prisma.integrityReview.findUnique({ where:{ id: reviewId }})
      if(!review) throw NotFound('Review not found')
      sid = review.sessionId
    } else if(sessionId){
      review = await prisma.integrityReview.findUnique({ where:{ sessionId }})
      if(!review) throw NotFound('Review not found for session')
    }
    const session = await prisma.examSession.findUnique({ where:{ id: sid }})
    if(!session || session.studentId !== req.user.id) throw Forbidden()
    // check if clarification already exists pending?
    const existing = await prisma.clarification.findFirst({ where:{ sessionId: sid, studentId: req.user.id, status:'PENDING'}})
    if(existing) throw BadRequest('You already have a pending clarification for this review')
    const clar = await prisma.clarification.create({ data:{
      integrityReviewId: review.id,
      sessionId: sid,
      studentId: req.user.id,
      message: String(message).trim().slice(0,2000),
      status:'PENDING'
    }})
    await prisma.auditLog.create({ data:{ actorId:req.user.id, actorRole:'STUDENT', action:'CLARIFICATION_CREATED', entityType:'Clarification', entityId: clar.id, metadata: JSON.stringify({ reviewId: review.id, sessionId: sid }) }})
    // notify teacher
    const exam = await prisma.exam.findUnique({ where:{ id: session.examId }})
    if(exam){
      await prisma.notification.create({ data:{ userId: exam.teacherId, title:`Student clarification — ${sessionId.slice(0,6)}`, message: `“${String(message).slice(0,80)}...”`, type:'CLARIFICATION', entityId: clar.id }})
    }
    res.status(201).json({ success:true, data: clar })
  }catch(e){ next(e)}
}

function sanitizeC(v:any): string | undefined {
  if (v===undefined || v===null) return undefined
  const s=String(v).trim()
  if (!s || s==='undefined' || s==='null') return undefined
  return s
}
export async function listClarificationsForTeacher(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    let { reviewId, status } = req.query as any
    reviewId = sanitizeC(reviewId); status = sanitizeC(status)
    const teacherId = req.user.id
    const teacherExams = await prisma.exam.findMany({ where:{ teacherId }, select:{ id:true }})
    const examIds = teacherExams.map(e=> e.id)
    // Find sessions for these exams then clarifications
    const sessions = await prisma.examSession.findMany({ where:{ examId:{ in: examIds }}, select:{ id:true }})
    const sids = sessions.map(s=> s.id)
    let where:any = { sessionId:{ in: sids } }
    if(reviewId) where.integrityReviewId = reviewId
    if(status && status!=='All') where.status = status.toUpperCase()
    const clarifications = await prisma.clarification.findMany({ where, include:{ student:true, review:true, session:{ include:{ exam:true }}}, orderBy:{ createdAt:'desc' }})
    res.json({ success:true, data: clarifications.map(c=> ({
      id:c.id, message:c.message, response:c.response, status:c.status, createdAt:c.createdAt, respondedAt:c.respondedAt,
      student:{ id:c.student.id, name:c.student.name, email:c.student.email }, reviewId:c.integrityReviewId, sessionId:c.sessionId, exam:c.session.exam
    }))})
  }catch(e){ next(e)}
}

export async function listClarificationsForStudent(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='STUDENT') throw Forbidden()
    const clarifications = await prisma.clarification.findMany({ where:{ studentId: req.user.id }, include:{ review:true, session:{ include:{ exam:true }}} , orderBy:{ createdAt:'desc' }})
    res.json(clarifications.map(c=> ({
      id:c.id, message:c.message, response:c.response, status:c.status, createdAt:c.createdAt, respondedAt:c.respondedAt, reviewId:c.integrityReviewId, sessionId:c.sessionId, exam:c.session.exam
    })))
  }catch(e){ next(e)}
}

export async function respondClarification(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const { id } = req.params
    const { response } = req.body
    if(!response || String(response).trim().length<5) throw BadRequest('Response required')
    const clar = await prisma.clarification.findUnique({ where:{ id }, include:{ session:{ include:{ exam:true } } }})
    if(!clar) throw NotFound('Clarification not found')
    if(clar.session.exam.teacherId !== req.user.id) throw Forbidden()
    const updated = await prisma.clarification.update({ where:{ id }, data:{
      response: String(response).trim().slice(0,2000),
      respondedBy: req.user.id,
      respondedAt: new Date(),
      status:'RESPONDED'
    }})
    await prisma.auditLog.create({ data:{ actorId:req.user.id, actorRole:'TEACHER', action:'CLARIFICATION_RESPONDED', entityType:'Clarification', entityId: id, metadata: JSON.stringify({ reviewId: clar.integrityReviewId }) }})
    await prisma.notification.create({ data:{ userId: clar.studentId, title:`Teacher responded to your clarification`, message: String(response).slice(0,120), type:'CLARIFICATION_RESPONSE', entityId: id }})
    res.json({ success:true, data: updated })
  }catch(e){ next(e)}
}

export async function getClarification(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const { id } = req.params
    const clar = await prisma.clarification.findUnique({ where:{ id }, include:{ student:true, review:true, session:{ include:{ exam:true, student:true }} }})
    if(!clar) throw NotFound('Clarification not found')
    if(req.user?.role==='STUDENT' && clar.studentId !== req.user!.id) throw Forbidden()
    if(req.user?.role==='TEACHER' && clar.session.exam.teacherId !== req.user!.id) throw Forbidden()
    res.json({ success:true, data: clar })
  }catch(e){ next(e)}
}

