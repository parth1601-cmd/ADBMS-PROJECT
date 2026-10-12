import { Response, NextFunction } from "express"
import { AuthRequest } from "../../middleware/auth.js"
import { listAuditLogs } from "./auditService.js"

export async function getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { actor, action, entity, entityId, search, from, to, page, limit } = req.query as any
    // For teachers, we should scope? For now teacher sees all audit for their exams? But spec says teacher/admin route /teacher/audit-log shows timestamp actor action entity.
    // We'll filter to teacher's scope if needed: only logs where actor is teacher or entity owned by teacher? Simplified: return all but filter to teacher's actions.
    // For TEACHERS, allow full but paginated
    // sanitize numeric params: handle "undefined" string -> NaN -> default
    const p = page && String(page) !== 'undefined' && String(page) !== 'null' ? parseInt(String(page)) : 1
    const l = limit && String(limit) !== 'undefined' && String(limit) !== 'null' ? parseInt(String(limit)) : 20
    const result = await listAuditLogs({
      actorId: actor,
      action: action,
      entityType: entity,
      entityId: entityId,
      search,
      from: from && String(from) !== 'undefined' && String(from) !== 'null' ? new Date(from) : undefined,
      to: to && String(to) !== 'undefined' && String(to) !== 'null' ? new Date(to) : undefined,
      page: Number.isNaN(p) ? 1 : p,
      limit: Number.isNaN(l) ? 20 : l,
    })
    res.json({ success: true, data: result })
  } catch (e) {
    next(e)
  }
}
