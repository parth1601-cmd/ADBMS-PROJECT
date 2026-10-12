import { useParams, Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Alert } from "@/components/ui/Alert"
import { ShieldAlert, Clock3, FileText, CheckCircle2, Calendar } from "lucide-react"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"

export default function Instructions(){
  const {id} = useParams()
  const navigate = useNavigate()
  const [exam,setExam]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [checked,setChecked]=useState(false)
  const [starting,setStarting]=useState(false)
  useEffect(()=>{
    studentApi.getStudentExamById(id!).then(setExam).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[id])
  const handleStart = async ()=>{
    if(!checked) return
    setStarting(true)
    try{
      const res = await studentApi.startExam(id!)
      navigate(`/student/exams/${id}/take?session=${res.session.id}`)
    }catch(e:any){
      setError(e.message)
    }finally{ setStarting(false)}
  }
  if(loading) return <LoadingState label="Loading instructions..." />
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  if(!exam) return <div>Not found</div>
  const isExpired = exam.endAt && new Date() > new Date(exam.endAt)
  const isNotStarted = exam.startAt && new Date() < new Date(exam.startAt)
  return (
    <div className="max-w-[760px] mx-auto space-y-6">
      <Breadcrumb items={[{label:"My Exams", to:"/student/tests"}, {label: exam.title}]} />
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-indigo-600" />
        <CardContent className="p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-[20px] font-semibold text-slate-900">{exam.title}</h1>
            <p className="text-sm text-slate-500 mt-1">{exam.subject} • {exam.teacher?.name} • {exam.questionsCount} questions • {exam.totalMarks} marks • {exam.durationMinutes} minutes</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-600">
              {exam.startAt && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200"><Calendar className="h-3 w-3"/> Start: {new Date(exam.startAt).toLocaleString()}</span>}
              {exam.endAt && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200"><Calendar className="h-3 w-3"/> End: {new Date(exam.endAt).toLocaleString()}</span>}
              <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">Attempt limit: {exam.attemptsAllowed}</span>
              {exam.session && <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Session {exam.session.status}</span>}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center"><Clock3 className="h-4 w-4 mx-auto text-slate-600"/><div className="text-xs tracking-widest uppercase font-semibold text-slate-500 mt-1">Duration</div><div className="text-sm font-semibold text-slate-900">{exam.durationMinutes} min</div></div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center"><FileText className="h-4 w-4 mx-auto text-slate-600"/><div className="text-xs tracking-widest uppercase font-semibold text-slate-500 mt-1">Questions</div><div className="text-sm font-semibold text-slate-900">{exam.questionsCount}</div></div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center"><CheckCircle2 className="h-4 w-4 mx-auto text-slate-600"/><div className="text-xs tracking-widest uppercase font-semibold text-slate-500 mt-1">Total Marks</div><div className="text-sm font-semibold text-slate-900">{exam.totalMarks}</div></div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Instructions</h3>
            <p className="text-sm leading-6 text-slate-600 mt-2">{exam.instructions || 'Please answer all questions. No external aids.'} Ensure stable connection. Timer will auto-submit on expiry. Server-authoritative timer.</p>
            <ul className="mt-3 list-disc pl-5 text-sm leading-6 text-slate-600 space-y-1">
              <li>Answer all required questions.</li>
              <li>You can navigate between questions and change answers before submission.</li>
              <li>Answers are auto-saved to server.</li>
              <li>Integrity signals are recorded for teacher review only.</li>
              <li>Click “Start Test” to begin. Timer starts immediately.</li>
            </ul>
          </div>

          <Card className="p-4 bg-indigo-50/50 border-indigo-200">
            <h4 className="text-sm font-semibold text-slate-900">Exam Integrity</h4>
            <p className="text-sm leading-6 text-slate-600 mt-1">ExamGuard records selected exam-related activity signals to help teachers review unusual examination activity. These signals do not automatically determine that a student cheated.</p>
            <p className="text-xs text-slate-500 mt-2">Signals may include: tab visibility changes, answer timing, rapid answer changes, copy/paste activity, answer-pattern similarity.</p>
          </Card>

          <Alert variant="warning" title="Exam Integrity Notice">
            During this assessment, ExamGuard records certain exam-related events such as focus changes, answer changes, timing information, and relevant copy/paste events.
            <br/><br/>
            These signals are used to identify unusual activity for teacher review. A signal does not automatically mean that a student has violated academic integrity.
          </Alert>

          {isNotStarted && <Alert variant="danger" title="Not yet available">This exam starts at {new Date(exam.startAt).toLocaleString()}. You cannot start early.</Alert>}
          {isExpired && <Alert variant="danger" title="Exam window closed">This assessment is no longer available.</Alert>}

          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" />
            <span className="text-sm text-slate-700">I have read and understood the instructions.</span>
          </label>

          <div className="flex gap-3">
            <Button size="lg" className="flex-1" disabled={!checked || isExpired || isNotStarted} loading={starting} onClick={handleStart}>Start Test</Button>
            <Link to="/student/tests"><Button variant="secondary" size="lg">Cancel</Button></Link>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
            <ShieldAlert className="h-3.5 w-3.5"/> Privacy: exam-scoped signals only. No browsing history collected.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
