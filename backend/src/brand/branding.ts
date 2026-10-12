// ExamGuard Brand System — Backend Single Source of Truth
// Mirrors src/brand/branding.ts for PDF + verification usage

export const brand = {
  name: "ExamGuard",
  tagline: "Secure Assessments. Fair Futures.",
  website: "examguard.demo",
  domain: "https://examguard.demo",
  institutionDefault: "ExamGuard Demo Institution",
  academicYearDefault: "2026–2027",
  version: "1.0",
  colors: {
    primary: "#0F172A",
    primaryDark: "#020617",
    primaryLight: "#1E293B",
    primarySoft: "#1E1B4B",
    secondary: "#4338CA",
    secondaryLight: "#6366F1",
    secondarySoft: "#EEF2FF",
    secondaryRing: "#E0E7FF",
    success: "#059669",
    successSoft: "#ECFDF5",
    successBorder: "#A7F3D0",
    warning: "#D97706",
    warningSoft: "#FFFBEB",
    warningBorder: "#FDE68A",
    danger: "#DC2626",
    dangerSoft: "#FEF2F2",
    dangerBorder: "#FECACA",
    info: "#0284C7",
    ink: "#0F172A",
    muted: "#64748B",
    line: "#E2E8F0",
    paper: "#F8FAFC",
    slate50: "#F8FAFC",
    slate100: "#F1F5F9",
    slate200: "#E2E8F0",
    slate500: "#64748B",
    slate600: "#475569",
    slate700: "#334155",
    slate900: "#0F172A",
  },
  typography: {
    sans: "Inter, Helvetica, Arial, sans-serif",
  },
  report: {
    version: "1.0",
    margins: { top: 52, bottom: 52, left: 48, right: 48 },
    pageFormat: "A4" as const,
    footerText: "EXAMGUARD  •  Secure Assessment & Integrity Platform",
  },
} as const

export function integrityLevelDisplay(level: string): string {
  const m: Record<string,string> = {
    NORMAL: "Normal",
    LOW_CONCERN: "Low Concern",
    REQUIRES_REVIEW: "Requires Review",
    HIGH_PRIORITY_REVIEW: "High Priority Review",
  }
  return m[level] || level.replace(/_/g, " ")
}

export function integrityStatusDisplay(status: string): string {
  const m: Record<string,string> = {
    PENDING: "Requires Teacher Review",
    IN_REVIEW: "In Review",
    REVIEWED: "Reviewed",
    REQUIRES_FOLLOW_UP: "Requires Follow-Up",
    DISMISSED: "Dismissed",
  }
  return m[status] || status
}

export function getReportVersion(): string {
  return brand.report.version
}
