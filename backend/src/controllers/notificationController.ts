// @ts-nocheck
import { Response, NextFunction } from 'express'
import { prisma } from '../utils/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const notifs = await prisma.notification.findMany({ where:{userId: req.user!.id}, orderBy:{createdAt:'desc'}, take:20})
    res.json(notifs)
  }catch(e){ next(e)}
}
export async function markRead(req: AuthRequest, res: Response, next: NextFunction){
  try{
    await prisma.notification.updateMany({ where:{userId: req.user!.id, read:false}, data:{read:true}})
    res.json({message:'Marked read'})
  }catch(e){ next(e)}
}

