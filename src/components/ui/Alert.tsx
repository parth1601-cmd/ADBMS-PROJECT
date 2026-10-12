import * as React from "react"
import { Info, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/cn"

type Variant = "info"|"warning"|"danger"|"success"|"neutral"
const iconMap: Record<Variant, any> = { info: Info, warning: AlertTriangle, danger: ShieldAlert, success: CheckCircle2, neutral: Info }
const clsMap: Record<Variant,string> = {
  info: "bg-sky-50 border-sky-200 text-sky-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  danger: "bg-red-50 border-red-200 text-red-900",
  success: "bg-emerald-50 border-emerald-200 text-emerald-900",
  neutral: "bg-slate-50 border-slate-200 text-slate-700",
}
export function Alert({variant="neutral", title, children, className}:{variant?:Variant; title?:string; children?:React.ReactNode; className?:string}) {
  const Icon = iconMap[variant]
  return (
    <div role="status" className={cn("rounded-xl border px-4 py-3 flex gap-3", clsMap[variant], className)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <div className="text-[13px] font-semibold leading-5">{title}</div>}
        {children && <div className="text-[13px] leading-5 mt-0.5">{children}</div>}
      </div>
    </div>
  )
}
