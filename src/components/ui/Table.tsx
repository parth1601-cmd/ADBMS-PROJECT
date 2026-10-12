import * as React from "react"
import { cn } from "@/lib/cn"

export function Table({className, ...props}: React.HTMLAttributes<HTMLTableElement>) {
  return <div className="w-full overflow-auto rounded-xl border border-slate-200 bg-white"><table className={cn("w-full text-sm", className)} {...props} /></div>
}
export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) { return <thead className="bg-slate-50" {...props} /> }
export function TH({className, ...props}: React.ThHTMLAttributes<HTMLTableCellElement>) { return <th scope="col" className={cn("text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-4 py-3 whitespace-nowrap border-b border-slate-200", className)} {...props} /> }
export function TD({className, ...props}: React.TdHTMLAttributes<HTMLTableCellElement>) { return <td className={cn("px-4 py-3.5 text-[13px] text-slate-700 border-b border-slate-100 align-middle", className)} {...props} /> }
export function TR({className, ...props}: React.HTMLAttributes<HTMLTableRowElement>) { return <tr className={cn("hover:bg-slate-50/70 transition-colors", className)} {...props} /> }
