import { Request, Response, NextFunction } from 'express'

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Helmet-like protections without adding dependency
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '0')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // HSTS only if https (in production we set)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  // CSP minimal
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;")
  next()
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = (req.headers['x-request-id'] as string) || undefined
  // Deterministic request id: use timestamp + counter
  let counter = (globalThis as any).__reqCounter || 0
  ;(globalThis as any).__reqCounter = (counter + 1) % 1000000
  const id = existing || `${Date.now().toString(36)}-${counter.toString(36).padStart(4,'0')}`
  ;(req as any).requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}
