import { Link } from "react-router-dom"
import { FileQuestion, ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/brand/Logo"

export default function NotFound(){
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="h-[56px] bg-white border-b border-slate-200 flex items-center px-6">
        <Logo size={28} />
        <span className="ml-2 font-semibold tracking-tight text-slate-900">ExamGuard</span>
        <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold tracking-widest uppercase text-slate-600">Secure Assessment</span>
      </header>
      <main className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-[560px] text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white border border-slate-200 grid place-items-center shadow-subtle">
            <FileQuestion className="h-8 w-8 text-slate-500"/>
          </div>
          <div className="mt-6 inline-flex px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold tracking-widest uppercase">404</div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 mt-3">Page not found</h1>
          <p className="text-[14px] leading-6 text-slate-600 mt-2 max-w-[440px] mx-auto">The page you’re looking for doesn’t exist or may have moved. Check the address or return to your dashboard.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link to="/"><Button variant="secondary" className="gap-1.5"><ArrowLeft className="h-4 w-4"/> Go back</Button></Link>
            <Link to="/"><Button className="gap-1.5"><Home className="h-4 w-4"/> Back to Home</Button></Link>
          </div>
          <div className="mt-8 rounded-xl bg-white border border-slate-200 p-4 text-left">
            <div className="text-xs font-semibold tracking-widest uppercase text-slate-500">Need help?</div>
            <div className="text-sm text-slate-600 mt-1">If you reached this page from inside ExamGuard, please report it via Help or contact your administrator. Error code: 404 · EXAMGUARD_NOT_FOUND</div>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-slate-500">ExamGuard — Secure Assessment & Integrity Platform</footer>
    </div>
  )
}
