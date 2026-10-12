// ExamGuard Brand System — Single Source of Truth
// Used across Frontend, PDF, Charts, Badges, Emails

export const brand = {
  name: "ExamGuard",
  tagline: "Secure Assessments. Fair Futures.",
  website: "examguard.demo",
  domain: "https://examguard.demo",
  institutionDefault: "ExamGuard Demo Institution",
  academicYearDefault: "2026–2027",
  version: "1.0",
  colors: {
    // Primary — Navy / Deep Blue (institutional, trustworthy)
    primary: "#0F172A",        // slate-900
    primaryDark: "#020617",    // slate-950
    primaryLight: "#1E293B",   // slate-800
    primarySoft: "#1E1B4B",    // indigo-950 for large hero numbers

    // Secondary — Professional Blue
    secondary: "#4338CA",      // indigo-700
    secondaryLight: "#6366F1", // indigo-500
    secondarySoft: "#EEF2FF",  // indigo-50
    secondaryRing: "#E0E7FF",  // indigo-100

    // Semantic
    success: "#059669",        // emerald-600
    successSoft: "#ECFDF5",    // emerald-50
    successBorder: "#A7F3D0",  // emerald-200
    warning: "#D97706",        // amber-600
    warningSoft: "#FFFBEB",    // amber-50
    warningBorder: "#FDE68A",  // amber-200
    danger: "#DC2626",         // red-600
    dangerSoft: "#FEF2F2",     // red-50
    dangerBorder: "#FECACA",   // red-200
    info: "#0284C7",           // sky-600

    // Neutrals
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
  logo: {
    light: "/branding/examguard-logo.svg",
    dark: "/branding/examguard-logo-dark.svg",
    icon: "/branding/examguard-icon.svg",
    iconDark: "/branding/examguard-icon-dark.svg",
    favicon: "/favicon.svg",
  },
  typography: {
    sans: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    mono: "Fragment Mono, ui-monospace, monospace",
  },
  report: {
    version: "1.0",
    margins: { top: 52, bottom: 52, left: 48, right: 48 }, // ~18mm (51pt)
    pageFormat: "A4" as const,
    footerText: "EXAMGUARD  •  Secure Assessment & Integrity Platform",
  },
} as const

export type Brand = typeof brand

// Helper to get semantic badge variant from status/level
export function badgeVariantForStatus(status: string): "success"|"warning"|"danger"|"info"|"neutral" {
  const n = status.toLowerCase().replace(/_/g, " ").trim()
  if (["passed","normal","reviewed","dismissed","completed","live","published","available"].includes(n)) return "success"
  if (["high priority review","high priority","failed","expired","error"].includes(n)) return "danger"
  if (["requires review","requires teacher review","pending","in review","in_progress","requires follow-up","low concern"].includes(n) && n !== "low concern") {
    // low concern is info, others warning
    if (n === "low concern") return "info"
    return "warning"
  }
  if (n === "low concern") return "info"
  return "neutral"
}

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
