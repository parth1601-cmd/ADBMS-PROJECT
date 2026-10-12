import type { ExtractedFeatures, PatternCorrelation } from "./integrityTypes.js"

export function analyzeCorrelatedPatterns(features: ExtractedFeatures, windowSecOptions: number[] = [5, 10, 30, 60]): PatternCorrelation[] {
  const hiddenEvents = features.events.filter(e => e.eventType === "TAB_HIDDEN" || e.eventType === "WINDOW_BLUR")
  const changeEvents = features.events.filter(e => e.eventType === "ANSWER_CHANGED")

  if (hiddenEvents.length === 0 || changeEvents.length === 0) return []

  const correlations: PatternCorrelation[] = []

  for (const w of windowSecOptions) {
    let count = 0
    const pairs: { hiddenAt: Date; changeAt: Date; deltaSec: number }[] = []
    for (const h of hiddenEvents) {
      for (const c of changeEvents) {
        const deltaSec = (c.timestamp.getTime() - h.timestamp.getTime()) / 1000
        // Only hidden -> change within window and after
        if (deltaSec > 0 && deltaSec <= w) {
          pairs.push({ hiddenAt: h.timestamp, changeAt: c.timestamp, deltaSec })
          count++
          break // count per hidden at most once per window to avoid double counting
        }
      }
    }
    if (count >= 1) {
      const confidence = count >= 3 ? 0.87 : count >= 2 ? 0.78 : 0.64
      correlations.push({
        id: `corr-${w}s-${count}`,
        description: `${count} focus-loss → answer-change patterns within ${w}s window`,
        events: pairs.slice(0, 5).map(p => ({ type: "TAB_HIDDEN→ANSWER_CHANGED", timestamp: p.changeAt, deltaSec: Math.round(p.deltaSec) })),
        windowSec: w,
        confidence,
      })
    }
  }

  // Return strongest (most count) correlation as primary, but also provide all for detail
  correlations.sort((a, b) => b.events.length - a.events.length)
  return correlations
}

export function analyzeSessionAnomalies(features: ExtractedFeatures): { reconnects: number; hasAnomaly: boolean; details: string[] } {
  const details: string[] = []
  if (features.reconnectCount >= 1) details.push(`${features.reconnectCount} session reconnections`)
  if (features.eventCounts["SESSION_STARTED"] && features.eventCounts["SESSION_STARTED"] > 1) details.push(`Multiple SESSION_STARTED events`)
  const hasAnomaly = details.length > 0
  return { reconnects: features.reconnectCount, hasAnomaly, details }
}
