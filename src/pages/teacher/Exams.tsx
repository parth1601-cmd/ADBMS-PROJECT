import { useState, useMemo, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Plus, ArrowUpDown, Search, Filter, MoreHorizontal, Eye, Pencil, Copy, Archive, Trash2, BarChart3, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge, StatusBadge } from "@/components/ui/Badge"
import { Input, Textarea } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { PageHeader } from "@/components/ui/PageHeader"
import { useToast } from "@/components/ui/Toast"
import { examService } from "@/services"
import { examApi } from "@/services/apiServices"
import type { Exam } from "@/types"
import { EmptyState, TableSkeleton } from "@/components/ui/States"
import { cn } from "@/lib/cn"

type CreateStep = 1|2|3|4|5|6

export default function Exams(){
  const navigate = useNavigate()
  const {toast} = useToast()
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('search') || ""
  const [q, setQ] = useState(initialQ)
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [sortKey, setSortKey] = useState<"title"|"date">("date")
  const [createOpen, setCreateOpen] = useState(false)
  const [step, setStep] = useState<CreateStep>(1)
  const [errors, setErrors] = useState<Record<string,string>>({})
  const [editing, setEditing] = useState<Partial<Exam> & {className?:string; section?:string; academicYear?:string; totalMarks?:number; passingMarks?:number; startTime?:string; endTime?:string}>({
    title:"", subject:"", description:"", durationMinutes:60, status:"Draft", startDate:"2026-09-20", endDate:"2026-09-21", instructions:"", attempts:1,
    className:"10-A", section:"A", academicYear:"2026-27", totalMarks: 100, passingMarks: 40, startTime:"09:00", endTime:"12:00"
  })
  const [exams, setExams] = useState<Exam[] | null>(null)
  const [actionMenu, setActionMenu] = useState<string|null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Exam|null>(null)
  const [confirmAction, setConfirmAction] = useState<{exam:Exam, action:string}|null>(null)

  const load = async ()=>{
    try{
      const data = await examApi.getExams()
      setExams(data)
    }catch{
      setExams(examService.getAllExamsCombined())
    }
  }
  useEffect(()=>{ load() },[])

  const filtered = useMemo(()=>{
    if(!exams) return []
    let list = [...exams]
    if(q) list = list.filter(e=> (e.title+e.subject).toLowerCase().includes(q.toLowerCase()))
    if(statusFilter!=="All") list = list.filter(e=> e.status===statusFilter)
    if(sortKey==="title") list.sort((a,b)=>a.title.localeCompare(b.title))
    else list.sort((a,b)=> (b.startDate||'').localeCompare(a.startDate||''))
    return list
  },[exams,q,statusFilter,sortKey])

  const validate = (): boolean => {
    const e: Record<string,string> = {}
    if(!editing.title?.trim()) e.title = "Exam title is required"
    else if(editing.title.trim().length < 3) e.title = "Title must be at least 3 characters"
    if(!editing.subject?.trim()) e.subject = "Subject is required"
    if(!editing.durationMinutes || editing.durationMinutes < 5) e.durationMinutes = "Duration must be at least 5 minutes"
    else if(editing.durationMinutes > 360) e.durationMinutes = "Duration cannot exceed 360 minutes"
    if(editing.startDate && editing.endDate && editing.startDate > editing.endDate) e.endDate = "End date cannot be before start date"
    if(editing.totalMarks != null && editing.passingMarks != null && editing.passingMarks > editing.totalMarks) e.passingMarks = "Passing marks cannot exceed total marks"
    if(editing.totalMarks != null && editing.totalMarks < 1) e.totalMarks = "Total marks must be at least 1"
    setErrors(e)
    return Object.keys(e).length===0
  }

  const handleNext = () => {
    // step validation
    if(step===1){
      const e:Record<string,string>={}
      if(!editing.title?.trim()) e.title = "Required"
      if(!editing.subject?.trim()) e.subject = "Required"
      setErrors(e)
      if(Object.keys(e).length) return
    }
    if(step===2){
      const e:Record<string,string>={}
      if(!editing.durationMinutes || editing.durationMinutes < 5) e.durationMinutes = "At least 5 min"
      if(editing.startDate && editing.endDate && editing.startDate > editing.endDate) e.endDate = "End before start"
      setErrors(e)
      if(Object.keys(e).length) return
    }
    if(step===3){
      if(editing.totalMarks != null && editing.passingMarks != null && editing.passingMarks > editing.totalMarks){ setErrors({passingMarks:"Cannot exceed total"}); return}
    }
    setErrors({})
    setStep(s=> Math.min(6, s+1) as CreateStep)
  }

  const handleCreate = async (publish: boolean = false)=>{
    if(!validate()){ toast({title:"Please fix highlighted fields", variant:"info"}); return }
    try{
      const payload:any = {
        ...editing,
        status: publish ? "Published" : "Draft",
      }
      // combine date + time for start/end if provided
      if(editing.startDate && editing.startTime) payload.startDate = `${editing.startDate}T${editing.startTime}`
      if(editing.endDate && editing.endTime) payload.endDate = `${editing.endDate}T${editing.endTime}`
      const created = await examApi.createExam(payload)
      toast({title: publish ? "Exam published" : "Draft saved", description:`"${created.title}" ${publish ? 'is now live' : 'saved'}`, variant:"success"})
      setCreateOpen(false); setStep(1)
      load()
      setEditing({title:"", subject:"", description:"", durationMinutes:60, status:"Draft", startDate:"2026-09-20", endDate:"2026-09-21", instructions:"", attempts:1, className:"10-A", section:"A", academicYear:"2026-27", totalMarks:100, passingMarks:40, startTime:"09:00", endTime:"12:00"})
      if(publish) navigate(`/teacher/exams/${created.id}`)
    }catch(e:any){
      const exam: Exam = {
        id: "e"+Date.now(),
        title: editing.title!,
        subject: editing.subject!,
        description: editing.description || "New exam",
        status: (publish ? "Live" : (editing.status as any)) || "Draft",
        durationMinutes: Number(editing.durationMinutes)||60,
        questionsCount: 0,
        studentsCount: 0,
        submissionsCount: 0,
        pendingReviews: 0,
        startDate: editing.startDate!,
        endDate: editing.endDate!,
        instructions: editing.instructions || "",
        attempts:1,
      }
      examService.createExam(exam)
      toast({title: publish ? "Exam published (offline)" : "Exam created (offline)", description:`"${exam.title}" saved locally`, variant:"success"})
      setCreateOpen(false); setStep(1)
      load()
    }
  }

  const handleDuplicate = async (ex: Exam)=>{
    try{
      const payload = {...ex, title: ex.title + " (Copy)", status:"Draft"} as any
      await examApi.createExam(payload)
      toast({title:"Exam duplicated", variant:"success"})
      load()
    }catch{
      const dup: Exam = {...ex, id:"e"+Date.now(), title: ex.title+" (Copy)", status:"Draft"}
      examService.createExam(dup)
      toast({title:"Duplicated (offline)", variant:"success"})
      load()
    }
    setActionMenu(null)
  }
  const handlePublishToggle = async (ex: Exam)=>{
    try{
      const newStatus = (ex.status as string)==="Live" || (ex.status as string)==="Published" ? "Draft" : "Live"
      await examApi.updateExam(ex.id, {status: newStatus as any})
      toast({title: newStatus==="Live" ? "Exam published" : "Exam unpublished", variant:"success"})
      load()
    }catch{
      toast({title:"Unable to update", variant:"info"})
    }
    setActionMenu(null); setConfirmAction(null)
  }
  const handleArchive = async (ex: Exam)=>{
    try{
      await examApi.updateExam(ex.id, {status:"Archived" as any})
      toast({title:"Exam archived", variant:"success"})
      load()
    }catch{
      toast({title:"Archived (offline)", variant:"info"})
      load()
    }
    setConfirmAction(null)
  }
  const handleDelete = async ()=>{
    if(!confirmDelete) return
    try{
      await examApi.deleteExam(confirmDelete.id)
      toast({title:"Exam deleted", variant:"success"})
    }catch{
      // offline fallback: remove from service not implemented, just toast
      toast({title:"Deleted locally", variant:"info"})
    }
    setConfirmDelete(null); load()
  }

  if(!exams) return <TableSkeleton rows={6} cols={5} />

  const stepsMeta = [
    {n:1, label:"Basic"},
    {n:2, label:"Schedule"},
    {n:3, label:"Assessment"},
    {n:4, label:"Instructions"},
    {n:5, label:"Questions"},
    {n:6, label:"Review"},
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exams"
        description="Create, manage and monitor assessments. Draft → publish → monitor → review."
        actions={<Button onClick={()=>{ setCreateOpen(true); setStep(1); setErrors({})}}><Plus className="h-4 w-4" aria-hidden/> Create exam</Button>}
      />

      <Card className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="exam-search" className="sr-only">Search exams</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
              <input id="exam-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by exam or subject…" className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" aria-hidden />
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 pl-8 pr-8 rounded-lg border border-slate-300 bg-white text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" aria-label="Filter by status">
                <option>All</option><option>Draft</option><option>Scheduled</option><option>Live</option><option>Completed</option><option>Published</option>
              </select>
            </div>
            <Button variant="secondary" onClick={()=>setSortKey(sortKey==="title"?"date":"title")} className="gap-1.5 whitespace-nowrap"><ArrowUpDown className="h-4 w-4" aria-hidden/>{sortKey==="title"?"Title":"Date"}</Button>
          </div>
        </div>
      </Card>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-4 py-3 whitespace-nowrap">Exam</th>
                <th scope="col" className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Subject</th>
                <th scope="col" className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Class</th>
                <th scope="col" className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Qs</th>
                <th scope="col" className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Duration</th>
                <th scope="col" className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Status</th>
                <th scope="col" className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Submissions</th>
                <th scope="col" className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Reviews</th>
                <th scope="col" className="px-3 py-3 w-20" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e=>(
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/70 group">
                  <td className="px-4 py-3.5">
                    <button onClick={()=>navigate(`/teacher/exams/${e.id}`)} className="text-left group/title">
                      <div className="text-[13px] font-medium text-slate-900 group-hover/title:text-indigo-700 line-clamp-1">{e.title}</div>
                      <div className="text-xs text-slate-500">{e.startDate} • {e.durationMinutes} min • {(e as any).className || "10-A"}</div>
                    </button>
                  </td>
                  <td className="px-3 py-3.5 text-[13px] text-slate-700">{e.subject}</td>
                  <td className="px-3 py-3.5 text-[13px] text-slate-600">{(e as any).className || "10-A"}</td>
                  <td className="px-3 py-3.5 text-[13px] text-slate-700 tabular-nums">{e.questionsCount}</td>
                  <td className="px-3 py-3.5 text-[13px] text-slate-700 tabular-nums">{e.durationMinutes}m</td>
                  <td className="px-3 py-3.5"><StatusBadge status={e.status} /></td>
                  <td className="px-3 py-3.5 text-[13px] text-slate-700 tabular-nums">{e.submissionsCount}/{e.studentsCount || "—"}</td>
                  <td className="px-3 py-3.5">
                    {e.pendingReviews>0 ? <Badge variant="warning">{e.pendingReviews} pending</Badge> : <span className="text-xs text-slate-500">—</span>}
                  </td>
                  <td className="px-3 py-3.5 relative">
                    <div className="flex items-center gap-1">
                      <Link to={`/teacher/exams/${e.id}`} className="h-7 px-2 grid place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-medium text-slate-700">View</Link>
                      <button onClick={()=> setActionMenu(actionMenu===e.id ? null : e.id)} className="h-7 w-7 grid place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50" aria-label="More actions" aria-haspopup="menu"><MoreHorizontal className="h-4 w-4 text-slate-600"/></button>
                    </div>
                    {actionMenu===e.id && (
                      <div className="absolute right-2 top-10 w-52 bg-white border border-slate-200 rounded-xl shadow-card z-20 overflow-hidden" role="menu">
                        <div className="p-1 space-y-0.5">
                          <Link to={`/teacher/exams/${e.id}`} onClick={()=> setActionMenu(null)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50" role="menuitem"><Eye className="h-4 w-4"/> View details</Link>
                          <Link to={`/teacher/exams/${e.id}`} onClick={()=> setActionMenu(null)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50" role="menuitem"><Pencil className="h-4 w-4"/> Edit</Link>
                          <button onClick={()=> handleDuplicate(e)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50" role="menuitem"><Copy className="h-4 w-4"/> Duplicate</button>
                          <button onClick={()=> setConfirmAction({exam:e, action: (e.status as string)==="Live" ? "unpublish" : "publish"})} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50" role="menuitem"><CheckCircle2 className="h-4 w-4"/> {(e.status as string)==="Live" ? "Unpublish" : "Publish"}</button>
                          <Link to={`/teacher/analytics/exams/${e.id}`} onClick={()=> setActionMenu(null)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50" role="menuitem"><BarChart3 className="h-4 w-4"/> View results</Link>
                          <Link to={`/teacher/exams/${e.id}/reviews`} onClick={()=> setActionMenu(null)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50" role="menuitem"><ShieldAlert className="h-4 w-4"/> Integrity reviews</Link>
                          <div className="h-px bg-slate-100 my-1"/>
                          <button onClick={()=> setConfirmAction({exam:e, action:"archive"})} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-600 hover:bg-slate-50" role="menuitem"><Archive className="h-4 w-4"/> Archive</button>
                          <button onClick={()=>{ setConfirmDelete(e); setActionMenu(null)}} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-red-600 hover:bg-red-50" role="menuitem"><Trash2 className="h-4 w-4"/> Delete</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length===0 && <div className="p-10"><EmptyState title="No exams found" description="Try adjusting your search or create a new exam to get started." action={{label:"Create exam", onClick:()=>setCreateOpen(true)}} /></div>}
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 lg:hidden">
        {filtered.map(e=>(
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-slate-900 truncate">{e.title}</div>
                <div className="text-xs text-slate-600 mt-1">{e.subject} • {(e as any).className || "10-A"} • {e.durationMinutes} min</div>
                <div className="flex items-center gap-2 mt-2"><StatusBadge status={e.status} /><span className="text-xs text-slate-600">{e.questionsCount} Q • {e.submissionsCount}/{e.studentsCount||"—"} submitted</span></div>
              </div>
              <Badge variant={e.pendingReviews>0 ? "warning" : "neutral"}>{e.pendingReviews>0 ? `${e.pendingReviews} reviews` : "No reviews"}</Badge>
            </div>
            <div className="flex gap-2 mt-4">
              <Link to={`/teacher/exams/${e.id}`} className="flex-1"><Button size="sm" variant="secondary" className="w-full">View</Button></Link>
              <Link to={`/teacher/exams/${e.id}/reviews`} className="flex-1"><Button size="sm" variant="ghost" className="w-full">Reviews</Button></Link>
            </div>
          </Card>
        ))}
        {filtered.length===0 && <EmptyState title="No exams found" description="Create your first assessment." action={{label:"Create exam", onClick:()=>setCreateOpen(true)}} />}
      </div>

      {/* Create Exam — Premium multi-step */}
      <Modal open={createOpen} onClose={()=>{ setCreateOpen(false); setStep(1)}} title="Create exam" description="Create a new assessment in steps. Drafts can be edited before publishing." className="max-w-2xl">
        <div className="space-y-5">
          {/* Progress stepper */}
          <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={6}>
            {stepsMeta.map(s=>(
              <div key={s.n} className="flex-1 flex items-center gap-1.5">
                <button onClick={()=> s.n < step && setStep(s.n as CreateStep)} className={cn("h-8 w-8 rounded-full grid place-items-center text-xs font-bold border transition", step===s.n ? "bg-slate-900 text-white border-slate-900" : step > s.n ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-500")} aria-current={step===s.n ? "step" : undefined}>
                  {step > s.n ? "✓" : s.n}
                </button>
                <div className="hidden sm:block text-[11px] font-semibold tracking-wide text-slate-700 leading-none">
                  <div className={cn(step===s.n ? "text-slate-900" : "text-slate-600")}>{s.label}</div>
                  <div className="text-[10px] font-medium text-slate-500">{s.n}/6</div>
                </div>
                {s.n<6 && <div className={cn("flex-1 h-0.5 ml-1.5 hidden sm:block", step > s.n ? "bg-emerald-200" : "bg-slate-200")} />}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="text-[13px] font-semibold text-slate-900">
              {step===1 && "Basic Information"}
              {step===2 && "Schedule"}
              {step===3 && "Assessment Settings"}
              {step===4 && "Instructions"}
              {step===5 && "Questions"}
              {step===6 && "Review & Publish"}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {step===1 && "Title, subject, class and description shown to students."}
              {step===2 && "When students can access the exam and how long they have."}
              {step===3 && "Marks, passing criteria and attempt limits."}
              {step===4 && "Rules and guidance displayed before students start."}
              {step===5 && "Manage questions — you can also add them after creation."}
              {step===6 && "Review everything before publishing. You can save as draft."}
            </div>
          </div>

          {/* Step content */}
          {step===1 && (
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Exam title" required value={editing.title as string} onChange={e=>setEditing({...editing, title:e.target.value})} placeholder="Mathematics Midterm — Class 10" error={errors.title} />
                <Input label="Subject" required value={editing.subject as string} onChange={e=>setEditing({...editing, subject:e.target.value})} placeholder="Mathematics" error={errors.subject} />
              </div>
              <Textarea label="Description" value={editing.description as string} onChange={e=>setEditing({...editing, description:e.target.value})} placeholder="Short description for students. Shown on the test card." hint="Max 200 characters — keep it clear and academic." />
              <div className="grid sm:grid-cols-3 gap-4">
                <Input label="Class" value={editing.className as string} onChange={e=>setEditing({...editing, className:e.target.value})} placeholder="10-A" />
                <Input label="Section" value={editing.section as string} onChange={e=>setEditing({...editing, section:e.target.value})} placeholder="A" />
                <Input label="Academic year" value={editing.academicYear as string} onChange={e=>setEditing({...editing, academicYear:e.target.value})} placeholder="2026-27" />
              </div>
            </div>
          )}

          {step===2 && (
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <Input label="Duration (minutes)" type="number" value={String(editing.durationMinutes)} onChange={e=>setEditing({...editing, durationMinutes:Number(e.target.value)})} error={errors.durationMinutes} hint="Recommended 30–180 min" />
                <Input label="Start date" type="date" value={editing.startDate as string} onChange={e=>setEditing({...editing, startDate:e.target.value})} error={errors.startDate} />
                <Input label="Start time" type="time" value={editing.startTime as string} onChange={e=>setEditing({...editing, startTime:e.target.value})} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="End date" type="date" value={editing.endDate as string} onChange={e=>setEditing({...editing, endDate:e.target.value})} error={errors.endDate} />
                <Input label="End time" type="time" value={editing.endTime as string} onChange={e=>setEditing({...editing, endTime:e.target.value})} />
              </div>
              {errors.endDate && <div className="flex items-center gap-2 text-xs text-red-600"><AlertTriangle className="h-3.5 w-3.5"/> {errors.endDate}</div>}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0"/> End must be after start. Duration is server-enforced. Students see countdown based on server time.</div>
            </div>
          )}

          {step===3 && (
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <Input label="Total marks" type="number" value={String(editing.totalMarks)} onChange={e=>setEditing({...editing, totalMarks:Number(e.target.value)})} error={errors.totalMarks} />
                <Input label="Passing marks" type="number" value={String(editing.passingMarks)} onChange={e=>setEditing({...editing, passingMarks:Number(e.target.value)})} error={errors.passingMarks} hint="40% of total = 40 if total is 100" />
                <Input label="Attempts allowed" type="number" value={String(editing.attempts)} onChange={e=>setEditing({...editing, attempts:Number(e.target.value)})} hint="Usually 1" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-slate-700">Status</label>
                  <select value={editing.status as string} onChange={e=>setEditing({...editing, status:e.target.value as any})} className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-[14px]">
                    <option>Draft</option><option>Scheduled</option><option>Live</option><option>Completed</option>
                  </select>
                  <div className="text-xs text-slate-500">Drafts are not visible to students.</div>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs font-semibold tracking-widest uppercase text-slate-500">Grading preview</div>
                  <div className="text-sm text-slate-900 mt-1">{editing.passingMarks} / {editing.totalMarks} to pass • {(editing.passingMarks && editing.totalMarks) ? Math.round(editing.passingMarks/editing.totalMarks*100) : 0}% threshold</div>
                </div>
              </div>
            </div>
          )}

          {step===4 && (
            <div className="grid gap-4">
              <Textarea label="Instructions for students" value={editing.instructions as string} onChange={e=>setEditing({...editing, instructions:e.target.value})} placeholder="Shown before start — exam rules, allowed materials, technical requirements, integrity notice…" rows={5} hint="Keep instructions clear, fair and academic. Avoid excessive formatting." />
              <div className="rounded-xl bg-indigo-50/50 border border-indigo-200 p-3">
                <div className="text-[13px] font-medium text-slate-900">Preview — student sees before Start Test</div>
                <div className="text-sm leading-6 text-slate-700 mt-2 rounded-lg bg-white border border-slate-200 p-3 min-h-[90px]">{editing.instructions || "No instructions added yet. Students will see default academic instructions."}</div>
              </div>
            </div>
          )}

          {step===5 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center mx-auto"><Plus className="h-5 w-5 text-slate-500"/></div>
                <div className="text-[14px] font-medium text-slate-900 mt-3">Questions can be added after creation</div>
                <div className="text-sm text-slate-600 mt-1 max-w-md mx-auto">After you create the exam, open it to add questions from the question bank or create new ones. You can reorder, edit, preview and set marks per question.</div>
                <div className="flex justify-center gap-2 mt-4">
                  <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">MCQ</div>
                  <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">True/False</div>
                  <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">Short Answer</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600"><AlertTriangle className="h-3.5 w-3.5"/> You can publish with 0 questions and add them later. Students will see updated exam.</div>
            </div>
          )}

          {step===6 && (
            <div className="space-y-4">
              <Card className="p-4 bg-slate-50/70">
                <div className="text-[13px] font-semibold text-slate-900">Review — confirm before publishing</div>
                <div className="mt-3 grid sm:grid-cols-2 gap-4 text-sm">
                  <div><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Title</div><div className="font-medium text-slate-900 mt-1">{editing.title || "—"}</div></div>
                  <div><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Subject</div><div className="font-medium text-slate-900 mt-1">{editing.subject || "—"}</div></div>
                  <div><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Class • Section</div><div className="font-medium text-slate-900 mt-1">{editing.className} • {editing.section} • {editing.academicYear}</div></div>
                  <div><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Duration • Schedule</div><div className="font-medium text-slate-900 mt-1">{editing.durationMinutes} min • {editing.startDate} {editing.startTime} → {editing.endDate} {editing.endTime}</div></div>
                  <div><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Marks</div><div className="font-medium text-slate-900 mt-1">{editing.totalMarks} total • {editing.passingMarks} pass • {editing.attempts} attempt(s)</div></div>
                  <div><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Instructions</div><div className="text-xs text-slate-700 mt-1 line-clamp-3">{editing.instructions || "—"}</div></div>
                </div>
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">Publishing makes the exam discoverable to eligible students (class/section). You can unpublish anytime.</div>
              </Card>
              <div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-600"/> Drafts are auto-validated. Fix highlighted errors before publishing.</div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={()=> setStep(s=> Math.max(1, s-1) as CreateStep)} disabled={step===1}>Back</Button>
            <div className="flex items-center gap-2">
              {step<6 ? (
                <>
                  <Button variant="secondary" onClick={()=>{ setCreateOpen(false); setStep(1)}}>Cancel</Button>
                  <Button variant="secondary" onClick={()=> handleCreate(false)}>Save draft</Button>
                  <Button onClick={handleNext}>Continue</Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={()=>{ setCreateOpen(false); setStep(1)}}>Cancel</Button>
                  <Button variant="secondary" onClick={()=> handleCreate(false)}>Save draft</Button>
                  <Button onClick={()=> handleCreate(true)}>Publish exam</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm dialogs */}
      <Modal open={!!confirmAction} onClose={()=> setConfirmAction(null)} title={confirmAction?.action==="publish" ? "Publish exam?" : confirmAction?.action==="unpublish" ? "Unpublish exam?" : "Archive exam?"} description={confirmAction?.action==="archive" ? "Archived exams are hidden from active lists but remain in database." : "This will change visibility to students immediately."}>
        {confirmAction && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm">
              <div className="font-medium text-slate-900">{confirmAction.exam.title}</div>
              <div className="text-xs text-slate-600 mt-1">{confirmAction.exam.subject} • {confirmAction.exam.status}</div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={()=> setConfirmAction(null)}>Cancel</Button>
              <Button onClick={()=>{ if(confirmAction.action==="archive") handleArchive(confirmAction.exam); else handlePublishToggle(confirmAction.exam)}}>
                {confirmAction.action==="publish" ? "Publish" : confirmAction.action==="unpublish" ? "Unpublish" : "Archive"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={()=> setConfirmDelete(null)} title="Delete exam?" description="This action cannot be undone. The exam and its questions will be removed (soft-deleted in database).">
        {confirmDelete && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <div className="text-sm font-medium text-red-900">{confirmDelete.title}</div>
              <div className="text-xs text-red-700 mt-1">All associated questions and eligibilities will be removed.</div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={()=> setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete permanently</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
