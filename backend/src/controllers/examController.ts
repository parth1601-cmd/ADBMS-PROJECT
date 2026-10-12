// @ts-nocheck
import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { NotFound, Forbidden, BadRequest } from '../utils/errors.js'
import { examCreateSchema, examUpdateSchema } from '../validators/schemas.js'
import { publishExamTransaction, unpublishExamTransaction, canTransitionExam } from '../services/examService.js'
import { withTransaction } from '../utils/transaction.js'

export async function listExams(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const { search, status, teacherId } = req.query as any
    const where: any = {}
    if(search) where.OR = [{title:{contains:search}}, {subject:{contains:search}}]
    if(status && status!=='All') where.status = status.toUpperCase()
    if(req.user?.role==='TEACHER'){
      // teachers see their own plus allow filtering
      where.teacherId = req.user.id
    } else if(teacherId){
      where.teacherId = teacherId
    }
    // For students, we will handle via student route, but this endpoint also supports
    const exams = await prisma.exam.findMany({ where, orderBy:{createdAt:'desc'}, include:{_count:{select:{questions:true, sessions:true}}}})
    // enrich with counts
    const enriched = await Promise.all(exams.map(async e=>{
      const questionsCount = e._count.questions
      const sessions = await prisma.examSession.findMany({ where:{examId:e.id}})
      const submissionsCount = sessions.filter(s=> s.status==='SUBMITTED').length
      const pendingReviews = await prisma.integrityReview.count({ where:{ session:{examId:e.id}, status:'PENDING'}})
      return {
        id:e.id, title:e.title, description:e.description, subject:e.subject, teacherId:e.teacherId,
        status: mapStatus(e.status), durationMinutes:e.durationMinutes, startAt:e.startAt, endAt:e.endAt, attemptsAllowed:e.attemptsAllowed, instructions:e.instructions,
        questionsCount, studentsCount: sessions.length, submissionsCount, pendingReviews, createdAt:e.createdAt, updatedAt:e.updatedAt
      }
    }))
    res.json(enriched)
  }catch(e){ next(e)}
}
function mapStatus(s:string){ // prisma enum to frontend string
  if(s==='DRAFT') return 'Draft'
  if(s==='SCHEDULED') return 'Scheduled'
  if(s==='LIVE') return 'Live'
  if(s==='COMPLETED') return 'Completed'
  if(s==='PUBLISHED') return 'Published'
  if(s==='UNPUBLISHED') return 'Unpublished'
  if(s==='ARCHIVED') return 'Archived'
  return s
}
function toPrismaStatus(s:string){
  const u=s.toUpperCase()
  if(['DRAFT','SCHEDULED','LIVE','COMPLETED','PUBLISHED','UNPUBLISHED','ARCHIVED'].includes(u)) return u as any
  return 'DRAFT'
}

export async function getExam(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const ex = await prisma.exam.findUnique({ where:{id:req.params.id}, include:{_count:{select:{questions:true, sessions:true}}}})
    if(!ex) throw NotFound('Exam not found')
    if(req.user?.role==='TEACHER' && ex.teacherId!==req.user.id) throw Forbidden()
    const sessions = await prisma.examSession.findMany({ where:{examId: ex.id}})
    const pendingReviews = await prisma.integrityReview.count({ where:{ session:{examId: ex.id}, status:'PENDING'}})
    res.json({
      id:ex.id, title:ex.title, description:ex.description, subject:ex.subject, teacherId:ex.teacherId,
      status:mapStatus(ex.status), durationMinutes:ex.durationMinutes, startAt:ex.startAt, endAt:ex.endAt, attemptsAllowed:ex.attemptsAllowed, instructions:ex.instructions,
      questionsCount: ex._count.questions, studentsCount: sessions.length, submissionsCount: sessions.filter(s=> s.status==='SUBMITTED').length, pendingReviews
    })
  }catch(e){ next(e)}
}

export async function createExam(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const data = examCreateSchema.parse(req.body)
    // Explicit field selection - mass assignment protection (never do update(req.body))
    const allowedFields = ['title','description','subject','className','section','academicYear','durationMinutes','totalMarks','passingMarks','startAt','endAt','instructions','attemptsAllowed','status'] as const
    // Validate business rules: duration >0, passing <= total, start < end
    if(data.durationMinutes <=0) throw BadRequest('durationMinutes must be >0')
    if(data.passingMarks !== undefined && data.totalMarks !== undefined && data.passingMarks > data.totalMarks) throw BadRequest('passingMarks cannot exceed totalMarks')
    if(data.startAt && data.endAt && new Date(data.startAt) >= new Date(data.endAt)) throw BadRequest('startAt must be before endAt')
    // Use transaction for creation + audit + eligibility
    const ex = await withTransaction(async (tx)=>{
      const created = await tx.exam.create({ data:{
        title: data.title, description: data.description||'', subject: data.subject, className: (data as any).className || null, section: (data as any).section || null, academicYear: (data as any).academicYear || null,
        teacherId: req.user!.id,
        durationMinutes: data.durationMinutes, totalMarks: (data as any).totalMarks || 0, passingMarks: (data as any).passingMarks || 0,
        startAt: data.startAt? new Date(data.startAt): null, endAt: data.endAt? new Date(data.endAt): null,
        instructions: data.instructions || null, attemptsAllowed: data.attemptsAllowed||1, status: toPrismaStatus(data.status||'DRAFT')
      }})
      await tx.auditLog.create({ data:{ actorId:req.user!.id, actorRole:'TEACHER', action:'EXAM_CREATED', entityType:'Exam', entityId:created.id, metadata: JSON.stringify({title: created.title}), ipAddress:req.ip }})
      // If className/section provided, create eligibility entry
      if(created.className){
        await tx.examEligibility.create({ data:{ examId: created.id, className: created.className, section: created.section, academicYear: created.academicYear }})
      }
      return created
    })
    res.status(201).json(ex)
  }catch(e){ next(e)}
}

export async function updateExam(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const ex = await prisma.exam.findUnique({ where:{id:req.params.id}})
    if(!ex) throw NotFound()
    if(ex.teacherId!==req.user!.id) throw Forbidden()
    const data = examUpdateSchema.parse(req.body)
    // Mass assignment protection: only allowed fields
    const allowed: any = {}
    if(data.title !== undefined) allowed.title = data.title
    if(data.description !== undefined) allowed.description = data.description
    if(data.subject !== undefined) allowed.subject = data.subject
    if((data as any).className !== undefined) allowed.className = (data as any).className
    if((data as any).section !== undefined) allowed.section = (data as any).section
    if((data as any).academicYear !== undefined) allowed.academicYear = (data as any).academicYear
    if(data.durationMinutes !== undefined) {
      if(data.durationMinutes <=0) throw BadRequest('durationMinutes must be >0')
      allowed.durationMinutes = data.durationMinutes
    }
    if((data as any).totalMarks !== undefined) allowed.totalMarks = (data as any).totalMarks
    if((data as any).passingMarks !== undefined) allowed.passingMarks = (data as any).passingMarks
    if(data.startAt !== undefined) allowed.startAt = data.startAt? new Date(data.startAt as string): null
    if(data.endAt !== undefined) allowed.endAt = data.endAt? new Date(data.endAt as string): null
    if(data.instructions !== undefined) allowed.instructions = data.instructions
    if(data.attemptsAllowed !== undefined) allowed.attemptsAllowed = data.attemptsAllowed
    if(data.status !== undefined){
      if(!canTransitionExam(ex.status, toPrismaStatus(data.status))) throw BadRequest(`Invalid status transition ${ex.status} -> ${data.status}`)
      allowed.status = toPrismaStatus(data.status)
    }
    // Optimistic concurrency: check version if provided
    const version = (req.body as any).version
    const updated = await withTransaction(async (tx)=>{
      if(version !== undefined){
        const fresh: any = await tx.exam.findUnique({ where:{id:req.params.id}})
        if(fresh.version !== version) throw Object.assign(new Error('Conflict: exam was modified by another request'), { status: 409 })
        allowed.version = { increment: 1 }
      } else {
        allowed.version = { increment: 1 }
      }
      const u = await tx.exam.update({ where:{id:req.params.id}, data: allowed})
      await tx.auditLog.create({ data:{ actorId:req.user!.id, actorRole:'TEACHER', action:'EXAM_UPDATED', entityType:'Exam', entityId:u.id, metadata: JSON.stringify({updated: Object.keys(allowed)}), ipAddress:req.ip }})
      return u
    })
    res.json(updated)
  }catch(e){ next(e)}
}

export async function deleteExam(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const ex = await prisma.exam.findUnique({ where:{id:req.params.id}})
    if(!ex) throw NotFound()
    if(ex.teacherId!==req.user!.id) throw Forbidden()
    if(ex.status!=='DRAFT') throw BadRequest('Only draft exams can be deleted')
    await prisma.exam.delete({ where:{id:req.params.id}})
    res.json({message:'Deleted'})
  }catch(e){ next(e)}
}

export async function publishExam(req: AuthRequest, res: Response, next: NextFunction){
  try{
    if(req.user?.role!=='TEACHER') throw Forbidden()
    const ex: any = await prisma.exam.findUnique({ where:{id:req.params.id}})
    if(!ex) throw NotFound()
    if(ex.teacherId!==req.user!.id) throw Forbidden()
    // Determine target status: if currently draft/unpublished -> publish, if published/live -> unpublish (toggle), but with validation
    const isPublished = ['PUBLISHED','LIVE','SCHEDULED'].includes(ex.status)
    if(isPublished){
      // Unpublish flow with active session check
      const updated = await unpublishExamTransaction(ex.id, req.user!.id, req.ip)
      return res.json(updated)
    } else {
      const updated = await publishExamTransaction(ex.id, req.user!.id, req.ip)
      return res.json(updated)
    }
  }catch(e){ next(e)}
}

