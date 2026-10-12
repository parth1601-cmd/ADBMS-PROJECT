import { prisma } from "../../utils/prisma.js"

export type AuditParams = {
  actorId: string
  actorRole: string
  action: string
  entityType: string
  entityId: string
  metadata?: any
  ipAddress?: string
}

export async function logAudit(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action as any,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata).slice(0, 2000) : null,
        ipAddress: params.ipAddress || null,
      }
    })
  } catch (e) {
    // do not crash on audit failure
    console.error("Audit log failed", e)
  }
}

const VALID_AUDIT_ACTIONS = new Set([
  "EXAM_CREATED","EXAM_UPDATED","EXAM_PUBLISHED","EXAM_UNPUBLISHED","QUESTION_CREATED","QUESTION_UPDATED","QUESTION_DELETED","REVIEW_OPENED","REVIEW_STATUS_CHANGED","REVIEW_NOTE_ADDED","REVIEW_NOTE_UPDATED","REVIEW_ASSIGNED","REPORT_GENERATED","REPORT_DOWNLOADED","STUDENT_RESULT_VIEWED","PDF_DOWNLOADED","LOGIN","LOGOUT","EXAM_STARTED","EXAM_SUBMITTED","SESSION_EXPIRED","EXAM_ARCHIVED","QUESTION_REORDERED","HEARTBEAT_RECEIVED","ANNOUNCEMENT_SENT","CLARIFICATION_CREATED","CLARIFICATION_RESPONDED","GRADE_UPDATED","LIVE_VIEWED"
])

function sanitizeString(v?: string): string | undefined {
  if (!v) return undefined
  const s = String(v).trim()
  if (!s || s === "undefined" || s === "null") return undefined
  return s
}

export async function listAuditLogs(opts: {
  actorId?: string
  action?: string
  entityType?: string
  entityId?: string
  search?: string
  from?: Date
  to?: Date
  page?: number
  limit?: number
}) {
  // sanitize string params that may arrive as "undefined" due to frontend bug
  opts.actorId = sanitizeString(opts.actorId)
  opts.action = sanitizeString(opts.action)
  opts.entityType = sanitizeString(opts.entityType)
  opts.entityId = sanitizeString(opts.entityId)
  opts.search = sanitizeString(opts.search)
  // validate action enum to prevent Prisma 500
  if (opts.action && !VALID_AUDIT_ACTIONS.has(opts.action)) {
    // invalid action value -> ignore filter instead of throwing
    opts.action = undefined
  }

  const where: any = {}
  if (opts.actorId) where.actorId = opts.actorId
  if (opts.action) where.action = opts.action
  if (opts.entityType) where.entityType = opts.entityType
  if (opts.entityId) where.entityId = opts.entityId
  if (opts.from || opts.to) {
    where.createdAt = {}
    if (opts.from) where.createdAt.gte = opts.from
    if (opts.to) where.createdAt.lte = opts.to
  }

  // search across metadata? For now filter after fetch if search provided
  const page = Math.max(1, opts.page || 1)
  const limit = Math.min(100, Math.max(1, opts.limit || 20))
  const skip = (page - 1) * limit

  let allWhere = where
  const total = await prisma.auditLog.count({ where: allWhere })
  let logs = await prisma.auditLog.findMany({ where: allWhere, orderBy: { createdAt: "desc" }, skip, take: limit })

  if (opts.search) {
    const s = opts.search.toLowerCase()
    logs = logs.filter(l => (l.entityId.toLowerCase().includes(s) || l.entityType.toLowerCase().includes(s) || (l.metadata && l.metadata.toLowerCase().includes(s)) || l.action.toLowerCase().includes(s)))
  }

  // enrich with actor name - handle empty and nullable actorId
  const actorIds = [...new Set(logs.map(l => l.actorId).filter(Boolean) as string[])]
  let actors: any[] = []
  if(actorIds.length > 0){
    actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
  }
  const actorMap = new Map(actors.map(a => [a.id, a]))

  const enriched = logs.map(l => ({
    id: l.id,
    actorId: l.actorId,
    actor: actorMap.get(l.actorId) || null,
    actorRole: l.actorRole,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata ? JSON.parse(l.metadata) : null,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt,
  }))

  return { logs: enriched, total, page, limit, totalPages: Math.ceil(total / limit) }
}
