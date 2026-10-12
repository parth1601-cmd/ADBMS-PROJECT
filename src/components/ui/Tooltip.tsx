import * as React from "react"
export function Tooltip({content, children}:{content:string; children:React.ReactNode}) {
  const [open, setOpen] = React.useState(false)
  return (
    <span className="relative inline-flex" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)}>
      {children}
      {open && <span role="tooltip" className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] whitespace-nowrap bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg z-20">{content}<span className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-900 rotate-45 -mt-1" /></span>}
    </span>
  )
}
