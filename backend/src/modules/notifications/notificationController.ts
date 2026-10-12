// @ts-nocheck
import { Response, NextFunction } from "express"
import { AuthRequest } from "../../middleware/auth.js"
import { prisma } from "../../utils/prisma.js"

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const { limit, unread, wrapped } = req.query as any
    const notifs = await prisma.notification.findMany({
      where: { userId: req.user!.id, ...(unread==='true' ? { read:false } : {}) },
      orderBy:{createdAt:'desc'},
      take: limit? parseInt(limit): 50
    })
    if(wrapped==='true') return res.json({ success:true, data: notifs })
    // For backward compatibility, old TeacherLayout does api.get<any[]>('/notifications') expecting plain array.
    // Return plain array if not explicitly wrapped.
    res.json(notifs)
  }catch(e){ next(e) }
}

export async function getNotificationsLegacy(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const notifs = await prisma.notification.findMany({ where:{userId: req.user!.id}, orderBy:{createdAt:'desc'}, take:20})
    res.json(notifs) // legacy plain array for old frontend
  }catch(e){ next(e)}
}

export async function markOneRead(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const id = req.params.id
    const n = await prisma.notification.findUnique({ where:{id}})
    if(!n) return res.status(404).json({ success:false, error:{code:'NOT_FOUND', message:'Not found'}})
    if(n.userId!==req.user!.id) return res.status(403).json({ success:false, error:{code:'FORBIDDEN', message:'Forbidden'}})
    const updated = await prisma.notification.update({ where:{id}, data:{read:true}})
    res.json({ success:true, data: updated })
  }catch(e){ next(e)}
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction){
  try{
    await prisma.notification.updateMany({ where:{userId: req.user!.id, read:false}, data:{read:true}})
    res.json({ success:true, data:{ message:'Marked read'}})
  }catch(e){ next(e)}
}

export async function markAllReadLegacy(req: AuthRequest, res: Response, next: NextFunction){
  try{
    await prisma.notification.updateMany({ where:{userId: req.user!.id, read:false}, data:{read:true}})
    res.json({ message:'Marked read'})
  }catch(e){ next(e)}
}
