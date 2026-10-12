import { useParams, Link } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { CheckCircle2, Clock3, FileText } from "lucide-react"
import { examService } from "@/services"

export default function Submitted(){
  const {id} = useParams()
  const exam = examService.getAllExamsCombined().find(e=>e.id===id)
  const submittedAt = (()=>{ try{ const v=JSON.parse(localStorage.getItem(`eg_submitted_${id}`)||"null"); return v?.at ? new Date(v.at).toLocaleString() : new Date().toLocaleString()}catch{return new Date().toLocaleString()}})()
  if(!exam) return <div>Not found</div>
  return (
    <div className="max-w-[560px] mx-auto py-8 space-y-6">
      <Card className="overflow-hidden text-center">
        <div className="h-1.5 bg-emerald-500" />
        <CardContent className="p-8">
          <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 grid place-items-center mx-auto"><CheckCircle2 className="h-7 w-7 text-emerald-600"/></div>
          <h1 className="text-[20px] font-semibold text-slate-900 mt-4">Exam Submitted Successfully</h1>
          <p className="text-sm text-slate-500 mt-1">Your responses have been recorded.</p>

          <div className="grid grid-cols-3 gap-3 mt-6 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Exam</div><div className="text-sm font-medium text-slate-900 mt-1">{exam.title}</div></div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Submitted</div><div className="text-sm font-medium text-slate-900 mt-1">{submittedAt}</div></div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Status</div><div className="text-sm font-semibold text-emerald-700 mt-1">Submitted</div></div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 mt-6 flex items-center gap-3 text-left">
            <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center"><FileText className="h-5 w-5 text-slate-600"/></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">Questions answered</div>
              <div className="text-xs text-slate-500">30 / {exam.questionsCount} • Auto-saved</div>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">Complete</span>
          </div>

          <div className="flex gap-3 mt-6">
            <Link to="/student/dashboard" className="flex-1"><Button className="w-full">Return to Dashboard</Button></Link>
            <Link to="/student/exams" className="flex-1"><Button variant="secondary" className="w-full">View My Exams</Button></Link>
          </div>

          <p className="text-xs text-slate-500 mt-4">Integrity signals, if any, will be reviewed by your teacher. You’ll be contacted only if follow-up is needed.</p>
        </CardContent>
      </Card>
    </div>
  )
}
