import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Testing verification...')
  const report = await prisma.report.findFirst()
  if (!report) { console.log('No report found'); return }
  console.log('ReportId', report.reportId)
  // Simulate verify logic
  const session = report.sessionId ? await prisma.examSession.findUnique({ where: { id: report.sessionId }, include: { exam: true, student: { select: { name: true, email: true } } } }) : null
  console.log('Session', session?.id)
  console.log('Student name only (should not expose email):', session?.student.name)
  console.log('Email should NOT be exposed in verification:', session?.student.email ? 'FOUND but should be hidden!' : 'hidden correctly (not selected)')

  // Check that report metadata version exists
  const meta = report.metadata ? JSON.parse(report.metadata) : {}
  console.log('Version', meta.version)
  console.log('ReportType', report.reportType)

  // Test QR verification URL construction
  const base = 'http://localhost:5173'
  const url = `${base}/verify/report/${report.reportId}`
  console.log('Verification URL', url)

  // Test that reportId persistent
  const second = await prisma.report.findUnique({ where: { reportId: report.reportId } })
  console.log('Second fetch same reportId:', second?.reportId === report.reportId ? 'OK' : 'FAIL')
}

main().finally(() => prisma.$disconnect())
