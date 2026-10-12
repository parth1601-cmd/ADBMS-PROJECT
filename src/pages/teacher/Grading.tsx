import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { PageHeader } from "@/components/ui/PageHeader"
import { Badge } from "@/components/ui/Badge"
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States"
import { gradingApi } from "@/services/apiServices"
import { useToast } from "@/components/ui/Toast"
import { Save, ChevronLeft, ChevronRight, CheckCircle2, Clock3, Search } from "lucide-react"

export default function Grading(){
  const {toast}=useToast()
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [filter,setFilter]=useState("Pending")
  const [search,setSearch]=useState("")
  const [selectedIdx,setSelectedIdx]=useState(0)
  const [marks,setMarks]=useState<string>("")
  const [feedback,setFeedback]=useState("")
  const [saving,setSaving]=useState(false)

  const load=async()=>{
    setLoading(true); setError(null)
    try{
      const res=await gradingApi.getQueue({status: filter, search: search||undefined})
      setData(res)
      setSelectedIdx(0)
    }catch(e:any){ setError(e.message)}
    finally{ setLoading(false)}
  }
  useEffect(()=>{ load() },[filter])
  useEffect(()=>{
    const id=setTimeout(()=>{ if(!loading) load()},400)
    return ()=>clearTimeout(id)
  },[search])

  const items = data?.items || []
  const current = items[selectedIdx]

  useEffect(()=>{
    if(current){
      setMarks(current.marksAwarded!=null? String(current.marksAwarded): "")
      setFeedback(current.teacherFeedback||"")
    }
  },[current])

  const handleSave=async(next:boolean=false)=>{
    if(!current) return
    const max=current.question.points
    const m=Number(marks)
    if(Number.isNaN(m) || m<0 || m>max){ toast({title:`Marks must be 0-${max}`, variant:"info"}); return}
    setSaving(true)
    try{
      await gradingApi.grade(current.answerId, m, feedback)
      toast({title:"Grading saved", variant:"success"})
      // update locally
      const newItems=[...items]
      newItems[selectedIdx]={...current, marksAwarded:m, teacherFeedback:feedback, status:'Graded'}
      setData({ ...data, items: newItems })
      if(next && selectedIdx < items.length-1) setSelectedIdx(i=>i+1)
      else if(next) load()
    }catch(e:any){ toast({title:"Failed", description:e.message, variant:"info"})}
    finally{ setSaving(false)}
  }

  const pendingCount = data?.pendingCount ?? items.filter((i:any)=> i.status==='Pending').length

  if(loading) return <LoadingState label="Loading grading queue…" />
  if(error) return <ErrorState description={error} retry={load} />

  return (
    <div className="space-y-6">
      <PageHeader title="Short-Answer Grading" description="Manual evaluation for short/long answers. Teacher judgment is required. Student result updates after authorized grading." actions={<Badge variant="warning">{pendingCount} pending</Badge>} />
      <Card className="p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by student, question, exam…" className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]">
            <option>Pending</option><option>Graded</option><option>All</option>
          </select>
          <Button size="sm" variant="secondary" onClick={load}>Refresh</Button>
        </div>
        <div className="mt-3 flex gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">Pending: {data?.pendingCount||0}</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">Graded: {data?.gradedCount||0}</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white">Total: {data?.total||0}</span>
        </div>
      </Card>

      {items.length===0 ? <EmptyState title={filter==="Pending" ? "No pending grading" : "No items"} description={filter==="Pending" ? "All short answers have been graded. Pending evaluation queue is empty." : "Try changing filters."} /> : (
        <div className="grid lg:grid-cols-[280px_1fr_300px] gap-6">
          <Card className="overflow-hidden">
            <CardHeader className="p-3 border-b border-slate-200"><CardTitle className="text-xs tracking-widest uppercase">Queue</CardTitle></CardHeader>
            <div className="overflow-auto max-h-[560px]">
              {items.map((it:any, idx:number)=>(
                <button key={it.answerId} onClick={()=>setSelectedIdx(idx)} className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 ${idx===selectedIdx? "bg-slate-900 text-white hover:bg-slate-900":"bg-white"}`}>
                  <div className={`text-[13px] font-medium truncate ${idx===selectedIdx? "text-white":"text-slate-900"}`}>Q{it.question.order} • {it.student.name}</div>
                  <div className={`text-xs truncate ${idx===selectedIdx? "text-white/70":"text-slate-600"}`}>{it.question.text.slice(0,60)}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${idx===selectedIdx? "bg-white/20 border-white/30 text-white":"bg-slate-50 border-slate-200 text-slate-700"}`}>{it.exam.title.slice(0,16)}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${it.status==='Pending'? "bg-amber-50 border-amber-200 text-amber-800":"bg-emerald-50 border-emerald-200 text-emerald-800"}`}>{it.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardContent className="p-5">
              {current ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-widest uppercase font-semibold text-slate-500">Question {current.question.order} • {current.question.points} marks • {current.question.type}</span>
                    <span className="text-xs text-slate-500">{new Date(current.submittedAt||current.firstAnsweredAt).toLocaleDateString()} • {current.student.studentId}</span>
                  </div>
                  <h3 className="text-[15px] font-medium leading-6 text-slate-900">{current.question.text}</h3>
                  {current.question.correctAnswer && <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs"><span className="font-semibold">Reference / Rubric:</span> {current.question.correctAnswer.slice(0,300)}</div>}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2">Student answer — {current.student.name}</div>
                    <div className="text-[14px] leading-6 text-slate-800 whitespace-pre-wrap min-h-[100px] bg-slate-50 rounded-lg p-3 border border-slate-200">{current.answer || <span className="text-slate-500 italic">No answer provided</span>}</div>
                    <div className="flex gap-4 text-xs text-slate-600 mt-2">
                      <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Date(current.firstAnsweredAt).toLocaleString()}</span>
                      <span>{current.answer? `${current.answer.length} chars` : '0 chars'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={()=> setSelectedIdx(i=> Math.max(0,i-1))} disabled={selectedIdx===0} className="h-8 px-3 rounded-lg border border-slate-300 bg-white disabled:opacity-50 inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" />Previous</button>
                    <span className="text-slate-500">{selectedIdx+1} / {items.length}</span>
                    <button onClick={()=> setSelectedIdx(i=> Math.min(items.length-1,i+1))} disabled={selectedIdx===items.length-1} className="h-8 px-3 rounded-lg border border-slate-300 bg-white disabled:opacity-50 inline-flex items-center gap-1">Next <ChevronRight className="h-4 w-4" /></button>
                    <span className="ml-auto text-slate-500 hidden sm:block">Keyboard: Save & Next preserves progress.</span>
                  </div>
                </div>
              ) : <div className="py-10 text-center text-sm text-slate-500">Select an answer from queue.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Marks & Feedback</CardTitle><p className="text-xs text-slate-600">Auto-save grading. Rubric if configured.</p></CardHeader>
            <CardContent className="space-y-4">
              {current ? (
                <>
                  <div>
                    <label className="text-[13px] font-medium text-slate-700">Marks (0 – {current.question.points})</label>
                    <input type="number" min={0} max={current.question.points} value={marks} onChange={e=>setMarks(e.target.value)} placeholder="e.g., 3" className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                    <div className="text-xs text-slate-500 mt-1">Points: {current.question.points}. Passing is determined after all grading.</div>
                  </div>
                  <div>
                    <label className="text-[13px] font-medium text-slate-700">Feedback (optional)</label>
                    <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Good explanation, but missing example…" rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-[13px] leading-5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button disabled={saving} onClick={()=>handleSave(false)} className="w-full gap-1.5"><Save className="h-4 w-4" />{saving? "Saving…":"Save"}</Button>
                    <Button disabled={saving} variant="secondary" onClick={()=>handleSave(true)} className="w-full gap-1.5"><CheckCircle2 className="h-4 w-4" />Save & Next</Button>
                    <div className="text-xs text-slate-500 text-center">Saved grades update student result after authorized evaluation. Do not fabricate automated correctness.</div>
                  </div>
                </>
              ) : <div className="text-sm text-slate-500">No selection.</div>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
