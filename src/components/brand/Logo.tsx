import * as React from "react"
import { brand as brandTokens } from "@/brand/branding"

type Variant = "mark" | "wordmark" | "stacked"
type Theme = "light" | "dark"

export function Logo({
  variant = "mark",
  theme = "light",
  size = 32,
  className,
  showSublabel = false,
  sublabel,
}: {
  variant?: Variant
  theme?: Theme
  size?: number
  className?: string
  showSublabel?: boolean
  sublabel?: string
}) {
  const isDark = theme === "dark"
  // Mark SVG — shield with graduation cap + check (secure assessments)
  const Mark = ({ s = size }: { s?: number }) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0"
    >
      <rect width="32" height="32" rx={s * 0.22} fill={isDark ? "white" : brandTokens.colors.primary} />
      {/* Shield outer */}
      <path
        d="M16 6.2 L 24.2 10.8 V 17.8 C 24.2 22.2 21.1 26 16 28.2 C 10.9 26 7.8 22.2 7.8 17.8 V 10.8 L 16 6.2 Z"
        fill="none"
        stroke={isDark ? brandTokens.colors.primary : "white"}
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      {/* Inner shield subtle */}
      <path
        d="M16 8.2 L 22.2 11.8 V 17.6 C 22.2 21 19.8 24.2 16 26.1 C 12.2 24.2 9.8 21 9.8 17.6 V 11.8 L 16 8.2 Z"
        fill={isDark ? brandTokens.colors.slate100 : "white"}
        fillOpacity={isDark ? 1 : 0.08}
        stroke={isDark ? brandTokens.colors.slate200 : "white"}
        strokeOpacity={isDark ? 1 : 0.18}
        strokeWidth="0.7"
      />
      {/* Graduation cap */}
      <path
        d="M16 11.2 L 20.8 13.4 L 16 15.6 L 11.2 13.4 Z"
        fill={isDark ? brandTokens.colors.primary : "white"}
        fillOpacity={isDark ? 1 : 0.96}
        stroke={isDark ? brandTokens.colors.primary : "white"}
        strokeWidth="0.35"
        strokeLinejoin="round"
      />
      <path
        d="M20.8 13.4 V 15.2 C 20.8 15.9 18.6 16.9 16 16.9"
        fill="none"
        stroke={isDark ? brandTokens.colors.primary : "white"}
        strokeWidth="0.55"
        strokeLinecap="round"
        opacity="0.9"
      />
      <circle cx="20.8" cy="15.6" r="0.7" fill={isDark ? brandTokens.colors.primary : "white"} />
      {/* Check */}
      <path
        d="M11.6 17.9 L 14.35 20.65 L 20.9 13.9"
        stroke={isDark ? brandTokens.colors.primary : "white"}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )

  if (variant === "mark") {
    return (
      <span className={className} aria-label="ExamGuard">
        <Mark s={size} />
      </span>
    )
  }

  if (variant === "stacked") {
    return (
      <span className={`inline-flex flex-col items-center gap-1 ${className ?? ""}`} aria-label="ExamGuard">
        <Mark s={size} />
        <span className="flex flex-col items-center leading-none">
          <span className={`text-[11px] font-semibold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>ExamGuard</span>
          {showSublabel && (
            <span className={`text-[9px] font-medium tracking-[0.14em] uppercase ${isDark ? "text-white/70" : "text-slate-500"}`}>{sublabel}</span>
          )}
        </span>
      </span>
    )
  }

  // wordmark
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`} aria-label="ExamGuard">
      <Mark s={size} />
      <span className="flex flex-col leading-none">
        <span className={`text-[13px] font-semibold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>ExamGuard</span>
        {showSublabel && sublabel && (
          <span className={`text-[10px] font-medium tracking-[0.14em] uppercase ${isDark ? "text-white/70" : "text-slate-500"}`}>{sublabel}</span>
        )}
      </span>
    </span>
  )
}

// Convenience for headers — hides sublabel on small screens, keeps accessible
export function BrandMark(props: { size?: number; theme?: Theme; className?: string }) {
  return <Logo variant="mark" {...props} />
}
export function BrandWordmark(props: { size?: number; theme?: Theme; sublabel?: string; className?: string }) {
  return <Logo variant="wordmark" showSublabel={!!props.sublabel} {...props} />
}
