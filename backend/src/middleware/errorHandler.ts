import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors.js'
import { ZodError } from 'zod'

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction){
  if(err instanceof ZodError){
    return res.status(400).json({ success:false, error: 'Validation error', code:'VALIDATION_ERROR', message:'Validation error', details: err.issues, issues: err.issues })
  }
  if(err instanceof AppError){
    const codeMap:any = {400:'BAD_REQUEST',401:'UNAUTHORIZED',403:'FORBIDDEN',404:'NOT_FOUND',409:'CONFLICT',429:'RATE_LIMITED'}
    const code = codeMap[err.status] || 'ERROR'
    // Dual format: legacy expects `error` string; new spec expects `error.code` etc. We provide both: `error` string for legacy and `code`/`message` for new, plus `errorObj` as object for spec.
    return res.status(err.status).json({ success:false, error: err.message, code, message: err.message, errorObj:{ code, message: err.message } })
  }
  const message = err?.message || 'Internal server error'
  console.error(err)
  const isProd = process.env.NODE_ENV==='production'
  const safeMsg = isProd ? 'Internal server error' : message
  return res.status(500).json({ success:false, error: safeMsg, code:'INTERNAL_ERROR', message: safeMsg })
}
