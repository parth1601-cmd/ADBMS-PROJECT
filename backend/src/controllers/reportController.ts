// @ts-nocheck
import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export async function overview(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const teacherId = req.user!.id
    const exams = await prisma.exam.findMany({ where:{teacherId}})
    const examIds = exams.map(e=>e.id)
    const totalStudents = await prisma.user.count({ where:{role:'STUDENT'}})
    const sessions = await prisma.examSession.findMany({ where:{examId:{in: examIds}}})
    const reviews = await prisma.integrityReview.findMany({ where:{ session:{examId:{in: examIds}}}})
    const pending = reviews.filter(r=> r.status==='PENDING').length
    const reviewed = reviews.filter(r=> r.status==='REVIEWED').length
    const distro = {
      NORMAL: reviews.filter(r=> r.level==='NORMAL').length,
      LOW_CONCERN: reviews.filter(r=> r.level==='LOW_CONCERN').length,
      REQUIRES_REVIEW: reviews.filter(r=> r.level==='REQUIRES_REVIEW').length,
      HIGH_PRIORITY_REVIEW: reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW').length,
    }
    const examReports = await Promise.all(exams.map(async e=>{
      const qCount = await prisma.question.count({where:{examId:e.id}})
      const sCount = await prisma.examSession.count({where:{examId:e.id}})
      const subCount = await prisma.examSession.count({where:{examId:e.id, status:'SUBMITTED'}})
      const avgScore = await prisma.integrityReview.aggregate({ where:{session:{examId:e.id}}, _avg:{score:true}})
      return { id:e.id, title:e.title, subject:e.subject, status:e.status, questionsCount:qCount, studentsCount:sCount, submissionsCount:subCount, pending: await prisma.integrityReview.count({where:{session:{examId:e.id}, status:'PENDING'}}), avgScore: avgScore._avg.score || 0 }
    }))
    res.json({ activeExams: exams.filter(e=> e.status==='LIVE' || e.status==='SCHEDULED').length, totalStudents, pendingReviews: pending, completedReviews: reviewed, distribution: distro, exams: examReports, reviewsOverTime: [], signalFrequency: [] })
  }catch(e){ next(e)}
}

export async function examReport(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const exam = await prisma.exam.findUnique({ where:{id:req.params.id}})
    if(!exam) return res.status(404).json({error:'Exam not found'})
    if(exam.teacherId!==req.user!.id) return res.status(403).json({error:'Forbidden'})
    const reviews = await prisma.integrityReview.findMany({ where:{ session:{examId: exam.id}}})
    const sessions = await prisma.examSession.findMany({ where:{examId: exam.id}})
    res.json({
      exam: {id:exam.id, title:exam.title},
      completion: sessions.length? Math.round(sessions.filter(s=> s.status==='SUBMITTED').length / sessions.length *100):0,
      submissionRate: sessions.length,
      avgScore: reviews.length? Math.round(reviews.reduce((s,r)=> s+r.score,0)/reviews.length):0,
      distribution: {
        NORMAL: reviews.filter(r=> r.level==='NORMAL').length,
        LOW_CONCERN: reviews.filter(r=> r.level==='LOW_CONCERN').length,
        REQUIRES_REVIEW: reviews.filter(r=> r.level==='REQUIRES_REVIEW').length,
        HIGH_PRIORITY_REVIEW: reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW').length,
      }
    })
  }catch(e){ next(e)}
}

