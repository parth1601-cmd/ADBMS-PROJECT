import type { ExtractedFeatures, TimelineEntry } from "./integrityTypes.js"

export function buildTimeline(features: ExtractedFeatures, questionOrderMap?: Map<string, number>): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  for (const ev of features.events) {
    const ts = ev.timestamp as Date
    const at = ts.toISOString().slice(11, 19)
    let title = ev.eventType.replace(/_/g, " ")
    let kind: TimelineEntry["kind"] = "system"
    let severity: TimelineEntry["severity"] | undefined = undefined

    switch (ev.eventType) {
      case "SESSION_STARTED":
        title = "Exam session started"
        kind = "session"
        break
      case "SESSION_ENDED":
        title = "Exam submitted"
        kind = "session"
        break
      case "TAB_HIDDEN":
        title = "Tab became hidden"
        kind = "focus"
        severity = "MEDIUM" as any
        break
      case "TAB_VISIBLE":
        title = "Tab became visible"
        kind = "focus"
        break
      case "WINDOW_BLUR":
        title = "Window lost focus"
        kind = "focus"
        break
      case "WINDOW_FOCUS":
        title = "Window regained focus"
        kind = "focus"
        break
      case "QUESTION_OPENED":
        title = "Question opened"
        kind = "question"
        break
      case "QUESTION_ANSWERED":
        title = "Question answered"
        kind = "answer"
        break
      case "ANSWER_CHANGED":
        title = "Answer changed"
        kind = "answer"
        break
      case "RAPID_ANSWER":
        title = "Rapid answer detected"
        kind = "answer"
        severity = "MEDIUM" as any
        break
      case "UNUSUAL_TIME_SPENT":
        title = "Unusual time spent"
        kind = "question"
        break
      case "COPY":
        title = "Copy activity"
        kind = "clipboard"
        break
      case "PASTE":
        title = "Paste activity"
        kind = "clipboard"
        break
      default:
        kind = "system"
    }

    let questionOrder: number | undefined = undefined
    if (ev.questionId && questionOrderMap) {
      questionOrder = questionOrderMap.get(ev.questionId)
    }

    let metadata: any = undefined
    if (ev.metadata) {
      try {
        metadata = JSON.parse(ev.metadata)
      } catch {
        metadata = ev.metadata
      }
    }

    entries.push({
      id: ev.id,
      timestamp: ts,
      at,
      title,
      kind,
      eventType: ev.eventType,
      severity,
      questionOrder,
      metadata,
    })
  }

  // also add synthetic answer timing entries: fastest/slowest insights not as events
  return entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

export function timelineIntensityByMinute(entries: TimelineEntry[]): { minute: string; count: number; focus: number; answer: number; clipboard: number }[] {
  if (entries.length === 0) return []
  const start = entries[0].timestamp
  const end = entries[entries.length - 1].timestamp
  const minutes = Math.ceil((end.getTime() - start.getTime()) / 60000) || 1
  const buckets: Map<string, { count: number; focus: number; answer: number; clipboard: number }> = new Map()
  for (let i = 0; i < minutes; i++) {
    const bucketTime = new Date(start.getTime() + i * 60000)
    const label = bucketTime.toISOString().slice(11, 16)
    buckets.set(label, { count: 0, focus: 0, answer: 0, clipboard: 0 })
  }
  for (const e of entries) {
    const offsetMin = Math.floor((e.timestamp.getTime() - start.getTime()) / 60000)
    const bucketTime = new Date(start.getTime() + offsetMin * 60000)
    const label = bucketTime.toISOString().slice(11, 16)
    const b = buckets.get(label)
    if (b) {
      b.count++
      if (e.kind === "focus") b.focus++
      if (e.kind === "answer") b.answer++
      if (e.kind === "clipboard") b.clipboard++
    }
  }
  return Array.from(buckets.entries()).map(([minute, v]) => ({ minute, ...v }))
}

export function filterTimeline(entries: TimelineEntry[], filter: string): TimelineEntry[] {
  if (!filter || filter === "all" || filter === "All") return entries
  const f = filter.toLowerCase()
  if (f === "session") return entries.filter(e => e.kind === "session")
  if (f === "focus" || f === "tab") return entries.filter(e => e.kind === "focus")
  if (f === "question") return entries.filter(e => e.kind === "question")
  if (f === "answer") return entries.filter(e => e.kind === "answer")
  if (f === "clipboard" || f === "copy") return entries.filter(e => e.kind === "clipboard")
  if (f === "system") return entries.filter(e => e.kind === "system")
  return entries
}
