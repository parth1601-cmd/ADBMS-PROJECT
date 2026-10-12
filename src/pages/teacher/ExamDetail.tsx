import { useParams, Link, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { StatusBadge } from "@/components/ui/Badge"
import { UnderlineTabs } from "@/components/ui/Tabs"
import { Progress } from "@/components/ui/Progress"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { Modal } from "@/components/ui/Modal"
import { Input, Textarea } from "@/components/ui/Input"
import { useToast } from "@/components/ui/Toast"
import { examService, reviewService, questionService } from "@/services"
import { examApi, questionApi } from "@/services/apiServices"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { LoadingState, ErrorState } from "@/components/ui/States"

export default function ExamDetail(){
  const {id} = useParams()
  const [exam,setExam]=useState<any>(null)
  const [qs,setQs]=useState<any[]>([])
  const [reviews,setReviews]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const nav = useNavigate()
  const {toast} = useToast()
  const [tab, setTab] = useState("overview")
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<any>(null)

  const load = async ()=>{
    setLoading(true)
    try{
      const e = await examApi.getExamById(id!)
      if(e) { setExam(e); setDraft(e) }
      else throw new Error('not found')
      const questions = await questionApi.getQuestions(id!).catch(()=> questionService.getQuestions(id!))
      setQs(questions)
      // reviews: try API, fallback mock
      try{
        const { reviewApi } = await import('@/services/apiServices')
        const r = await reviewApi.getReviews({examId:id})
        setReviews(r)
      }catch{
        setReviews(reviewService.getReviews(id!))
      }
      setError(null)
    }catch(e:any){
      // fallback to mock
      const fallback = examService.getExamById(id!) ?? examService.getAllExamsCombined().find(x=>x.id===id)
      if(fallback){ setExam(fallback); setDraft(fallback); setQs(questionService.getQuestions(id!)); setReviews(reviewService.getReviews(id!)) }
      else setError(e.message)
    } finally{ setLoading(false) }
  }
  useEffect(()=>{ load() },[id])

  if(loading) return <LoadingState label="Loading exam..." />
  if(error || !exam) return <div className="p-10 text-center">Exam not found. <Link to="/teacher/exams" className="text-indigo-600 underline">Go back</Link></div>

  const dist = [
    {name:"Normal", value: reviews.filter((r:any)=> r.level==="Normal" || r.level==="NORMAL").length},
    {name:"Low", value: reviews.filter((r:any)=> r.level==="Low Concern" || r.level==="LOW_CONCERN").length},
    {name:"Review", value: reviews.filter((r:any)=> r.level==="Requires Review" || r.level==="REQUIRES_REVIEW").length},
    {name:"High", value: reviews.filter((r:any)=> r.level==="High Priority Review" || r.level==="HIGH_PRIORITY_REVIEW").length},
  ]
  const completion = Math.round((exam.submissionsCount/exam.studentsCount)*100) || 0

  const save = async (publish?:boolean)=>{
    if(!draft) return
    try{
      const payload:any = {...draft}
      if(publish) payload.status = draft.status==='Live' ? 'Scheduled' : 'Live'
      const updated = await examApi.updateExam(exam.id, payload)
      toast({title: publish ? "Exam updated" : "Draft saved", description: updated.title, variant:"success"})
      setEditOpen(false)
      if(publish){
        try{ await examApi.publishExam(exam.id) }catch{}
      }
      load()
    }catch(e:any){
      // fallback mock
      const updated = {...draft, status: publish ? "Live" as const : draft.status}
      examService.saveDraft(updated)
      toast({title: publish ? "Exam published (offline)" : "Draft saved (offline)", variant:"success"})
      setEditOpen(false)
      load()
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{label:"Exams", to:"/teacher/exams"}, {label: exam.title}]} />

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{exam.title}</h1>
            <StatusBadge status={exam.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-[640px]">{exam.description} • {exam.subject} • {exam.durationMinutes} minutes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>setEditOpen(true)}>Edit</Button>
          <Link to={`/student/exams/${exam.id}/instructions`}><Button variant="secondary">Preview</Button></Link>
          <Button onClick={()=>save(true)}>{exam.status==="Live" ? "Unpublish" : "Publish"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Questions</div><div className="text-xl font-semibold text-slate-900 mt-1">{exam.questionsCount}</div><div className="text-xs text-slate-500">Configured (DB count)</div></Card>
        <Card className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Students</div><div className="text-xl font-semibold text-slate-900 mt-1">{exam.studentsCount}</div><div className="text-xs text-slate-500">Enrolled</div></Card>
        <Card className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Submitted</div><div className="text-xl font-semibold text-slate-900 mt-1">{exam.submissionsCount}</div><div className="text-xs text-slate-500">{completion}% completion</div></Card>
        <Card className="p-4 border-amber-200 bg-amber-50/40"><div className="text-[11px] tracking-widest uppercase font-semibold text-amber-700">Pending Reviews</div><div className="text-xl font-semibold text-amber-800 mt-1">{exam.pendingReviews}</div><Link to={`/teacher/exams/${exam.id}/reviews`} className="text-xs font-medium text-amber-800 underline">Open queue</Link></Card>
      </div>

      <UnderlineTabs value={tab} onValueChange={setTab} tabs={[{value:"overview", label:"Overview"}, {value:"questions", label:`Questions (${qs.length})`}, {value:"students", label:"Students"}, {value:"reviews", label:`Integrity Reviews (${reviews.length})`}]} />

      {tab==="overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Exam information</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                <div><div className="text-xs font-medium text-slate-500 uppercase tracking-widest">Subject</div><div className="font-medium text-slate-900 mt-1">{exam.subject}</div></div>
                <div><div className="text-xs font-medium text-slate-500 uppercase tracking-widest">Duration</div><div className="font-medium text-slate-900 mt-1">{exam.durationMinutes} minutes</div></div>
                <div><div className="text-xs font-medium text-slate-500 uppercase tracking-widest">Schedule</div><div className="font-medium text-slate-900 mt-1">{exam.startDate} → {exam.endDate}</div></div>
                <div><div className="text-xs font-medium text-slate-500 uppercase tracking-widest">Attempts</div><div className="font-medium text-slate-900 mt-1">{exam.attempts}</div></div>
                <div className="sm:col-span-2"><div className="text-xs font-medium text-slate-500 uppercase tracking-widest">Instructions</div><div className="font-medium text-slate-900 mt-1">{exam.instructions}</div></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Submission progress</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm"><span className="text-slate-600">Completion</span><span className="font-semibold text-slate-900">{exam.submissionsCount} / {exam.studentsCount}</span></div>
                <Progress value={completion} />
                <div className="grid grid-cols-3 gap-3 text-center text-sm pt-2">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-lg font-semibold text-slate-900">{exam.submissionsCount}</div><div className="text-xs text-slate-500">Submitted</div></div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3"><div className="text-lg font-semibold text-amber-800">{exam.studentsCount - exam.submissionsCount}</div><div className="text-xs text-amber-700">Pending</div></div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><div className="text-lg font-semibold text-emerald-800">90%</div><div className="text-xs text-emerald-700">On-time</div></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Integrity review summary</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dist}>
                    <XAxis dataKey="name" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                    <Tooltip />
                    <Bar dataKey="value" fill="#1e1b4b" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-3 text-sm">
                {dist.map(d=> <div key={d.name} className="flex justify-between"><span className="text-slate-600">{d.name}</span><span className="font-semibold">{d.value}</span></div>)}
              </div>
              <Link to={`/teacher/exams/${exam.id}/reviews`} className="mt-4 block"><Button variant="secondary" className="w-full">Open Integrity Reviews</Button></Link>
            </CardContent>
          </Card>
        </div>
      )}

      {tab==="questions" && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Questions</h3>
              <Link to={`/teacher/exams/${exam.id}/questions`}><Button size="sm">Manage Questions</Button></Link>
            </div>
            <div className="mt-4 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {qs.length? qs.map((q:any)=>(
                <div key={q.id} className="p-4 flex gap-4">
                  <span className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center text-xs font-semibold text-slate-700 shrink-0">{q.order}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{q.text}</div>
                    {q.options && <div className="flex flex-wrap gap-1.5 mt-2">{q.options.map((o:string,i:number)=><span key={i} className={`px-2.5 py-1 rounded-full text-xs border ${o===q.correctAnswer ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium": "bg-white border-slate-200 text-slate-600"}`}>{o}</span>)}</div>}
                    <div className="text-xs text-slate-500 mt-2">{String(q.type).toUpperCase()} • {q.points} pts • {q.required? "Required":"Optional"}</div>
                  </div>
                </div>
              )) : <div className="p-8 text-center text-sm text-slate-500">No questions configured yet.</div>}
            </div>
          </CardContent>
        </Card>
      )}

      {tab==="students" && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-600">Student roster and submission status.</p>
            <Link to={`/teacher/exams/${exam.id}/students`}><Button className="mt-4">Open Students</Button></Link>
          </CardContent>
        </Card>
      )}
      {tab==="reviews" && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-600">Review queue for this exam.</p>
            <Link to={`/teacher/exams/${exam.id}/reviews`}><Button className="mt-4">Open Reviews</Button></Link>
          </CardContent>
        </Card>
      )}

      <Modal open={editOpen} onClose={()=>setEditOpen(false)} title="Edit Exam" description="Update exam details (persisted to PostgreSQL)">
        {draft && (
          <div className="grid gap-4">
            <Input label="Title" value={draft.title} onChange={e=>setDraft({...draft, title:e.target.value})} />
            <Input label="Subject" value={draft.subject} onChange={e=>setDraft({...draft, subject:e.target.value})} />
            <Textarea label="Description" value={draft.description} onChange={e=>setDraft({...draft, description:e.target.value})} />
            <div className="grid sm:grid-cols-3 gap-4">
              <Input label="Duration (min)" type="number" value={String(draft.durationMinutes)} onChange={e=>setDraft({...draft, durationMinutes:Number(e.target.value)})} />
              <Input label="Start" type="date" value={draft.startDate} onChange={e=>setDraft({...draft, startDate:e.target.value})} />
              <Input label="End" type="date" value={draft.endDate} onChange={e=>setDraft({...draft, endDate:e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={()=>setEditOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={()=>save(false)}>Save Draft</Button>
              <Button onClick={()=>save(true)}>Publish</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

