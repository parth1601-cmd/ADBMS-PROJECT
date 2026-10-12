import * as React from "react"
import { cn } from "@/lib/cn"

type TabsCtx = { value:string; onValueChange:(v:string)=>void }
const Ctx = React.createContext<TabsCtx | null>(null)

export function Tabs({value, onValueChange, children, className}:{value:string; onValueChange:(v:string)=>void; children:React.ReactNode; className?:string}) {
  return <Ctx.Provider value={{value,onValueChange}}><div className={className}>{children}</div></Ctx.Provider>
}
export function TabsList({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit", className)} {...props} />
}
export function TabsTrigger({value, children}:{value:string; children:React.ReactNode}) {
  const ctx = React.useContext(Ctx)!
  const active = ctx.value===value
  return (
    <button onClick={()=>ctx.onValueChange(value)} className={cn("px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500", active ? "bg-white shadow-sm text-slate-900 border border-slate-200" : "text-slate-600 hover:text-slate-900")} aria-selected={active} role="tab">
      {children}
    </button>
  )
}
export function TabsContent({value, children, className}:{value:string; children:React.ReactNode; className?:string}) {
  const ctx = React.useContext(Ctx)!
  if(ctx.value!==value) return null
  return <div role="tabpanel" className={className}>{children}</div>
}

// Simple underline tabs for detail pages
export function UnderlineTabs({value, onValueChange, tabs}:{value:string; onValueChange:(v:string)=>void; tabs:{value:string; label:string}[]}) {
  return (
    <div className="border-b border-slate-200">
      <nav className="-mb-px flex gap-6" aria-label="Tabs">
        {tabs.map(t=>{
          const active = value===t.value
          return <button key={t.value} onClick={()=>onValueChange(t.value)} className={cn("whitespace-nowrap py-3 px-1 border-b-2 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500", active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300")}>{t.label}</button>
        })}
      </nav>
    </div>
  )
}
