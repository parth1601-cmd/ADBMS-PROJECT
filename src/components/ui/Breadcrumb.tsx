import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
export function Breadcrumb({items}:{items:{label:string; to?:string}[]}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
      {items.map((it, i)=>(
        <span key={i} className="flex items-center gap-1.5">
          {i>0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          {it.to ? <Link to={it.to} className="text-slate-500 hover:text-slate-900">{it.label}</Link> : <span className="text-slate-900 font-medium">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}
