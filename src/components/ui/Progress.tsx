import { cn } from "@/lib/cn"
export function Progress({value, className}:{value:number; className?:string}) {
  return <div className={cn("h-1.5 w-full bg-slate-100 rounded-full overflow-hidden", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-indigo-600 rounded-full transition-all" style={{width:`${Math.max(0,Math.min(100,value))}%`}} /></div>
}
