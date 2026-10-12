import type { DetectedSignal, ExtractedFeatures } from "./integrityTypes.js"
import { SignalType, SignalSeverity } from "./integrityTypes.js"

function severityFromCount(count: number, thresholds: { low: number; medium: number; high: number }): SignalSeverity | null {
  if (count >= thresholds.high) return SignalSeverity.HIGH
  if (count >= thresholds.medium) return SignalSeverity.MEDIUM
  if (count >= thresholds.low) return SignalSeverity.LOW
  return null
}

export function detectSignals(
  features: ExtractedFeatures,
  opts?: {
    similarityPercent?: number
    similarityDetails?: { matches: number; total: number; peerName?: string }
    subjectiveSimilarity?: { max: number; count: number }
    multiSession?: boolean
    correlatedPatterns?: { count: number; windowSec: number }
  }
): DetectedSignal[] {
  const signals: DetectedSignal[] = []

  // TAB / WINDOW switching
  const tabs = features.tabSwitches
  if (tabs >= 2) {
    let severity: SignalSeverity
    let points: number
    let confidence: number
    let summary: string
    if (tabs >= 6) {
      severity = SignalSeverity.HIGH
      points = 22
      confidence = 0.91
      summary = "Frequent focus changes detected."
    } else if (tabs >= 4) {
      severity = SignalSeverity.MEDIUM
      points = 18
      confidence = 0.84
      summary = "Repeated focus changes were detected during the exam."
    } else {
      severity = SignalSeverity.LOW
      points = 10
      confidence = 0.71
      summary = "Occasional focus changes detected."
    }
    // Include windowBlurs description
    const evidence: string[] = []
    evidence.push(`${tabs} focus changes (tab/window) recorded`)
    if (features.totalFocusLossSec > 0) evidence.push(`${features.totalFocusLossSec} seconds estimated focus loss`)
    // active period from events
    const focusEvents = features.events.filter(e => e.eventType === "TAB_HIDDEN" || e.eventType === "WINDOW_BLUR")
    if (focusEvents.length >= 2) {
      const start = focusEvents[0].timestamp.toISOString().slice(11, 19)
      const end = focusEvents[focusEvents.length - 1].timestamp.toISOString().slice(11, 19)
      evidence.push(`Most active period: ${start}–${end}`)
    }
    signals.push({
      type: SignalType.TAB_SWITCH,
      severity,
      confidence,
      points,
      summary,
      description: summary,
      evidence,
      count: tabs,
      timeRange: focusEvents.length ? { start: focusEvents[0].timestamp.toISOString(), end: focusEvents[focusEvents.length - 1].timestamp.toISOString() } : undefined,
    })
  }

  // TIMING: fast responses
  const rapidCount = features.timing.responseTimes.filter(r => r.sec <= 5).length
  const avg = features.timing.avgResponseSec
  const fastest = features.timing.fastestSec
  if (rapidCount >= 1 || (fastest <= 4 && avg >= 40)) {
    let severity: SignalSeverity
    let points: number
    let confidence: number
    let summary: string
    if (rapidCount >= 5) {
      severity = SignalSeverity.HIGH
      points = 20
      confidence = 0.89
      summary = "Multiple unusually fast responses."
    } else if (rapidCount >= 3 || (fastest <= 4 && avg >= 40)) {
      severity = SignalSeverity.MEDIUM
      points = 16
      confidence = 0.82
      summary = "Several responses occurred substantially faster than the student's overall response pattern."
    } else {
      severity = SignalSeverity.LOW
      points = 9
      confidence = 0.66
      summary = "One faster response than typical pattern."
    }
    const evidence = [`${rapidCount} responses under 5 seconds`, `Average ${avg}s, fastest ${fastest}s`]
    // related questions: those rapid
    const related = features.timing.responseTimes.filter(r => r.sec <= 5).map(r => `Q${r.order}`)
    signals.push({
      type: SignalType.TIMING,
      severity,
      confidence,
      points,
      summary,
      description: summary,
      evidence,
      count: rapidCount,
      relatedQuestions: related.length ? related : undefined,
    })
  }

  // UNUSUAL_TIME_SPENT (very long or very short per question)
  const unusualTiming = features.timing.responseTimes.filter(r => r.sec <= 8 || r.sec >= 180).length
  if (unusualTiming >= 3 && rapidCount < 3) {
    // avoid double counting with TIMING high; treat as separate if not already high timing
    signals.push({
      type: SignalType.TIMING,
      severity: SignalSeverity.LOW,
      confidence: 0.62,
      points: 8,
      summary: "Unusual time spent pattern detected.",
      description: "Several questions were answered with timing substantially different from the student's median.",
      evidence: [`${unusualTiming} questions with unusual time (≤8s or ≥180s)`, `Median ${features.timing.medianSec}s`],
      count: unusualTiming,
    })
  }

  // RAPID ANSWER CHANGES
  const changes = features.answerChangeCount
  if (changes >= 1) {
    let severity: SignalSeverity
    let points: number
    let confidence: number
    let summary: string
    if (changes >= 9) {
      severity = SignalSeverity.HIGH
      points = 14
      confidence = 0.88
      summary = "Frequent answer revisions detected."
    } else if (changes >= 6) {
      severity = SignalSeverity.MEDIUM
      points = 8
      confidence = 0.79
      summary = "Multiple answers were changed within short intervals."
    } else if (changes >= 4) {
      severity = SignalSeverity.MEDIUM
      points = 12
      confidence = 0.81
      summary = "Multiple quick revisions."
    } else if (changes <= 2) {
      severity = SignalSeverity.LOW
      points = 5
      confidence = 0.64
      summary = "Minimal answer revision."
    } else {
      // 3 changes - low-medium boundary
      severity = SignalSeverity.LOW
      points = 7
      confidence = 0.70
      summary = "Some answer changes recorded."
    }
    // Only push if not already covered? changes 1-2 included.
    if (severity) {
      signals.push({
        type: SignalType.RAPID_CHANGE,
        severity,
        confidence,
        points,
        summary,
        description: summary,
        evidence: [`${changes} answer changes`],
        count: changes,
      })
    }
  }

  // COPY / PASTE
  const cp = features.copyPasteCount
  if (cp >= 1) {
    let severity: SignalSeverity
    let points: number
    let confidence: number
    let summary: string
    if (cp >= 3) {
      severity = SignalSeverity.MEDIUM
      points = 14
      confidence = 0.85
      summary = "Relevant copy/paste activity was detected during the exam."
    } else if (cp >= 2) {
      severity = SignalSeverity.MEDIUM
      points = 14
      confidence = 0.83
      summary = "Paste events during short-answer questions."
    } else {
      severity = SignalSeverity.LOW
      points = 10
      confidence = 0.71
      summary = "Paste detected in short answer."
    }
    signals.push({
      type: SignalType.COPY_PASTE,
      severity,
      confidence,
      points,
      summary,
      description: summary,
      evidence: [`${cp} clipboard events (${features.copyCount} copy, ${features.pasteCount} paste)`],
      count: cp,
    })
  }

  // SIMILARITY
  if (opts?.similarityPercent !== undefined && opts.similarityPercent >= 70) {
    const pct = opts.similarityPercent
    let sev: SignalSeverity
    let pts: number
    let conf: number
    if (pct >= 85) {
      sev = SignalSeverity.HIGH
      pts = 18
      conf = 0.90
    } else if (pct >= 75) {
      sev = SignalSeverity.MEDIUM
      pts = 15
      conf = 0.84
    } else {
      sev = SignalSeverity.LOW
      pts = 10
      conf = 0.73
    }
    const matches = opts.similarityDetails?.matches ?? 0
    const total = opts.similarityDetails?.total ?? 0
    const peer = opts.similarityDetails?.peerName ? ` with ${opts.similarityDetails.peerName}` : ""
    signals.push({
      type: SignalType.SIMILARITY,
      severity: sev,
      confidence: conf,
      points: pts,
      summary: "High overlap with peer responses.",
      description: "Answer pattern shows high overlap with peer responses. This may occur naturally and requires teacher review.",
      evidence: [`${matches}/${total} matches (${pct}%)${peer}`],
      count: 1,
    })
  }

  // SUBJECTIVE SIMILARITY
  if (opts?.subjectiveSimilarity && opts.subjectiveSimilarity.max >= 80) {
    const max = opts.subjectiveSimilarity.max
    const cnt = opts.subjectiveSimilarity.count
    signals.push({
      type: SignalType.SUBJECTIVE_SIMILARITY,
      severity: max >= 90 ? SignalSeverity.HIGH : SignalSeverity.MEDIUM,
      confidence: max >= 90 ? 0.88 : 0.82,
      points: max >= 90 ? 18 : 14,
      summary: "High textual overlap in short answers.",
      description: "Short-answer texts are highly similar to a peer submission.",
      evidence: [`${max}% maximum similarity`, `${cnt} short answers with ≥80% overlap`],
      count: cnt,
    })
  }

  // MULTI_SESSION / SESSION ANOMALY
  if (opts?.multiSession) {
    signals.push({
      type: SignalType.MULTI_SESSION,
      severity: SignalSeverity.MEDIUM,
      confidence: 0.86,
      points: 12,
      summary: "Multiple active sessions detected.",
      description: "A second session token was detected for the same exam and student.",
      evidence: ["Multiple active sessions for same exam"],
      count: 1,
    })
  }

  if (features.reconnectCount >= 2) {
    signals.push({
      type: SignalType.SESSION_ANOMALY,
      severity: features.reconnectCount >= 3 ? SignalSeverity.HIGH : SignalSeverity.MEDIUM,
      confidence: 0.80,
      points: features.reconnectCount >= 3 ? 13 : 10,
      summary: "Repeated reconnections detected.",
      description: "Session was reconnected multiple times. May indicate network instability or multiple session attempts.",
      evidence: [`${features.reconnectCount} reconnects`],
      count: features.reconnectCount,
    })
  } else if (features.reconnectCount === 1) {
    signals.push({
      type: SignalType.SESSION_ANOMALY,
      severity: SignalSeverity.LOW,
      confidence: 0.64,
      points: 8,
      summary: "Session reconnected once.",
      description: "One reconnection occurred. Often legitimate (network).",
      evidence: ["1 reconnection"],
      count: 1,
    })
  }

  // CORRELATED PATTERN: if TAB_HIDDEN followed shortly by ANSWER_CHANGED
  if (opts?.correlatedPatterns && opts.correlatedPatterns.count >= 1) {
    const c = opts.correlatedPatterns
    signals.push({
      type: SignalType.CORRELATED_PATTERN,
      severity: c.count >= 3 ? SignalSeverity.HIGH : c.count >= 2 ? SignalSeverity.MEDIUM : SignalSeverity.LOW,
      confidence: c.count >= 3 ? 0.87 : 0.78,
      points: c.count >= 3 ? 15 : c.count >= 2 ? 12 : 6,
      summary: "Correlated activity pattern detected.",
      description: `Repeated focus changes occurred within ${c.windowSec}s of answer changes. Correlation does not imply intent and requires human review.`,
      evidence: [`${c.count} correlated TAB→CHANGE patterns within ${c.windowSec}s window`],
      count: c.count,
    })
  }

  // UNACCOUNTED TIME GAP (heartbeat gap)
  const hbGaps: any = (features as any).heartbeatGaps || []
  const maxGap = (features as any).maxHeartbeatGapSec || 0
  const totalGap = (features as any).totalGapSec || 0
  if(hbGaps.length>0 || maxGap >= 90){
    let severity: SignalSeverity
    let points:number
    let confidence:number
    if(maxGap >= 180){
      severity = SignalSeverity.HIGH
      points = 16
      confidence = 0.88
    } else if(maxGap >= 90 || hbGaps.length>=2){
      severity = SignalSeverity.MEDIUM
      points = 10
      confidence = 0.82
    } else {
      severity = SignalSeverity.LOW
      points = 6
      confidence = 0.71
    }
    const evidence:string[]=[]
    for(const g of hbGaps){
      evidence.push(`An extended period without recorded exam activity was observed: ${g.gapSec}s gap`)
    }
    if(totalGap>0) evidence.push(`Total unaccounted observed gap: ${totalGap}s`)
    evidence.push(`Largest gap: ${maxGap}s — gap is an observation, not proof of misconduct`)
    signals.push({
      type: SignalType.UNACCOUNTED_TIME_GAP,
      severity,
      confidence,
      points,
      summary: "An extended period without recorded exam activity was observed.",
      description: "An extended period without recorded exam activity was observed. This may be due to network interruption or device sleep. It is not proof of misconduct and requires review.",
      evidence,
      count: hbGaps.length || 1,
      metadata: { maxGapSec: maxGap, totalGapSec: totalGap }
    })
  }

  // FULLSCREEN exits
  const fsExits = (features as any).fullscreenExits || 0
  if(fsExits >=1){
    let severity: SignalSeverity
    let points:number
    let confidence:number
    if(fsExits>=3){ severity=SignalSeverity.HIGH; points=14; confidence=0.87 }
    else if(fsExits>=2){ severity=SignalSeverity.MEDIUM; points=10; confidence=0.80 }
    else { severity=SignalSeverity.LOW; points=6; confidence=0.72 }
    signals.push({
      type: SignalType.FULLSCREEN,
      severity,
      confidence,
      points,
      summary: "Fullscreen mode was exited.",
      description: "Fullscreen mode was exited during the exam. Recorded as observed event; does not automatically indicate misconduct.",
      evidence: [`${fsExits} fullscreen exit(s) recorded`],
      count: fsExits
    })
  }

  // CONNECTION ANOMALY
  const connLost = (features as any).connectionLost || 0
  const connRestored = (features as any).connectionRestored || 0
  if(connLost>=2 || (connLost>=1 && connRestored>=1 && maxGap>=60)){
    signals.push({
      type: SignalType.CONNECTION_ANOMALY,
      severity: connLost>=3 ? SignalSeverity.MEDIUM : SignalSeverity.LOW,
      confidence: 0.68,
      points: 5,
      summary: "Connection interruption observed.",
      description: "Connection loss/restoration events were recorded. Often due to network instability; review context.",
      evidence: [`${connLost} connection lost, ${connRestored} restored`, `Largest gap ${maxGap}s`],
      count: connLost
    })
  }

  return signals
}
