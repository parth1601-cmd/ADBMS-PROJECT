import type { DetectedSignal } from "./integrityTypes.js"
import { levelForScore, levelDisplay, type ReviewLevel, type ScoreBreakdown } from "./integrityTypes.js"

export function scoreSignals(signals: DetectedSignal[]): ScoreBreakdown {
  const total = signals.reduce((sum, s) => sum + s.points, 0)
  const capped = Math.min(100, Math.max(0, total))
  const level = levelForScore(capped)
  return {
    total,
    capped,
    level,
    levelDisplay: levelDisplay(level),
    contributions: signals.map(s => ({ type: s.type as any, points: s.points, severity: s.severity as any, confidence: s.confidence, summary: s.summary })),
  }
}

export function levelToString(level: ReviewLevel): string {
  return levelDisplay(level)
}
