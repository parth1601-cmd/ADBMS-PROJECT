import { Request, Response, NextFunction } from "express"

type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

export function rateLimit(opts: { windowMs: number; max: number; keyGenerator?: (req: Request) => string }) {
  const windowMs = opts.windowMs
  const max = opts.max
  const keyGen = opts.keyGenerator || ((req: Request) => (req as any).user?.id || req.ip || "anon")

  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyGen(req)}:${req.path}`
    const now = Date.now()
    let entry = store.get(key)
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(key, entry)
    }
    entry.count++
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      res.setHeader("Retry-After", String(retryAfter))
      return res.status(429).json({ success: false, error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." } })
    }
    next()
  }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt) store.delete(k)
  }
}, 60_000).unref()
