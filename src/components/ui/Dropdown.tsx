import * as React from "react"
import { cn } from "@/lib/cn"
export function Dropdown({trigger, children}:{trigger:React.ReactNode; children:React.ReactNode}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false)}
    document.addEventListener("mousedown",h)
    return ()=>document.removeEventListener("mousedown",h)
  },[])
  return (
    <div ref={ref} className="relative">
      <div onClick={()=>setOpen(v=>!v)} className="cursor-pointer">{trigger}</div>
      {open && <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-card p-1 z-20">{children}</div>}
    </div>
  )
}
export function DropdownItem({children, onClick, danger}:{children:React.ReactNode; onClick?:()=>void; danger?:boolean}) {
  return <button onClick={onClick} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50 flex items-center gap-2", danger?"text-red-600":"text-slate-700")}>{children}</button>
}
