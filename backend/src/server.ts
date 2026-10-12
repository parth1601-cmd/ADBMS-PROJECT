import app from './app.js'
import { prisma } from './utils/prisma.js'
const PORT = Number(process.env.PORT) || 4000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const server = app.listen(PORT, ()=> {
  console.log(`✅ ExamGuard backend running on http://localhost:${PORT}`)
  console.log(`   Frontend allowed: ${FRONTEND_URL}`)
})

async function gracefulShutdown(signal: string){
  console.log(`Received ${signal}, shutting down gracefully...`)
  server.close(async ()=>{
    try{ await prisma.$disconnect() }catch{}
    console.log('HTTP server closed, DB disconnected')
    process.exit(0)
  })
  setTimeout(()=> process.exit(1), 10000)
}
process.on('SIGTERM', ()=> gracefulShutdown('SIGTERM'))
process.on('SIGINT', ()=> gracefulShutdown('SIGINT'))
