import { AlertTriangle, Inbox, Loader2, SearchX } from "lucide-react"
import { Button } from "./Button"
import { cn } from "@/lib/cn"

function Skeleton({className}:{className?:string}) {
  return <div className={cn("animate-pulse bg-slate-100 rounded", className)} aria-hidden />
}

export function LoadingState({label="Loading..."}:{label?:string}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center" role="status" aria-live="polite" aria-busy="true">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden />
      <p className="text-sm text-slate-600 mt-3">{label}</p>
      <div className="mt-6 w-full max-w-sm space-y-3 hidden sm:block">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
        <Skeleton className="h-4 w-4/6 mx-auto" />
      </div>
    </div>
  )
}
export function TableSkeleton({rows=4, cols=5}:{rows?:number; cols?:number}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" aria-hidden>
      <div className="h-10 bg-slate-50 border-b border-slate-200" />
      <div className="divide-y divide-slate-100 p-2 space-y-3">
        {Array.from({length: rows}).map((_,i)=>(
          <div key={i} className="flex gap-3 p-3">
            {Array.from({length: cols}).map((__,j)=><Skeleton key={j} className="h-4 flex-1" />)}
          </div>
        ))}
      </div>
    </div>
  )
}
export function EmptyState({icon:Icon=Inbox, title, description, action}:{icon?: any; title:string; description?:string; action?:{label:string; onClick:()=>void}}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-dashed border-slate-300 rounded-xl bg-white">
      <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center"><Icon className="h-5 w-5 text-slate-500" aria-hidden /></div>
      <h4 className="text-[14px] font-semibold text-slate-900 mt-4">{title}</h4>
      {description && <p className="text-[13px] text-slate-600 mt-1.5 max-w-sm leading-5">{description}</p>}
      {action && <Button variant="secondary" size="sm" className="mt-4" onClick={action.onClick}>{action.label}</Button>}
    </div>
  )
}
export function ErrorState({title="Unable to load data", description, retry}:{title?:string; description?:string; retry?:()=>void}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border border-red-200 rounded-xl bg-red-50" role="alert">
      <div className="h-10 w-10 rounded-lg bg-white border border-red-200 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-red-600" aria-hidden /></div>
      <h4 className="text-[14px] font-semibold text-slate-900 mt-4">{title}</h4>
      {description && <p className="text-[13px] text-slate-700 mt-1.5 max-w-sm leading-5">{description}</p>}
      {retry && <Button variant="secondary" size="sm" className="mt-4" onClick={retry}>Try again</Button>}
    </div>
  )
}
export function NoResults({query}:{query:string}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <SearchX className="h-6 w-6 text-slate-400" />
      <p className="text-sm font-medium text-slate-700 mt-3">No results for “{query}”</p>
      <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
    </div>
  )
}
