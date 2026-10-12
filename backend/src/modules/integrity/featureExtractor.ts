import { prisma } from "../../utils/prisma.js"
import type { ExtractedFeatures } from "./integrityTypes.js"

export async function extractFeatures(sessionId: string): Promise<ExtractedFeatures> {
  const session = await prisma.examSession.findUnique({ where: { id: sessionId }, include: { exam: true } })
  if (!session) throw new Error("Session not found")

  const answers = await prisma.answer.findMany({ where: { sessionId }, include: { question: true } })
  const events = await prisma.examEvent.findMany({ where: { sessionId }, orderBy: { timestamp: "asc" } })
  const questions = await prisma.question.findMany({ where: { examId: session.examId }, orderBy: { order: "asc" } })
  const questionOrderMap = new Map<string, number>()
  const questionTypeMap = new Map<string, string>()
  for (const q of questions) {
    questionOrderMap.set(q.id, q.order)
    questionTypeMap.set(q.id, q.type)
  }

  // Timing: compute response times from firstAnsweredAt differences
  const sortedAnswers = [...answers].sort((a, b) => a.firstAnsweredAt.getTime() - b.firstAnsweredAt.getTime())
  const start = session.startedAt
  const responseTimes: { questionId: string; order: number; sec: number }[] = []
  let totalSec = 0
  for (let i = 0; i < sortedAnswers.length; i++) {
    const a = sortedAnswers[i]
    const prevTime = i === 0 ? start : sortedAnswers[i - 1].firstAnsweredAt
    let sec = Math.round((a.firstAnsweredAt.getTime() - prevTime.getTime()) / 1000)
    // deterministic fallback when sec is 0 or negative (simultaneous)
    if (sec < 1) sec = 5 + (i % 4) * 12 // produces 5,17,29,41 pattern deterministic
    if (sec > 600) sec = 120
    responseTimes.push({ questionId: a.questionId, order: questionOrderMap.get(a.questionId) || i + 1, sec })
    totalSec += sec
  }
  const secs = responseTimes.map(r => r.sec)
  const fastest = secs.length ? Math.min(...secs) : 0
  const slowest = secs.length ? Math.max(...secs) : 0
  const avg = secs.length ? Math.round(totalSec / secs.length) : 0
  const sortedSecs = [...secs].sort((a, b) => a - b)
  const median = sortedSecs.length ? sortedSecs[Math.floor(sortedSecs.length / 2)] : 0

  const tabSwitches = events.filter(e => e.eventType === "TAB_HIDDEN").length
  const windowBlurs = events.filter(e => (e as any).eventType === "WINDOW_BLUR").length
  const totalWindowEvents = tabSwitches + windowBlurs

  const copyCount = events.filter(e => e.eventType === "COPY").length
  const pasteCount = events.filter(e => e.eventType === "PASTE").length
  const copyPasteCount = copyCount + pasteCount

  const answerChangeCount = answers.reduce((s, a) => s + (a.changeCount || 0), 0)
  const questionOpenCount = events.filter(e => (e as any).eventType === "QUESTION_OPENED").length
  const reconnectCount = events.filter(e => e.eventType === "SESSION_STARTED").length - 1 // first is original start
  const safeReconnect = Math.max(0, reconnectCount)

  const eventCounts: Record<string, number> = {}
  for (const ev of events) eventCounts[ev.eventType] = (eventCounts[ev.eventType] || 0) + 1

  // Estimate focus loss: each hidden -> visible pair approx 8s, blur approx 5s deterministic
  const totalFocusLossSec = tabSwitches * 8 + windowBlurs * 5

  // Heartbeat gap analysis: compute gaps between SESSION_HEARTBEAT events
  const heartbeatEvents = events.filter(e=> e.eventType === "SESSION_HEARTBEAT").sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  let heartbeatGaps: { gapSec:number, from:Date, to:Date }[] = []
  let maxGapSec = 0
  let totalGapSec = 0
  for(let i=1;i<heartbeatEvents.length;i++){
    const prev = new Date(heartbeatEvents[i-1].timestamp).getTime()
    const cur = new Date(heartbeatEvents[i].timestamp).getTime()
    const gap = Math.round((cur - prev)/1000)
    // Expected heartbeat interval 30s, gap >60s considered unaccounted
    if(gap > 60){
      heartbeatGaps.push({ gapSec: gap, from: heartbeatEvents[i-1].timestamp as Date, to: heartbeatEvents[i].timestamp as Date })
      totalGapSec += gap
      if(gap > maxGapSec) maxGapSec = gap
    }
  }
  // Also consider gaps indicated by HEARTBEAT_GAP events (server recorded)
  const gapEvents = events.filter(e=> e.eventType === "HEARTBEAT_GAP")
  for(const ge of gapEvents){
    try{
      const meta = ge.metadata ? JSON.parse(ge.metadata) : null
      if(meta?.gapSec){
        const gap = Number(meta.gapSec)
        if(!heartbeatGaps.some(g=> Math.abs(g.gapSec - gap) <5)){
          heartbeatGaps.push({ gapSec: gap, from: ge.timestamp as Date, to: ge.timestamp as Date })
          if(gap>maxGapSec) maxGapSec=gap
          totalGapSec += gap
        }
      }
    }catch{}
  }

  // Fullscreen exits
  const fullscreenExits = events.filter(e=> e.eventType === "FULLSCREEN_EXITED").length
  const fullscreenEnters = events.filter(e=> e.eventType === "FULLSCREEN_ENTERED").length
  // Connection anomalies
  const connectionLost = events.filter(e=> e.eventType === "CONNECTION_LOST").length
  const connectionRestored = events.filter(e=> e.eventType === "CONNECTION_RESTORED").length

  const sessionDurationSec = session.submittedAt && session.startedAt ? Math.round((new Date(session.submittedAt).getTime() - new Date(session.startedAt).getTime()) / 1000) : Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)

  const answerDtos = answers.map(a => ({
    questionId: a.questionId,
    answer: a.answer,
    changeCount: a.changeCount,
    firstAnsweredAt: a.firstAnsweredAt,
    lastChangedAt: a.lastChangedAt,
    order: questionOrderMap.get(a.questionId) || 0,
    type: questionTypeMap.get(a.questionId) || "MCQ",
  }))

  return {
    timing: { avgResponseSec: avg, fastestSec: fastest, slowestSec: slowest, medianSec: median, responseTimes, answerChanges: answerChangeCount, questionsAnswered: answers.length },
    tabSwitches: totalWindowEvents, // unified for scoring (TAB + WINDOW)
    windowBlurs,
    totalFocusLossSec,
    copyPasteCount,
    copyCount,
    pasteCount,
    answerChangeCount,
    eventCounts,
    answers: answerDtos,
    events: events.map(e => ({ id: e.id, eventType: e.eventType, timestamp: e.timestamp, questionId: e.questionId, metadata: e.metadata })),
    sessionDurationSec,
    reconnectCount: safeReconnect,
    questionOpenCount,
    heartbeatGaps,
    maxHeartbeatGapSec: maxGapSec,
    totalGapSec,
    fullscreenExits,
    fullscreenEnters,
    connectionLost,
    connectionRestored,
    heartbeatCount: heartbeatEvents.length,
  } as any
}
