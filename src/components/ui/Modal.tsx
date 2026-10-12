import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/cn"

export function Modal({open, onClose, title, description, children, className}:{open:boolean; onClose:()=>void; title?:string; description?:string; children: React.ReactNode; className?:string}) {
  React.useEffect(()=>{
    if(!open) return
    const onKey=(e:KeyboardEvent)=>{ if(e.key==="Escape") onClose() }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow="hidden"
    return ()=>{ document.removeEventListener("keydown", onKey); document.body.style.overflow=""}
  },[open,onClose])
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby={title? "modal-title": undefined} className={cn("relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 max-h-[90vh] overflow-auto", className)}>
        {(title || description) && (
          <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              {title && <h3 id="modal-title" className="text-[15px] font-semibold text-slate-900 leading-5">{title}</h3>}
              {description && <p className="text-[13px] text-slate-600 mt-1 leading-4">{description}</p>}
            </div>
            <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0" aria-label="Close dialog"><X className="h-4 w-4" aria-hidden/></button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Dialog({open, onClose, title, children}:{open:boolean; onClose:()=>void; title:string; children:React.ReactNode}) {
  return <Modal open={open} onClose={onClose} title={title}>{children}</Modal>
}
