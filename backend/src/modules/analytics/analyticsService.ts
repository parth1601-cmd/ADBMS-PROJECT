import { prisma } from "../../utils/prisma.js"

function sanitizeDateInput(v:any): string | undefined {
  if (v===undefined || v===null) return undefined
  const s=String(v).trim()
  if (!s || s==='undefined' || s==='null') return undefined
  return s
}
export function parseDateRange(query: any): { from?: Date; to?: Date } {
  const now = new Date()
  let range = sanitizeDateInput(query.range || query.period)
  let fromQ = sanitizeDateInput(query.from || query.startDate || query.start)
  let toQ = sanitizeDateInput(query.to || query.endDate || query.end)

  if (fromQ && toQ) {
    const f=new Date(fromQ), t=new Date(toQ)
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return {}
    return { from: f, to: t }
  }
  if (fromQ && !toQ) {
    const f=new Date(fromQ)
    if (isNaN(f.getTime())) return {}
    return { from: f }
  }
  if (range) {
    const r = String(range).toLowerCase()
    if (r === "today") {
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      const end = new Date(now); end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    }
    if (r === "last7days" || r === "7d" || r === "last_7_days") {
      return { from: new Date(now.getTime() - 7 * 24 * 3600000) }
    }
    if (r === "last30days" || r === "30d") {
      return { from: new Date(now.getTime() - 30 * 24 * 3600000) }
    }
    if (r === "month" || r === "this_month" || r === "thismonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: start }
    }
    if (r === "year" || r === "academic_year" || r === "this_academic_year") {
      // academic year from Apr 1? Simplified Jan 1
      const start = new Date(now.getFullYear(), 0, 1)
      return { from: start }
    }
  }
  return {}
}
