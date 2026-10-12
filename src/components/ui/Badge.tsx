import * as React from "react"
import { cn } from "@/lib/cn"

type Variant = "default"|"success"|"warning"|"danger"|"info"|"neutral"|"outline"
const map: Record<Variant,string> = {
  default: "bg-indigo-50 text-indigo-700 border-indigo-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  outline: "bg-white text-slate-600 border-slate-200",
}
export function Badge({variant="neutral", className, ...props}: React.HTMLAttributes<HTMLSpanElement> & {variant?:Variant}) {
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border leading-none", map[variant], className)} {...props} />
}
export function StatusBadge({status}:{status:string}) {
  const normalized = status.toLowerCase().replace(/_/g, ' ')
  let v: Variant = "neutral"
  if (["live","active","published","completed","available"].includes(normalized)) v="success"
  else if (["scheduled","upcoming","draft","archived","expired"].includes(normalized)) v="neutral"
  else if (["in progress","in_progress","pending"].includes(normalized)) v="warning"
  else if (["requires review","requires teacher review","review recommended","pending review","requires_review"].includes(normalized)) v="warning"
  else if (["high priority review","high priority","high_priority_review"].includes(normalized)) v="danger"
  else if (["normal"].includes(normalized)) v="success"
  else if (["low concern","low_concern"].includes(normalized)) v="info"
  else if (["reviewed","dismissed"].includes(normalized)) v="success"
  else if (["requires follow-up","requires follow up","needs follow-up","in review","in_review"].includes(normalized)) v="warning"
  else if (["submitted"].includes(normalized)) v="info"
  return <Badge variant={v}>{status}</Badge>
}
export function ExamStatusBadge({status}:{status:string}) {
  return <StatusBadge status={status} />
}
export function IntegrityBadge({level}:{level:string}) {
  const map: Record<string, Variant> = {
    normal: "success",
    low_concern: "info",
    lowconcern: "info",
    "low concern": "info",
    requires_review: "warning",
    "requires review": "warning",
    high_priority_review: "danger",
    "high priority review": "danger",
  }
  const key = level.toLowerCase()
  return <Badge variant={map[key] || "neutral"}>{level.replace(/_/g, ' ')}</Badge>
}
