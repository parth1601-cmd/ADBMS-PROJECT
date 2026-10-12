// @ts-nocheck
import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export async function search(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const q = (req.query.q as string || '').toLowerCase()
    if(!q) return res.json({exams:[], students:[], reviews:[]})
    let exams: any[] = []
    let students: any[]=[]
    let reviews: any[]=[]
    if(req.user!.role==='TEACHER'){
      exams = await prisma.exam.findMany({ where:{ teacherId: req.user!.id, OR:[{title:{contains:q, mode:'insensitive'}},{subject:{contains:q, mode:'insensitive'}}]}, take:5 })
      students = await prisma.user.findMany({ where:{ role:'STUDENT', OR:[{name:{contains:q, mode:'insensitive'}},{email:{contains:q, mode:'insensitive'}}]}, take:5, select:{id:true,name:true,email:true}})
      const allReviews = await prisma.integrityReview.findMany({ where:{ session:{exam:{teacherId: req.user!.id}}}, include:{session:{include:{student:true, exam:true}}}, take:20 })
      reviews = allReviews.filter(r=> r.session.student.name.toLowerCase().includes(q) || r.session.exam.title.toLowerCase().includes(q)).slice(0,5)
    } else {
      exams = await prisma.exam.findMany({ where:{ OR:[{title:{contains:q}}]}, take:5 })
    }
    res.json({exams, students, reviews})
  }catch(e){ next(e)}
}

