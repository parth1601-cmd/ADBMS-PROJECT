// @ts-nocheck
import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export async function listStudents(req: AuthRequest, res: Response, next: NextFunction){
  try{
    // teachers can list students; students can only see themselves? For now return all students
    const students = await prisma.user.findMany({ where:{role:'STUDENT'}, select:{id:true,name:true,email:true,createdAt:true}, take:100 })
    res.json(students)
  }catch(e){ next(e)}
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const { name } = req.body
    if(!name || typeof name!=='string' || name.trim().length<2) return res.status(400).json({error:'Name required'})
    const updated = await prisma.user.update({ where:{id:req.user!.id}, data:{name: name.trim()}})
    res.json({id:updated.id, name:updated.name, email:updated.email, role:updated.role})
  }catch(e){ next(e)}
}

export async function getSettings(req: AuthRequest, res: Response, next: NextFunction){
  try{
    // simple settings: return user + exam defaults
    const user = await prisma.user.findUnique({ where:{id:req.user!.id}, select:{id:true,name:true,email:true,role:true}})
    res.json({ user, examDefaults:{ durationMinutes:60, attemptsAllowed:1 }, thresholds:{ normal:30, low:60, high:80 }})
  }catch(e){ next(e)}
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction){
  try{
    // placeholder: accept and return
    res.json({message:'Settings updated', data: req.body})
  }catch(e){ next(e)}
}

