import { Link } from "react-router-dom"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/brand/Logo"

export default function ServerError({ onRetry }: { onRetry?: () => void }){
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="h-[56px] bg-white border-b border-slate-200 flex items-center px-6">
        <Logo size={28} />
        <span className="ml-2 font-semibold tracking-tight text-slate-900">ExamGuard</span>
      </header>
      <main className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-[560px] text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-red-50 border border-red-200 grid place-items-center">
            <AlertTriangle className="h-8 w-8 text-red-600"/>
          </div>
          <div className="mt-6 inline-flex px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold tracking-widest uppercase">500</div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 mt-3">Something went wrong</h1>
          <p className="text-[14px] leading-6 text-slate-600 mt-2 max-w-[440px] mx-auto">Please try again. If the problem continues, contact your administrator. No data was lost — your answers remain safely stored on the server.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            {onRetry ? <Button onClick={onRetry} className="gap-1.5"><RefreshCw className="h-4 w-4"/> Retry</Button> : <button onClick={()=> location.reload()} className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-slate-900 text-white text-[13px] font-medium"><RefreshCw className="h-4 w-4"/> Retry</button>}
            <Link to="/"><Button variant="secondary" className="gap-1.5"><Home className="h-4 w-4"/> Dashboard</Button></Link>
          </div>
          <div className="mt-8 rounded-xl bg-white border border-slate-200 p-4 text-left">
            <div className="text-xs font-semibold tracking-widest uppercase text-slate-500">What to do</div>
            <div className="text-sm text-slate-600 mt-1">• Refresh the page • Check your connection • Return to dashboard • Contact support with time and exam name. Error code: 500 · INTERNAL</div>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-slate-500">ExamGuard — Server-authoritative & autosave protected</footer>
    </div>
  )
}
