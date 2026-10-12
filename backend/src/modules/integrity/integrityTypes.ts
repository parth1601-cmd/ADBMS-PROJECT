export enum SignalType {
  TAB_SWITCH = "TAB_SWITCH",
  TIMING = "TIMING",
  RAPID_CHANGE = "RAPID_CHANGE",
  COPY_PASTE = "COPY_PASTE",
  SIMILARITY = "SIMILARITY",
  SUBJECTIVE_SIMILARITY = "SUBJECTIVE_SIMILARITY",
  MULTI_SESSION = "MULTI_SESSION",
  CORRELATED_PATTERN = "CORRELATED_PATTERN",
  SESSION_ANOMALY = "SESSION_ANOMALY",
  UNACCOUNTED_TIME_GAP = "UNACCOUNTED_TIME_GAP",
  FULLSCREEN = "FULLSCREEN",
  CONNECTION_ANOMALY = "CONNECTION_ANOMALY",
}

export enum SignalSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export interface DetectedSignal {
  type: SignalType
  severity: SignalSeverity
  confidence: number // 0-1
  points: number
  summary: string
  description: string
  evidence: string[]
  count?: number
  relatedQuestions?: string[]
  timeRange?: { start: string; end: string }
  metadata?: Record<string, any>
}

export interface FeatureTiming {
  avgResponseSec: number
  fastestSec: number
  slowestSec: number
  medianSec: number
  responseTimes: { questionId: string; order: number; sec: number }[]
  answerChanges: number
  questionsAnswered: number
}

export interface ExtractedFeatures {
  timing: FeatureTiming
  tabSwitches: number
  windowBlurs: number
  totalFocusLossSec: number
  copyPasteCount: number
  copyCount: number
  pasteCount: number
  answerChangeCount: number
  eventCounts: Record<string, number>
  answers: { questionId: string; answer: string; changeCount: number; firstAnsweredAt: Date; lastChangedAt: Date; order: number; type: string }[]
  events: { id: string; eventType: string; timestamp: Date; questionId: string | null; metadata: string | null }[]
  sessionDurationSec: number
  reconnectCount: number
  questionOpenCount: number
  heartbeatGaps?: { gapSec:number, from:Date, to:Date }[]
  maxHeartbeatGapSec?: number
  totalGapSec?: number
  fullscreenExits?: number
  fullscreenEnters?: number
  connectionLost?: number
  connectionRestored?: number
  heartbeatCount?: number
}

export interface ScoreBreakdown {
  total: number
  capped: number
  level: ReviewLevel
  levelDisplay: string
  contributions: { type: SignalType; points: number; severity: SignalSeverity; confidence: number; summary: string }[]
}

export type ReviewLevel = "NORMAL" | "LOW_CONCERN" | "REQUIRES_REVIEW" | "HIGH_PRIORITY_REVIEW"

export interface SimilarityResult {
  peerSessionId: string
  peerStudentId: string
  peerName: string
  similarityPercent: number
  matches: number
  total: number
  details: { questionId: string; order: number; type: string; myAnswer: string; peerAnswer: string; match: boolean; similarity?: number }[]
  confidence: number
}

export interface PatternCorrelation {
  id: string
  description: string
  events: { type: string; timestamp: Date; deltaSec?: number }[]
  windowSec: number
  confidence: number
  relatedQuestions?: string[]
}

export interface TimelineEntry {
  id: string
  timestamp: Date
  at: string
  title: string
  kind: "session" | "focus" | "question" | "answer" | "clipboard" | "system"
  eventType: string
  severity?: SignalSeverity
  questionOrder?: number
  metadata?: any
  confidence?: number
}

export const REVIEW_LEVEL_THRESHOLDS = {
  NORMAL_MAX: 29,
  LOW_CONCERN_MAX: 59,
  REQUIRES_REVIEW_MAX: 79,
} as const

export const SCORING_CONFIG = {
  TAB_SWITCH: { LOW: 10, MEDIUM: 18, HIGH: 22 },
  TIMING: { LOW: 9, MEDIUM: 16, HIGH: 20 },
  RAPID_CHANGE: { LOW: 5, MEDIUM: 12, HIGH: 14 },
  COPY_PASTE: { LOW: 10, MEDIUM: 14, HIGH: 18 },
  SIMILARITY: { LOW: 10, MEDIUM: 15, HIGH: 18 },
  SUBJECTIVE_SIMILARITY: { MEDIUM: 14, HIGH: 18 },
  MULTI_SESSION: { MEDIUM: 12, HIGH: 16 },
  CORRELATED_PATTERN: { MEDIUM: 10, HIGH: 15 },
  SESSION_ANOMALY: { LOW: 8, MEDIUM: 13, HIGH: 16 },
}

export const WINDOW_CONFIG = {
  CORRELATION_WINDOW_SEC: [5, 10, 30, 60],
  RAPID_ANSWER_SEC: 5,
  UNUSUAL_TIME_SEC: 8,
} as const

export function levelForScore(score: number): ReviewLevel {
  if (score >= 80) return "HIGH_PRIORITY_REVIEW"
  if (score >= 60) return "REQUIRES_REVIEW"
  if (score >= 30) return "LOW_CONCERN"
  return "NORMAL"
}

export function levelDisplay(level: ReviewLevel): string {
  switch (level) {
    case "HIGH_PRIORITY_REVIEW": return "High Priority Review"
    case "REQUIRES_REVIEW": return "Requires Review"
    case "LOW_CONCERN": return "Low Concern"
    case "NORMAL": return "Normal"
  }
}
