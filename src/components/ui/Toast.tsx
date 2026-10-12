import * as React from "react"
import { X, CheckCircle2, Info, AlertTriangle } from "lucide-react"

type Toast = {id:string; title:string; description?:string; variant?: "success"|"info"|"warning"|"error"|"danger"}

const Ctx = React.createContext<{toast:(t:Omit<Toast,"id">)=>void} | null>(null)

export function ToastProvider({children}:{children:React.ReactNode}) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const toast = React.useCallback((t:Omit<Toast,"id">)=>{
    const id = (typeof crypto!=='undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `toast-${Date.now()}-${performance.now().toString(36).slice(2,9)}`
    setToasts(s=>[...s, {id, ...t}])
    setTimeout(()=>setToasts(s=>s.filter(x=>x.id!==id)), 3500)
  },[])
  return (
    <Ctx.Provider value={{toast}}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-32px)]">
        {toasts.map(t=>(
          <div key={t.id} className={`rounded-xl shadow-xl px-4 py-3 flex gap-3 items-start border ${t.variant==="success" ? "bg-emerald-600 text-white border-emerald-700" : t.variant==="warning" ? "bg-amber-600 text-white border-amber-700" : t.variant==="error" || t.variant==="danger" ? "bg-red-600 text-white border-red-700" : "bg-slate-900 text-white border-slate-800"}`}>
            {t.variant==="success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-white"/> : t.variant==="warning" ? <AlertTriangle className="h-4 w-4 mt-0.5 text-white"/> : t.variant==="error" || t.variant==="danger" ? <AlertTriangle className="h-4 w-4 mt-0.5 text-white"/> : <Info className="h-4 w-4 mt-0.5 text-sky-300"/>}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-5">{t.title}</div>
              {t.description && <div className="text-[12.5px] leading-5 text-slate-300">{t.description}</div>}
            </div>
            <button onClick={()=>setToasts(s=>s.filter(x=>x.id!==t.id))} className="opacity-60 hover:opacity-100"><X className="h-4 w-4"/></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
export function useToast(){ const c=React.useContext(Ctx); if(!c) throw new Error("useToast requires provider"); return c }
