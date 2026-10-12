// @ts-nocheck
import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { NotFound, Forbidden } from '../utils/errors.js'
import { questionCreateSchema, questionUpdateSchema } from '../validators/schemas.js'

async function ensureTeacherOwnsExam(req: AuthRequest, examId:string){
  const ex = await prisma.exam.findUnique({ where:{id:examId}})
  if(!ex) throw NotFound('Exam not found')
  if(ex.teacherId!==req.user!.id) throw Forbidden()
  return ex
}

export async function listQuestions(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const { id } = req.params // examId
    const exam = await prisma.exam.findUnique({ where:{id}})
    if(!exam) throw NotFound()
    // students should not get correctAnswer
    const qs = await prisma.question.findMany({ where:{examId:id}, orderBy:{order:'asc'}})
    if(req.user?.role==='STUDENT'){
      const sanitized = qs.map(q=> ({ id:q.id, examId:q.examId, type:q.type, text:q.text, order:q.order, points:q.points, required:q.required, options: q.options? JSON.parse(q.options): null }))
      return res.json(sanitized)
    }
    const full = qs.map(q=> ({ id:q.id, examId:q.examId, type:q.type, text:q.text, order:q.order, points:q.points, required:q.required, options: q.options? JSON.parse(q.options): null, correctAnswer: q.correctAnswer }))
    res.json(full)
  }catch(e){ next(e)}
}

export async function createQuestion(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const { id } = req.params
    await ensureTeacherOwnsExam(req, id)
    const data = questionCreateSchema.parse(req.body)
    const count = await prisma.question.count({ where:{examId:id}})
    const order = data.order ?? count+1
    const q = await prisma.question.create({ data:{
      examId:id, type: data.type, text: data.text, points: data.points, required: data.required??true, options: data.options? JSON.stringify(data.options): null, correctAnswer: data.correctAnswer, order
    }})
    res.status(201).json(q)
  }catch(e){ next(e)}
}

export async function updateQuestion(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const q = await prisma.question.findUnique({ where:{id:req.params.id}, include:{exam:true}})
    if(!q) throw NotFound()
    if(q.exam.teacherId!==req.user!.id) throw Forbidden()
    const data = questionUpdateSchema.parse(req.body)
    const updated = await prisma.question.update({ where:{id:req.params.id}, data:{
      type: data.type as any, text: data.text, points: data.points, required: data.required, options: data.options? JSON.stringify(data.options): undefined, correctAnswer: data.correctAnswer, order: data.order
    }})
    res.json(updated)
  }catch(e){ next(e)}
}

export async function deleteQuestion(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const q = await prisma.question.findUnique({ where:{id:req.params.id}, include:{exam:true}})
    if(!q) throw NotFound()
    if(q.exam.teacherId!==req.user!.id) throw Forbidden()
    await prisma.question.delete({ where:{id:req.params.id}})
    res.json({message:'Deleted'})
  }catch(e){ next(e)}
}

export async function reorderQuestions(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const { id } = req.params
    await ensureTeacherOwnsExam(req, id)
    const { order } = req.body as {order: string[]} // array of questionIds in new order
    if(!Array.isArray(order)) throw new Error('order must be array')
    const result = await prisma.$transaction(async (tx)=>{
      // Lock relevant questions FOR UPDATE to avoid duplicate order numbers during concurrent reorders
      try { await (tx as any).$queryRawUnsafe(`SELECT * FROM \`Question\` WHERE examId = ? FOR UPDATE`, id) } catch {}
      const existing = await tx.question.findMany({ where:{examId:id}})
      const existingIds = new Set(existing.map(q=>q.id))
      if(order.some(oid=> !existingIds.has(oid))) throw new Error('Invalid question id in order')
      // Use temporary offset to avoid unique constraint collision on (examId, order)
      const tempOffset = 10000
      for(let i=0;i<order.length;i++){
        await tx.question.update({ where:{id:order[i]}, data:{order: tempOffset + i + 1}})
      }
      for(let i=0;i<order.length;i++){
        await tx.question.update({ where:{id:order[i]}, data:{order: i + 1}})
      }
      await tx.auditLog.create({ data:{ actorId:req.user!.id, actorRole:'TEACHER', action:'QUESTION_REORDERED', entityType:'Exam', entityId:id, metadata: JSON.stringify({order}), ipAddress:req.ip }})
      return tx.question.findMany({ where:{examId:id}, orderBy:{order:'asc'}})
    })
    res.json(result)
  }catch(e){ next(e)}
}

