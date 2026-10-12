import { describe, it, expect } from 'vitest'
import { scoreSignals } from './scoringEngine.js'
import { detectSignals, jaccardSimilarity } from './signalDetector.js'

describe('scoring engine',()=>{
  it('caps at 100',()=>{
    const signals = Array.from({length:10},(_,i)=>({ type: 'TAB_SWITCH' as any, severity:'HIGH' as any, points:20, description:'', evidence:[], confidence:0.9, summary:''}))
    const {capped} = scoreSignals(signals as any)
    expect(capped).toBe(100)
  })
  it('thresholds',()=>{
    expect(scoreSignals([]).level).toBe('NORMAL')
    expect(scoreSignals([{points:40} as any]).level).toBe('LOW_CONCERN')
    expect(scoreSignals([{points:65} as any]).level).toBe('REQUIRES_REVIEW')
    expect(scoreSignals([{points:85} as any]).level).toBe('HIGH_PRIORITY_REVIEW')
  })
  it('deterministic',()=>{
    const f:any={ tabSwitches:4, totalFocusLossSec:32, windowBlurs:0, copyPasteCount:2, copyCount:1, pasteCount:1, answerChangeCount:6, timing:{ fastestSec:3, avgResponseSec:48, slowestSec:48, medianSec:10, responseTimes:[{sec:3},{sec:48},{sec:4}], answerChanges:6, questionsAnswered:3 }, eventCounts:{}, answers:[], events:[], sessionDurationSec:3600, reconnectCount:0, questionOpenCount:0 }
    const a=detectSignals(f as any)
    const b=detectSignals(f as any)
    expect(a).toEqual(b)
  })
  it('jaccard similarity',()=>{
    expect(jaccardSimilarity('hello world','hello world')).toBe(100)
    expect(jaccardSimilarity('hello world','goodbye world')).toBeLessThan(100)
    expect(jaccardSimilarity('','')).toBe(0)
  })
  it('detects tab switching',()=>{
    const sigs=detectSignals({ tabSwitches:6, totalFocusLossSec:48, windowBlurs:0, copyPasteCount:0, copyCount:0, pasteCount:0, answerChangeCount:0, timing:{fastestSec:10, avgResponseSec:50, slowestSec:50, medianSec:30, responseTimes:[], answerChanges:0, questionsAnswered:0}, eventCounts:{}, answers:[], events:[], sessionDurationSec:0, reconnectCount:0, questionOpenCount:0} as any)
    expect(sigs.some(s=> s.type==='TAB_SWITCH' && s.severity==='HIGH')).toBe(true)
  })
})
