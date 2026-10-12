import { Link } from "react-router-dom"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/brand/Logo"

export default function Forbidden(){
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="h-[56px] bg-white border-b border-slate-200 flex items-center px-6">
        <Logo size={28} />
        <span className="ml-2 font-semibold tracking-tight text-slate-900">ExamGuard</span>
      </header>
      <main className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-[560px] text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 grid place-items-center">
            <ShieldAlert className="h-8 w-8 text-amber-600"/>
          </div>
          <div className="mt-6 inline-flex px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold tracking-widest uppercase">403</div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 mt-3">Access restricted</h1>
          <p className="text-[14px] leading-6 text-slate-600 mt-2 max-w-[440px] mx-auto">You don’t have permission to view this page. If you believe this is an error, contact your administrator or switch to the correct portal.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link to="/"><Button variant="secondary" className="gap-1.5"><ArrowLeft className="h-4 w-4"/> Go back</Button></Link>
            <Link to="/"><Button>Return to Dashboard</Button></Link>
          </div>
          <div className="mt-8 rounded-xl bg-white border border-slate-200 p-4 text-left">
            <div className="text-xs font-semibold tracking-widest uppercase text-slate-500">Privacy note</div>
            <div className="text-sm text-slate-600 mt-1">ExamGuard enforces role-based access control. Student and teacher data are isolated. Error code: 403 · FORBIDDEN</div>
          </div>
        </div>
      </main>
      <footer className="py-6 text-center text-xs text-slate-500">ExamGuard — Role-based authorization active</footer>
    </div>
  )
}
