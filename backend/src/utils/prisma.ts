import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn','error'] : ['error'],
})
// Connection pool: Prisma manages pool internally (default  connection_limit from DATABASE_URL + ?connection_limit=5)
// For MySQL, add ?connection_limit=10&pool_timeout=10 to DATABASE_URL if needed
prisma.$connect().catch(e=> console.error('Prisma connect failed', e))
