// @ts-nocheck
import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../utils/prisma.js'
import { signToken } from '../utils/jwt.js'
import { BadRequest, Unauthorized } from '../utils/errors.js'
import { registerSchema, loginSchema } from '../validators/schemas.js'

export async function register(req: Request, res: Response, next: NextFunction){
  try{
    const data = registerSchema.parse(req.body)
    const exists = await prisma.user.findUnique({ where:{email: data.email}})
    if(exists) throw BadRequest('Email already registered')
    const hash = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({ data:{ name: data.name, email: data.email, passwordHash: hash, role: data.role }})
    const token = signToken({id:user.id, role:user.role, email:user.email})
    res.cookie('token', token, { httpOnly:true, sameSite:'lax', secure: false, maxAge: 7*24*3600*1000 })
    res.status(201).json({ id:user.id, name:user.name, email:user.email, role:user.role, token })
  }catch(e){ next(e)}
}

export async function login(req: Request, res: Response, next: NextFunction){
  try{
    const data = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where:{email: data.email}})
    if(!user) throw Unauthorized('Invalid credentials')
    const ok = await bcrypt.compare(data.password, user.passwordHash)
    if(!ok) throw Unauthorized('Invalid credentials')
    const token = signToken({id:user.id, role:user.role, email:user.email})
    res.cookie('token', token, { httpOnly:true, sameSite:'lax', secure:false, maxAge: 7*24*3600*1000 })
    res.json({ id:user.id, name:user.name, email:user.email, role:user.role, token })
  }catch(e){ next(e)}
}

export async function logout(_req: Request, res: Response){
  res.clearCookie('token')
  res.json({ message:'Logged out'})
}

export async function me(req: any, res: Response, next: NextFunction){
  try{
    if(!req.user) throw Unauthorized()
    const user = await prisma.user.findUnique({ where:{id:req.user.id}, select:{id:true, name:true, email:true, role:true, createdAt:true}})
    if(!user) throw Unauthorized()
    res.json(user)
  }catch(e){ next(e)}
}

