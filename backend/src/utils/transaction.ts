import { prisma } from './prisma.js'
import { PrismaClient } from '@prisma/client'

/**
 * Transaction wrapper with retry handling for deadlocks.
 * MySQL deadlock error codes: 1213, 1205
 * Prisma error P2034 corresponds to deadlock.
 *
 * Usage:
 *   await withTransaction(async (tx) => {
 *     // tx is Prisma transaction client
 *     await tx.exam.update(...)
 *   })
 */
export type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export async function withTransaction<T>(
  fn: (tx: TxClient) => Promise<T>,
  opts: { maxRetries?: number; timeout?: number; isolationLevel?: string } = {}
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3
  let lastError: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          return fn(tx as unknown as TxClient)
        },
        {
          maxWait: opts.timeout ?? 5000,
          timeout: opts.timeout ?? 15000,
          isolationLevel: (opts.isolationLevel as any) || 'ReadCommitted',
        }
      )
      return result
    } catch (err: any) {
      const msg = String(err?.message || '')
      const code = err?.code || err?.errorCode
      const isDeadlock =
        code === 'P2034' ||
        msg.includes('Deadlock') ||
        msg.includes('deadlock') ||
        msg.includes('1213') ||
        msg.includes('1205') ||
        code === '40001'

      if (isDeadlock && attempt < maxRetries) {
        lastError = err
        const backoff = Math.pow(2, attempt) * 50 + attempt * 10 // deterministic backoff
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }
      throw err
    }
  }
  throw lastError
}

/**
 * Execute raw SAVEPOINT within a transaction.
 * Prisma interactive transaction allows $queryRaw.
 * Example:
 *   await withTransaction(async tx => {
 *     await tx.answer.update(...)
 *     await tx.$executeRaw`SAVEPOINT answer_saved`
 *     try {
 *       await tx.examEvent.create(...)
 *     } catch(e){
 *       await tx.$executeRaw`ROLLBACK TO SAVEPOINT answer_saved`
 *       // handle
 *     }
 *   })
 */
export async function createSavepoint(tx: TxClient, name: string) {
  // Prisma $executeRawUnsafe for MySQL savepoint; for SQLite fallback use same
  try {
    await (tx as any).$executeRawUnsafe(`SAVEPOINT ${name}`)
  } catch {}
}
export async function rollbackToSavepoint(tx: TxClient, name: string) {
  try {
    await (tx as any).$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`)
  } catch {}
}
export async function releaseSavepoint(tx: TxClient, name: string) {
  try {
    await (tx as any).$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`)
  } catch {}
}

/**
 * Row locking helper. For MySQL, SELECT ... FOR UPDATE.
 * Prisma does not expose FOR UPDATE directly, so we use $queryRaw within tx.
 * Provide table and id to lock.
 */
export async function lockRowForUpdate(tx: TxClient, table: string, id: string) {
  try {
    // Use raw query; sanitize table name via whitelist
    const allowed = ['Exam', 'ExamSession', 'IntegrityReview', 'Question', 'Answer', 'User']
    if (!allowed.includes(table)) throw new Error('Invalid table for locking')
    // Convert Prisma model name to actual table name (default is same)
    await (tx as any).$queryRawUnsafe(`SELECT * FROM \`${table}\` WHERE id = ? FOR UPDATE`, id)
  } catch (e) {
    // SQLite does not support FOR UPDATE; ignore gracefully – transaction isolation still protects via serialization
  }
}
