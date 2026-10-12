import { cn } from "@/lib/cn"

export type ScoreLevel = "Normal" | "Low Concern" | "Requires Review" | "High Priority Review"

export function getScoreMeta(score:number): {level:ScoreLevel; color:string; bg:string; ring:string} {
  if (score >= 75) return {level:"High Priority Review", color:"text-red-700", bg:"bg-red-50", ring:"text-red-600"}
  if (score >= 55) return {level:"Requires Review", color:"text-amber-700", bg:"bg-amber-50", ring:"text-amber-500"}
  if (score >= 35) return {level:"Low Concern", color:"text-sky-700", bg:"bg-sky-50", ring:"text-sky-500"}
  return {level:"Normal", color:"text-emerald-700", bg:"bg-emerald-50", ring:"text-emerald-500"}
}

export function ScoreBadge({score, size="md"}:{score:number; size?:"sm"|"md"|"lg"}) {
  const m = getScoreMeta(score)
  const sz = size==="sm" ? "h-6 px-2 text-xs" : size==="lg" ? "h-7 px-3 text-sm" : "h-6 px-2.5 text-[12px]"
  return <span className={cn("inline-flex items-center font-semibold rounded-full border", sz, m.bg, m.color, m.bg.includes("red")?"border-red-200":m.bg.includes("amber")?"border-amber-200":m.bg.includes("sky")?"border-sky-200":"border-emerald-200")}>{score} · {m.level}</span>
}

export function ScoreRing({score, size=112}:{score:number; size?:number}) {
  const meta = getScoreMeta(score)
  const r = 48
  const c = 2*Math.PI*r
  const offset = c * (1 - score/100)
  const stroke = meta.ring.replace("text-","stroke-")
  // map tailwind stroke to actual color: approximate
  const strokeColor = score>=75 ? "#dc2626" : score>=55 ? "#f59e0b" : score>=35 ? "#0ea5e9" : "#059669"
  return (
    <div className="relative inline-flex items-center justify-center" style={{width:size, height:size}} aria-label={`Integrity score ${score} out of 100`}>
      <svg width={size} height={size} viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} stroke="#e2e8f0" strokeWidth="10" fill="none" />
        <circle cx="60" cy="60" r={r} stroke={strokeColor} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{transition:"stroke-dashoffset 900ms ease"}} />
      </svg>
      <div className="absolute text-center">
        <div className="text-[28px] font-bold tracking-tight text-slate-900 leading-none">{score}</div>
        <div className="text-[11px] font-medium text-slate-500 tracking-wide uppercase mt-1">/100</div>
      </div>
    </div>
  )
}

export function ScoreBar({score}:{score:number}) {
  const meta = getScoreMeta(score)
  const width = `${score}%`
  const color = score>=75 ? "bg-red-600" : score>=55 ? "bg-amber-500" : score>=35 ? "bg-sky-500" : "bg-emerald-500"
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-600">{meta.level}</span>
        <span className="text-xs font-semibold text-slate-900">{score}/100</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={cn("h-full rounded-full", color)} style={{width}} /></div>
    </div>
  )
}
