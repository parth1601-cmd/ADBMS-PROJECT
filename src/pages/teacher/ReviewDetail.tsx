import { useParams, Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ScoreRing, getScoreMeta } from "@/components/ui/ScoreIndicator"
import { Alert } from "@/components/ui/Alert"
import { Modal } from "@/components/ui/Modal"
import { Textarea } from "@/components/ui/Input"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { PageHeader } from "@/components/ui/PageHeader"
import { useToast } from "@/components/ui/Toast"
import { reviewApi } from "@/services/apiServices"
import { ShieldAlert, Eye, Clock3, Copy, Users, FileText, MonitorSmartphone, Filter, Timer, Repeat2, CheckCircle2, AlertTriangle, Download, UserCheck } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"
import { LoadingState, ErrorState } from "@/components/ui/States"

export default function ReviewDetail(){
  const {id} = useParams()
  const navigate = useNavigate()
  const {toast} = useToast()
  const [review,setReview]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [filter,setFilter]=useState<"all"|"session"|"focus"|"question"|"answer"|"clipboard"|"system">("all")
  const [expandedSignal,setExpandedSignal]=useState<string|null>(null)
  const [noteOpen,setNoteOpen]=useState(false)
  const [note,setNote]=useState("")
  const [assignOpen,setAssignOpen]=useState(false)
  const [assignee,setAssignee]=useState("")
  const [statusUpdating,setStatusUpdating]=useState(false)
  const [selectedEventId,setSelectedEventId]=useState<string|null>(null)
  const [zoom,setZoom]=useState(1)
  const [scrub,setScrub]=useState(0)
  const [clarifications,setClarifications]=useState<any[]>([])
  const [clarResponse,setClarResponse]=useState<Record<string,string>>({})

  const load = async()=>{
    setLoading(true); setError(null)
    try{
      const data = await reviewApi.getReview(id!)
      // normalize: backend returns either wrapped or direct
      const r = data?.success ? data.data : data
      // if backend returns legacy shape (without new fields), we still use
      // Map to expected shape: ensure fields exist
      setReview(r)
      setNote("")
    }catch(e:any){
      setError(e.message || "Failed to load review")
    } finally{ setLoading(false)}
  }
  useEffect(()=>{ load() },[id])
  useEffect(()=>{
    if(!review) return
    import("@/services/apiServices").then(async m=>{
      try{
        const list:any = await m.clarificationApi.listForTeacher({reviewId: review.id})
        const arr = Array.isArray(list)? list : (list?.data || [])
        setClarifications(arr)
      }catch{}
    })
  },[review])

  if(loading) return <LoadingState label="Loading review…" />
  if(error) return <ErrorState description={error} retry={load} />
  if(!review) return <div className="p-6 text-center text-sm">Review not found. <Link to="/teacher/integrity-reviews" className="text-indigo-600 underline">Back to queue</Link></div>

  const student = review.student
  const exam = review.exam
  const meta = getScoreMeta(review.score)
  const status = review.status || review.statusRaw || "Pending"

  const handleStatusChange = async(newStatus:string)=>{
    setStatusUpdating(true)
    try{
      await reviewApi.updateStatus(review.id, newStatus, note || undefined)
      toast({title:"Review updated", description:`Status changed to ${newStatus}`, variant:"success"})
      await load()
    }catch(e:any){
      toast({title:"Unable to update review", description:e.message, variant:"info"})
    }finally{ setStatusUpdating(false)}
  }
  const handleSaveNote = async()=>{
    if(!note.trim() || note.trim().length<3){ toast({title:"Note required", variant:"info"}); return }
    try{
      await reviewApi.addNote(review.id, note.trim())
      toast({title:"Note added", variant:"success"})
      setNoteOpen(false); setNote(""); await load()
    }catch(e:any){ toast({title:"Unable to add note", description:e.message, variant:"info"})}
  }
  const handleAssign = async()=>{
    if(!assignee.trim()){ toast({title:"Assignee required", variant:"info"}); return}
    try{
      // For demo, assign by email lookup? Simplify: use entered email as id if looks like cuid? For now try as id
      // We will try to find teacher by email via search? Instead we just use second teacher demo id fallback
      // If assignee contains @, we need to lookup via api but for now treat as id
      await reviewApi.assignReview(review.id, assignee.trim())
      toast({title:"Review assigned", variant:"success"})
      setAssignOpen(false); await load()
    }catch(e:any){ toast({title:"Assignment failed", description:e.message, variant:"info"})}
  }
  const handleDownload = async()=>{
    try{
      const { reportApi, studentApi } = await import("@/services/apiServices")
      try{
        const blob = await reportApi.generateIntegrityPdf(review.id)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `Integrity-${review.id.slice(0,8)}.pdf`
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
        toast({title:"Report generated", variant:"success"})
        return
      }catch{}
      const sessionId = review.sessionInfo?.id || review.sessionId
      if(sessionId){
        const b = await studentApi.downloadPdfDirect(sessionId)
        const url = URL.createObjectURL(b)
        const a = document.createElement('a')
        a.href=url; a.download=`Report-${sessionId.slice(-6)}.pdf`
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
        toast({title:"Report generated", variant:"success"})
      }
    }catch(e:any){ toast({title:"PDF failed", description:e.message, variant:"info"})}
  }

  const filteredEvents = (()=> {
    const ev = review.events || review.timeline || []
    if(filter==="all") return ev
    return ev.filter((e:any)=> (e.kind||"").toLowerCase()===filter || (e.kind?.toLowerCase().includes(filter)))
  })()

  const questionsAnalysis = review.questionsAnalysis || []
  const similarity = review.similarity || null
  const similarityResults = review.similarityResults || []
  const audit = review.audit || []
  const notes = review.notes || []
  const intensity = review.intensity || []

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{label:"Integrity Reviews", to:"/teacher/integrity-reviews"}, {label: `${student.name}` }]} />
      <PageHeader
        title={`${student.name} — ${exam.title}`}
        description={`${exam.subject} • ${exam.description || ''} • Submitted ${review.generatedAt ? new Date(review.generatedAt).toLocaleString() : ''} • ${student.studentId || student.rollNo || student.id.slice(0,8)}`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={()=>navigate(-1)}>Back</Button>
            <Button variant="secondary" size="sm" onClick={()=>setNoteOpen(true)}>Add note</Button>
            <Button variant="secondary" size="sm" onClick={()=>setAssignOpen(true)}>Assign</Button>
            <Button variant="secondary" size="sm" onClick={handleDownload}><Download className="h-4 w-4" />PDF</Button>
          </>
        }
      />

      {/* Header summary card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <GeneratedAvatar name={student.name} size={40} />
              <div><div className="font-medium text-slate-900">{student.name}</div><div className="text-xs text-slate-500">ID: {student.studentId || student.rollNo || student.id}</div><div className="text-xs text-slate-500">{student.email}</div></div>
            </div>
            <div className="space-y-1">
              <div><span className="text-xs tracking-widest uppercase font-semibold text-slate-500">Exam</span><div className="font-medium">{exam.title}</div><div className="text-xs text-slate-600">{exam.subject} • {exam.questionsCount || questionsAnalysis.length} questions</div></div>
            </div>
            <div className="space-y-1">
              <div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Review Status</div>
              <Badge variant={status==="Reviewed" ? "success" : status==="In Review" ? "warning" : status==="Requires Follow-up" ? "danger" : "neutral"}>{status}</Badge>
              <div className="text-xs text-slate-500 mt-1">Submitted: {review.sessionInfo?.submittedAt ? new Date(review.sessionInfo.submittedAt).toLocaleString() : review.generatedAt ? new Date(review.generatedAt).toLocaleString() : '-'}</div>
              <div className="text-xs text-slate-500">Score: {review.score} / 100 • {review.level || review.levelDisplay}</div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> Integrity signals are indicators for review, not proof of misconduct. The teacher makes the decision.</div>
        </CardContent>
      </Card>

      {/* Integrity Score Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-start">
            <div className="flex flex-col items-center text-center border border-slate-200 rounded-xl p-5 bg-slate-50/50">
              <ScoreRing score={review.score} size={132} />
              <div className="mt-3">
                <div className="text-xs font-semibold tracking-widest uppercase text-slate-500">Integrity Review Score</div>
                <div className={`inline-flex mt-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color}`}>{review.level || meta.level}</div>
              </div>
              <div className="text-xs text-slate-600 mt-3 leading-4">Score is a review-priority indicator based on exam-related signals. Not an automatic verdict.</div>
              <div className="text-[11px] text-slate-500 mt-2">Review ID: EG-{review.id.slice(-6).toUpperCase()}</div>
            </div>
            <div className="space-y-4">
              <Alert variant="neutral" title="How to use this review">
                Focus on the timeline and signal explanations. Expand each signal to see why it contributed, when it occurred, and what evidence supports it.
              </Alert>
              <div className="space-y-2">
                <h3 className="text-[13px] font-semibold tracking-widest uppercase text-slate-500">Signal contribution</h3>
                {(review.signals || []).map((s:any)=>(
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                    <div><div className="text-[13px] font-medium text-slate-900">{s.title || s.type}</div><div className="text-xs text-slate-600">{s.severity} • {s.confidenceDisplay || (s.confidence>=0.80?'High confidence':'Moderate confidence')} • {s.confidence ? (s.confidence*100).toFixed(0)+'%': ''}</div></div>
                    <span className="text-sm font-bold text-slate-900">+{s.points} pts</span>
                  </div>
                ))}
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 flex items-center justify-between font-medium">
                  <span className="text-sm text-slate-900">Total (capped at 100)</span><span className="text-sm font-bold">{review.score} / 100</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-center"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Answered</div><div className="text-[18px] font-semibold text-slate-900 mt-1">{review.questionsAnswered ?? questionsAnalysis.filter((q:any)=> q.answerStatus==='Answered').length}/{exam.questionsCount || questionsAnalysis.length}</div></div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-center"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Changes</div><div className="text-[18px] font-semibold text-slate-900 mt-1">{review.answerChanges ?? questionsAnalysis.reduce((a:any,c:any)=> a + (c.changeCount||0),0)}</div></div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-center"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Avg time</div><div className="text-[18px] font-semibold text-slate-900 mt-1">{review.avgResponseSec ?? '-'}s</div></div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-center"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Signals</div><div className="text-[18px] font-semibold text-slate-900 mt-1">{(review.signals||[]).length}</div></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals explanation */}
      <section>
        <h2 className="text-[13px] font-semibold tracking-widest uppercase text-slate-500 mb-3">Signals detected — explainable</h2>
        <p className="text-xs text-slate-600 mb-3">Each signal answers: What happened? When? How many times? Why did it contribute? What evidence supports it?</p>
        <div className="grid md:grid-cols-2 gap-4">
          {(review.signals || []).map((sig:any)=>{
            const icons:any = {tab_switch: Eye, timing: Clock3, rapid_change: Repeat2, copy_paste: Copy, similarity: Users, subjective_similarity: FileText, multi_session: MonitorSmartphone, correlated_pattern: Filter, session_anomaly: MonitorSmartphone}
            const key = (sig.typeLower || sig.type || "").toLowerCase()
            const Icon = icons[key] || ShieldAlert
            const expanded = expandedSignal===sig.id
            return (
              <Card key={sig.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className={`h-8 w-8 rounded-lg grid place-items-center border shrink-0 ${sig.severity==="High" ? "bg-red-50 border-red-200 text-red-700" : sig.severity==="Medium" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[13px] font-medium text-slate-900">{sig.title || sig.type}</h3>
                        <Badge variant={sig.severity==="High" ? "danger" : sig.severity==="Medium" ? "warning" : "neutral"}>{sig.severity}</Badge>
                        <span className="text-xs text-slate-500">+{sig.points} pts</span>
                        <span className="text-xs text-slate-500">• {sig.confidenceDisplay || (sig.confidence ? (sig.confidence>=0.80?'High':'Moderate')+' confidence' : '')}</span>
                      </div>
                      <p className="text-[13px] leading-5 text-slate-600 mt-1">{sig.description}</p>
                      <p className="text-xs text-slate-700 mt-1"><span className="font-medium">Summary:</span> {sig.summary || sig.description}</p>
                      <ul className="mt-2 space-y-1">
                        {(sig.evidence||[]).map((e:string,i:number)=><li key={i} className="text-xs text-slate-700 flex gap-1.5"><span className="mt-1.5 h-1 w-1 rounded-full bg-slate-400 shrink-0" aria-hidden/> <span>{e}</span></li>)}
                      </ul>
                      <div className="flex gap-2 mt-2">
                        <button onClick={()=> setExpandedSignal(expanded? null : sig.id)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">{expanded ? "Hide details" : "Show details"}</button>
                        {sig.relatedQuestions && <span className="text-xs text-slate-500">Related: {sig.relatedQuestions.join(", ")}</span>}
                      </div>
                      {expanded && (
                        <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs leading-5 text-slate-700">
                          <div><span className="font-semibold">What happened?</span> {sig.description}</div>
                          <div className="mt-1"><span className="font-semibold">When?</span> {sig.timeRange ? `${sig.timeRange.start} → ${sig.timeRange.end}` : 'During exam'}</div>
                          <div><span className="font-semibold">How many times?</span> {sig.count ?? sig.evidence?.length}</div>
                          <div><span className="font-semibold">Why review priority?</span> Contributed {sig.points} points with {sig.severity} severity and {(sig.confidence*100||0).toFixed(0)}% confidence.</div>
                          <div><span className="font-semibold">Evidence:</span> {(sig.evidence||[]).join("; ")}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {(review.signals||[]).length===0 && <div className="text-sm text-slate-500">No signals detected for this session. Score is Normal.</div>}
        </div>
      </section>

      {/* Timeline + Timing */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Event Timeline</CardTitle>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg" role="tablist" aria-label="Filter timeline">
              {[
                ["all","All"],
                ["session","Session"],
                ["focus","Tab"],
                ["question","Question"],
                ["answer","Answer"],
                ["clipboard","Clipboard"],
                ["system","System"],
              ].map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v as any)} role="tab" aria-selected={filter===v} className={`px-2.5 py-1 rounded-md text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${filter===v ? "bg-white shadow-sm border border-slate-200 text-slate-900" : "text-slate-600 hover:text-slate-900"}`}>{l}</button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {/* Interactive Timeline Scrubber */}
            {filteredEvents.length>0 && (()=>{
              const times = filteredEvents.map((e:any)=> new Date(e.timestamp || e.at).getTime()).filter(Boolean)
              const min = Math.min(...times)
              const max = Math.max(...times)
              const range = max - min || 1
              const getLeft=(ts:any)=> ((new Date(ts).getTime()-min)/range)*100
              const selected = filteredEvents.find((e:any)=> e.id===selectedEventId)
              // surrounding correlation for selected
              const surrounding = selected ? filteredEvents.filter((e:any)=>{
                const diff = Math.abs(new Date(e.timestamp||e.at).getTime() - new Date(selected.timestamp||selected.at).getTime())
                return diff < 60000 && e.id!==selected.id
              }).slice(0,4) : []
              return (
                <div className="mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Timeline scrubber — drag, click, zoom</span>
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))} className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs">-</button>
                      <span className="text-xs font-mono text-slate-600 w-10 text-center">{Math.round(zoom*100)}%</span>
                      <button onClick={()=>setZoom(z=>Math.min(2,z+0.25))} className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-xs">+</button>
                      <input type="range" min={0} max={100} value={scrub} onChange={e=>setScrub(Number(e.target.value))} className="w-20 accent-slate-900 hidden sm:block" aria-label="Scrub timeline" />
                    </div>
                  </div>
                  <div className="relative h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden" style={{zoom: zoom>1? zoom:1}}>
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-white" />
                    {/* scrub indicator */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-indigo-500" style={{left: `${scrub}%`}} />
                    {filteredEvents.map((ev:any)=>{
                      const left=getLeft(ev.timestamp||ev.at)
                      const isSelected=ev.id===selectedEventId
                      const kindColor:any={focus:"bg-amber-500", answer:"bg-emerald-500", clipboard:"bg-purple-500", session:"bg-indigo-500", question:"bg-sky-500", system:"bg-slate-400"}
                      const bg=kindColor[ev.kind]||"bg-slate-400"
                      return (
                        <button key={ev.id} onClick={()=> setSelectedEventId(ev.id)} className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm hover:scale-125 transition ${bg} ${isSelected? "ring-2 ring-indigo-500 scale-150":""}`} style={{left:`${left}%`}} title={`${ev.title} @ ${ev.at||''} • ${ev.kind}`} aria-label={`${ev.title} at ${ev.at}`} />
                      )
                    })}
                    <div className="absolute bottom-1 left-2 text-[10px] font-mono text-slate-500">{new Date(min).toLocaleTimeString()}</div>
                    <div className="absolute bottom-1 right-2 text-[10px] font-mono text-slate-500">{new Date(max).toLocaleTimeString()}</div>
                  </div>
                  {selected && (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                      <div className="text-xs font-semibold text-indigo-900">Selected: {selected.title} • {selected.at} — Related question: {selected.questionOrder? `Q${selected.questionOrder}`:"—"}</div>
                      <div className="text-xs text-indigo-800 mt-1">Correlation: {surrounding.length>0? surrounding.map((s:any)=> `${s.title} @ ${s.at}`).join(" → ") : "No nearby events within 60s. This is correlation, not causation."}</div>
                      <div className="text-[11px] text-indigo-700 mt-1">Example: Focus lost at 10:21:04 correlates with Q7 opened 10:20:58 and answer changed 10:21:02. Do not infer intent.</div>
                    </div>
                  )}
                  <div className="text-xs text-slate-500">Interactive: drag scrubber, click dots to highlight surrounding question/answer timing. Filter pills above narrow the lane.</div>
                </div>
              )
            })()}
            <ol className="relative border-l border-slate-200 ml-2 space-y-0">
              {filteredEvents.map((ev:any)=>{
                const iconMap:any = {focus: Eye, answer: FileText, clipboard: Copy, session: MonitorSmartphone, question: FileText, system: Filter}
                const Icon = iconMap[ev.kind] || Clock3
                const isSelected = ev.id===selectedEventId
                const isSurrounding = selectedEventId && (()=>{
                  const sel = filteredEvents.find((e:any)=> e.id===selectedEventId)
                  if(!sel) return false
                  const diff = Math.abs(new Date(ev.timestamp||ev.at).getTime() - new Date(sel.timestamp||sel.at).getTime())
                  return diff < 60000 && ev.id!==sel.id
                })()
                return (
                  <li key={ev.id} onClick={()=> setSelectedEventId(ev.id)} className={`ml-6 py-3 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -ml-2 ${isSelected? "bg-indigo-50 border-indigo-200": isSurrounding? "bg-amber-50/50":""}`}>
                    <span className={`absolute -left-[13px] h-6 w-6 rounded-full border bg-white grid place-items-center border-slate-200 ${isSelected? "text-indigo-600 border-indigo-300":"text-slate-600"}`} style={{marginTop:"-2px"}}>
                      <Icon className="h-3 w-3" aria-hidden />
                    </span>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[13px] font-medium text-slate-900">{ev.title || ev.eventType} {isSurrounding && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800">nearby</span>}</div>
                        {ev.questionOrder && <div className="text-xs text-slate-600 mt-0.5">Question {ev.questionOrder}</div>}
                        {ev.metadata && <div className="text-xs text-slate-600 mt-0.5">{typeof ev.metadata==='string'? ev.metadata : JSON.stringify(ev.metadata).slice(0,120)}</div>}
                      </div>
                      <time className="text-xs font-mono text-slate-500 whitespace-nowrap">{ev.at || (ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '')}</time>
                    </div>
                  </li>
                )
              })}
              {filteredEvents.length===0 && <div className="py-8 text-center text-sm text-slate-500">No events for this filter.</div>}
            </ol>
            {intensity && intensity.length>0 && (
              <div className="mt-6">
                <h4 className="text-[11px] font-semibold tracking-widest uppercase text-slate-500 mb-2">Timeline intensity (events per minute)</h4>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={intensity}>
                      <XAxis dataKey="minute" tick={{fontSize:9, fill:'#64748b'}} axisLine={false} tickLine={false} interval={2} />
                      <YAxis tick={{fontSize:9, fill:'#64748b'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{fontSize:12, borderRadius:8, border:'1px solid #e2e8f0'}} />
                      <Area type="monotone" dataKey="count" stroke="#0f172a" fill="#e2e8f0" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Response timing</CardTitle><p className="text-xs text-slate-600 mt-1">Fast answers alone don’t indicate misconduct. Hover for details.</p></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 mb-4 text-center">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Fastest</div><div className="text-sm font-semibold text-slate-900 mt-1">{review.fastestSec}s</div></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Slowest</div><div className="text-sm font-semibold text-slate-900 mt-1">{review.slowestSec!=null ? `${Math.floor(review.slowestSec/60)}m ${review.slowestSec%60}s` : '-'}</div></div>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={review.responseTimes || []}>
                  <XAxis dataKey="q" tick={{fontSize:10, fill:'#64748b'}} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tick={{fontSize:10, fill:'#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{fontSize:12, borderRadius:8, border:'1px solid #e2e8f0'}} />
                  <Line type="monotone" dataKey="sec" stroke="#0f172a" strokeWidth={1.8} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {review.correlatedPattern && <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900"><span className="font-medium">Correlated pattern:</span> {review.correlatedPattern.description} • Confidence {(review.correlatedPattern.confidence*100).toFixed(0)}%</div>}
          </CardContent>
        </Card>
      </div>

      {/* Question-by-question analysis */}
      <Card>
        <CardHeader><CardTitle>Question-by-question analysis</CardTitle><p className="text-xs text-slate-600 mt-1">Time spent, answer status, changes, events and signal indicators per question.</p></CardHeader>
        <CardContent className="p-0">
          {questionsAnalysis.length===0 ? <div className="p-6 text-center text-sm text-slate-500">No question analysis available.</div> :
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Q</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Type</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Time</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Answer</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Changes</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Events</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Signals</th>
                </tr>
              </thead>
              <tbody>
                {questionsAnalysis.map((q:any)=>(
                  <tr key={q.id} className={`border-t border-slate-100 ${q.isUnusual ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-2 font-medium">Q{q.order}</td>
                    <td className="px-3 py-2 text-xs">{q.type}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{q.timeSpentSec ?? '-'}s</td>
                    <td className="px-3 py-2 text-xs">{q.answerStatus}</td>
                    <td className="px-3 py-2 text-xs">{q.changeCount}</td>
                    <td className="px-3 py-2 text-xs">{q.eventsAroundQuestion} • Tab nearby: {q.tabNearby}</td>
                    <td className="px-3 py-2 text-xs">{q.signals?.length? q.signals.join(', ') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </CardContent>
      </Card>

      {/* Answer similarity */}
      {(similarity || similarityResults.length>0) && (
        <Card>
          <CardHeader>
            <CardTitle>Answer similarity analysis</CardTitle>
            <p className="text-xs text-slate-600">Explainable text similarity (normalized, tokenized, Jaccard). High similarity is not proof of misconduct.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {similarity && (
              <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <GeneratedAvatar name={student.name} size={32} />
                  <span className="text-sm font-medium text-slate-900">{student.name}</span>
                </div>
                <span className="text-slate-400 text-sm">vs</span>
                <div className="flex items-center gap-2">
                  <GeneratedAvatar name={similarity.peerName || similarity.peerId || "Peer"} size={32} />
                  <span className="text-sm font-medium text-slate-900">{similarity.peerName || "Peer student"}</span>
                </div>
                <div className="ml-auto flex gap-4 text-center">
                  <div><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Matching</div><div className="text-sm font-semibold">{similarity.matches}/{similarity.total}</div></div>
                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                  <div><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Similarity</div><div className="text-sm font-bold text-slate-900">{similarity.similarityPercent ?? similarity.percent}%</div><div className="text-[11px] text-slate-500">{similarity.confidence ? (similarity.confidence>=0.80?'High':'Moderate')+' confidence' : ''}</div></div>
                </div>
              </div>
            )}
            {similarity && similarity.table && (
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left text-xs font-semibold tracking-widest uppercase text-slate-500 px-3 py-2">Q</th>
                      <th className="text-left text-xs font-semibold tracking-widest uppercase text-slate-500 px-3 py-2">{student.name}</th>
                      <th className="text-left text-xs font-semibold tracking-widest uppercase text-slate-500 px-3 py-2">{similarity.peerName || "Peer"}</th>
                      <th className="text-left text-xs font-semibold tracking-widest uppercase text-slate-500 px-3 py-2">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {similarity.table.map((r:any)=>(
                      <tr key={r.q} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-900">{r.q}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate">{r.a}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate">{r.b}</td>
                        <td className="px-3 py-2"><Badge variant={r.match ? "success" : "neutral"}>{r.match ? "Match" : "Different"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Alert variant="neutral">High similarity can occur naturally. Use this as one signal among others. Only authorized teachers can access this information.</Alert>
            {/* Multi-method similarity breakdown */}
            {similarity && (similarity as any).table?.[0]?.jaccard !== undefined && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs font-semibold tracking-widest uppercase text-slate-500">Similarity methods (explainable)</div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-white border border-slate-200 p-2"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Token (Jaccard)</div><div className="text-sm font-bold mt-1">{(similarity as any).table[0].jaccard ?? '-'}%</div></div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">N-gram (3)</div><div className="text-sm font-bold mt-1">{(similarity as any).table[0].ngram ?? '-'}%</div></div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Edit (Levenshtein)</div><div className="text-sm font-bold mt-1">{(similarity as any).table[0].edit ?? '-'}%</div></div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Semantic (stopword-filtered)</div><div className="text-sm font-bold mt-1">{(similarity as any).table[0].semantic ?? '-'}%</div></div>
                </div>
                <div className="text-xs text-slate-600 mt-2">Similarity indicates textual overlap between responses. Context and question type should be considered during review. Token similarity is primary; n-gram captures phrase overlap; edit handles typos; semantic filters common stopwords.</div>
              </div>
            )}
            <div className="flex gap-2">
              <Link to={`/teacher/integrity-reviews/${review.id}/similarity`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View detailed similarity page →</Link>
              <Link to={`/teacher/integrity-reviews/${review.id}/compare`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Open comparison workspace →</Link>
              {similarityResults.length>1 && <span className="text-xs text-slate-500">{similarityResults.length} similar peers found</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session information */}
      <Card>
        <CardHeader><CardTitle>Session information</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div><span className="font-medium">Session ID:</span> <span className="font-mono text-xs">{review.sessionInfo?.id || review.sessionId}</span></div>
            <div><span className="font-medium">Started:</span> {review.sessionInfo?.startedAt ? new Date(review.sessionInfo.startedAt).toLocaleString() : '-'}</div>
            <div><span className="font-medium">Submitted:</span> {review.sessionInfo?.submittedAt ? new Date(review.sessionInfo.submittedAt).toLocaleString() : review.generatedAt ? new Date(review.generatedAt).toLocaleString() : '-'}</div>
            <div><span className="font-medium">Deadline:</span> {review.sessionInfo?.deadlineAt ? new Date(review.sessionInfo.deadlineAt).toLocaleString() : '-'}</div>
          </div>
          <div className="space-y-1">
            <div><span className="font-medium">Duration:</span> {review.sessionInfo?.durationSec ? `${Math.floor(review.sessionInfo.durationSec/60)}m ${review.sessionInfo.durationSec%60}s` : '-'}</div>
            <div><span className="font-medium">Status:</span> {review.sessionInfo?.status}</div>
            <div><span className="font-medium">Reconnections:</span> {review.sessionInfo?.eventCounts ? Object.entries(review.sessionInfo.eventCounts).slice(0,3).map(([k,v])=> `${k}:${v}`).join(' ') : '-'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Teacher notes</CardTitle><Button size="sm" variant="secondary" onClick={()=>setNoteOpen(true)}>Add note</Button></CardHeader>
        <CardContent className="space-y-3">
          {notes.length===0 ? <div className="text-sm text-slate-500">No notes yet. Add a note to record context.</div> :
          notes.map((n:any)=>(
            <div key={n.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-900">{n.teacher}</span><span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</span></div>
              <p className="text-sm text-slate-700 mt-1 leading-5">{n.note || n.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Clarifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Student clarifications</CardTitle><span className="text-xs text-slate-500">{clarifications.length} clarification(s)</span></CardHeader>
        <CardContent className="space-y-3">
          {clarifications.length===0 ? <div className="text-sm text-slate-500">No clarification submitted yet. If institution policy enables it, student may submit a short explanation regarding recorded events.</div> :
          clarifications.map((c:any)=>(
            <div key={c.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-900">{c.student?.name || c.studentId}</span><span className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()} • {c.status}</span></div>
              <p className="text-sm text-slate-700 mt-1 leading-5">{c.message}</p>
              {c.response ? <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-200 p-2 text-sm"><span className="font-medium">Response:</span> {c.response}</div> : (
                <div className="mt-3">
                  <textarea value={clarResponse[c.id]||""} onChange={e=> setClarResponse(prev=> ({...prev, [c.id]: e.target.value}))} placeholder="Respond to student clarification…" rows={2} className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" />
                  <div className="flex justify-end mt-2"><Button size="sm" onClick={async()=>{
                    const resp=clarResponse[c.id]
                    if(!resp || resp.trim().length<5){ toast({title:"Response required", variant:"info"}); return}
                    try{
                      const m=await import("@/services/apiServices")
                      await m.clarificationApi.respond(c.id, resp)
                      toast({title:"Response sent", variant:"success"})
                      setClarifications(prev=> prev.map(x=> x.id===c.id? {...x, response: resp, status:"RESPONDED"}:x))
                    }catch(e:any){ toast({title:"Failed", description:e.message, variant:"info"})}
                  }}>Respond</Button></div>
                </div>
              )}
            </div>
          ))}
          <div className="text-xs text-slate-500">Students can view: Review Clarification — teacher sees this; can Review, Respond, Mark resolved. Students cannot edit teacher notes.</div>
        </CardContent>
      </Card>

      {/* Review actions */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-slate-900">Review actions</div>
            <div className="text-xs text-slate-600">Change status. Every status change is audited. Assigned reviewer: {review.assignedReviewer?.name || 'Unassigned'}</div>
            {review.assignedReviewer && <div className="text-xs text-slate-600 mt-1">Assigned to {review.assignedReviewer.name} at {review.assignedAt ? new Date(review.assignedAt).toLocaleString() : ''}</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={statusUpdating || status==="In Review"} onClick={()=> handleStatusChange("In Review")}><Filter className="h-4 w-4" />In Review</Button>
            <Button disabled={statusUpdating || status==="Reviewed"} onClick={()=> handleStatusChange("Reviewed")}><CheckCircle2 className="h-4 w-4" />Mark Reviewed</Button>
            <Button variant="secondary" disabled={statusUpdating || status==="Requires Follow-up"} onClick={()=> handleStatusChange("Requires Follow-up")}><AlertTriangle className="h-4 w-4" />Requires Follow-up</Button>
            <Button variant="ghost" disabled={statusUpdating} onClick={()=> handleStatusChange("Dismissed")}>Dismiss</Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit history */}
      <Card>
        <CardHeader><CardTitle>Audit history</CardTitle><p className="text-xs text-slate-600">Status changes, notes, assignments. Not editable.</p></CardHeader>
        <CardContent>
          {audit.length===0 ? <div className="text-sm text-slate-500">No audit records yet.</div> :
          <ol className="space-y-2">
            {audit.map((a:any)=>(
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</span>
                <span className="font-medium text-slate-900">{a.action}</span>
                <span className="text-slate-600 truncate">{a.metadata ? JSON.stringify(a.metadata).slice(0,100) : ''}</span>
              </li>
            ))}
          </ol>}
        </CardContent>
      </Card>

      <Modal open={noteOpen} onClose={()=>setNoteOpen(false)} title="Add review note" description="Saved with this review for audit trail.">
        <div className="space-y-4">
          <Textarea label="Note" placeholder="Reviewed timeline and answer pattern. Follow-up required." value={note} onChange={e=>setNote(e.target.value)} rows={4} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={()=>setNoteOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveNote}>Save note</Button>
          </div>
        </div>
      </Modal>
      <Modal open={assignOpen} onClose={()=>setAssignOpen(false)} title="Assign review" description="Assign to another authorized teacher.">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Assignee Teacher ID or Email</label>
            <input value={assignee} onChange={e=>setAssignee(e.target.value)} placeholder="Enter teacher ID (e.g., from Students page)" className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px]" />
            <p className="text-xs text-slate-500 mt-1">Demo: use priyanka.sharma@examguard.demo’s ID? You can also try any teacher email, backend will validate.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={()=>setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign}><UserCheck className="h-4 w-4" />Assign</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}


