import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import { Unauthorized, Forbidden } from '../utils/errors.js'

export interface AuthRequest extends Request {
  user?: {id:string, role:string, email:string}
}

export function authRequired(req: AuthRequest, _res: Response, next: NextFunction){
  const token = (req.cookies?.token) || (req.headers.authorization?.replace('Bearer ',''))
  if(!token) return next(Unauthorized())
  try{
    const payload = verifyToken(token)
    req.user = payload
    next()
  }catch{
    next(Unauthorized('Invalid token'))
  }
}

export function requireRole(...roles:string[]){
  return (req: AuthRequest, _res:Response, next:NextFunction)=>{
    if(!req.user) return next(Unauthorized())
    if(!roles.includes(req.user.role)) return next(Forbidden('Insufficient role'))
    next()
  }
}
