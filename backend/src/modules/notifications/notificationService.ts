import { prisma } from "../../utils/prisma.js"

export async function createNotification(params: { userId: string; title: string; message: string; type?: string; entityId?: string }) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      entityId: params.entityId,
    }
  })
}

export async function listForUser(userId: string, opts?: { limit?: number; unreadOnly?: boolean }) {
  const where: any = { userId }
  if (opts?.unreadOnly) where.read = false
  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts?.limit || 50
  })
}

export async function markOneRead(userId: string, notificationId: string) {
  const n = await prisma.notification.findUnique({ where: { id: notificationId } })
  if (!n) throw new Error("Not found")
  if (n.userId !== userId) throw new Error("Forbidden")
  return prisma.notification.update({ where: { id: notificationId }, data: { read: true } })
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
}
