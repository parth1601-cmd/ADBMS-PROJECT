import * as React from "react"
import { Card } from "./Card"
export function StatCard({label, value, sub, icon:Icon, trend}:{label:string; value:React.ReactNode; sub?:string; icon?:any; trend?:string}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 leading-none">{label}</div>
          <div className="text-[24px] font-semibold tracking-tight text-slate-900 mt-2 leading-none">{value}</div>
          {sub && <div className="text-[13px] text-slate-600 mt-1.5 leading-4">{sub}</div>}
          {trend && <div className="text-xs font-medium text-emerald-600 mt-1.5">{trend}</div>}
        </div>
        {Icon && <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0"><Icon className="h-4 w-4 text-slate-600" aria-hidden /></div>}
      </div>
    </Card>
  )
}
