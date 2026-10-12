import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"
import { Award, Clock3, FileText, ShieldAlert, Download, CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { useToast } from "@/components/ui/Toast"

export default function ResultDetail(){
  const {sessionId} = useParams()
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [downloading,setDownloading]=useState(false)
  const [pdfStatus,setPdfStatus]=useState<"idle"|"generating"|"ready"|"error">("idle")
  const [pdfError,setPdfError]=useState<string|null>(null)
  const {toast}=useToast()
  useEffect(()=>{
    studentApi.getResultDetail(sessionId!).then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[sessionId])
  const download = async ()=>{
    setDownloading(true)
    setPdfStatus("generating")
    setPdfError(null)
    try{
      await studentApi.downloadPdf(sessionId!)
      setPdfStatus("ready")
      toast({title:"Report ready", description:"Download started — ExamGuard PDF generated.", variant:"success"})
      setTimeout(()=> setPdfStatus("idle"), 3000)
    }catch(e:any){
      setPdfStatus("error")
      setPdfError(e.message || "Failed to generate report")
      toast({title:"Unable to generate report.", description:"Try again. "+e.message, variant:"danger"})
    }finally{ setDownloading(false)}
  }
  if(loading) return <LoadingState label="Loading result..." />
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  if(!data) return <div>Not found</div>
  const {session, result, integrity, timeline} = data
  const perfData = [
    {name:'Correct', value: result.correct, color:'#059669'},
    {name:'Incorrect', value: result.incorrect, color:'#dc2626'},
    {name:'Unanswered', value: result.unanswered, color:'#94a3b8'},
  ]
  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/student/results" className="hover:underline">Results</Link> <span>›</span> <span className="text-slate-900 font-medium">{session.exam.title}</span>
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 shadow-card overflow-hidden">
        <div className="h-1.5 bg-indigo-600" />
        <div className="p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <div className="text-xs tracking-widest uppercase font-semibold text-indigo-600">Test Result</div>
              <h1 className="text-[24px] font-bold text-slate-900 mt-1">{session.exam.title}</h1>
              <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-3">
                <span>{session.exam.subject} • {session.exam.teacher.name}</span>
                <span>•</span><span>{new Date(session.submittedAt || session.startedAt).toLocaleDateString()}</span>
                <span>•</span><span>{session.exam.durationMinutes} min</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-slate-700">{session.student.name}</span>
                <span className="text-slate-400">•</span>
                <span className="font-mono text-xs text-slate-500">{session.student.studentId}</span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-500">{session.student.class} • {session.student.section}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Button onClick={download} loading={downloading} className="gap-2">
                <Download className="h-4 w-4"/>
                {pdfStatus==="generating" ? "Generating report..." : pdfStatus==="ready" ? "Report ready" : pdfStatus==="error" ? "Try again" : "Download Full Report PDF"}
              </Button>
              {pdfStatus==="generating" && <span className="text-xs text-slate-500">Generating report…</span>}
              {pdfStatus==="ready" && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Report ready — download started</span>}
              {pdfStatus==="error" && <span className="text-xs text-red-600">Unable to generate report. Try again. {pdfError && <span className="text-slate-500">({pdfError.slice(0,80)})</span>}</span>}
              <span className="text-[11px] text-slate-400">Professional A4 PDF • Secure • Printable</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-0">
          <div className="p-8 text-center border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50">
            <div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Final Result</div>
            <div className="text-[42px] font-extrabold tracking-tight text-slate-900 mt-2">{result.obtained} <span className="text-slate-400 font-semibold">/ {result.totalMarks}</span></div>
            <div className="text-[20px] font-bold mt-1" style={{color: result.passed ? '#059669':'#dc2626'}}>{result.percentage}% • {result.passed ? 'PASSED':'NOT PASSED'}</div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold" style={{background: result.passed? '#ecfdf5':'#fef2f2', borderColor: result.passed? '#a7f3d0':'#fecaca', color: result.passed? '#065f46':'#991b1b'}}>
              {result.passed ? <CheckCircle2 className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>} {result.passed ? 'Passed — meets 40% threshold' : 'Not passed'}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white border border-slate-200 p-3"><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Questions</div><div className="text-lg font-bold text-slate-900 mt-1">{result.totalQuestions}</div></div>
              <div className="rounded-xl bg-white border border-slate-200 p-3"><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Correct</div><div className="text-lg font-bold text-emerald-600 mt-1">{result.correct}</div></div>
              <div className="rounded-xl bg-white border border-slate-200 p-3"><div className="text-xs tracking-widest uppercase font-semibold text-slate-500">Time</div><div className="text-sm font-semibold text-slate-900 mt-1">{result.completionTimeSec ? `${Math.floor(result.completionTimeSec/60)}m ${result.completionTimeSec%60}s` : '-'}</div></div>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-sm font-semibold text-slate-900">Performance Summary</h3>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs text-slate-500">Total Questions</div><div className="text-sm font-semibold text-slate-900">{result.totalQuestions}</div></div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3"><div className="text-xs text-emerald-700">Correct</div><div className="text-sm font-semibold text-emerald-900">{result.correct}</div></div>
              <div className="rounded-xl bg-red-50 border border-red-200 p-3"><div className="text-xs text-red-700">Incorrect</div><div className="text-sm font-semibold text-red-900">{result.incorrect}</div></div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs text-slate-500">Unanswered</div><div className="text-sm font-semibold text-slate-900">{result.unanswered}</div></div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-xs text-slate-500">Marks Obtained</div><div className="text-sm font-semibold text-slate-900">{result.obtained} / {result.totalMarks}</div></div>
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3"><div className="text-xs text-indigo-700">Percentage</div><div className="text-sm font-semibold text-indigo-900">{result.percentage}%</div></div>
            </div>
            <div className="h-[180px] mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={perfData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                    {perfData.map((e,i)=><Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your Answers</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {result.perQuestion.map((pq:any, idx:number)=>(
            <div key={pq.questionId} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium text-slate-900">Q{idx+1}. {pq.text}</div>
                <Badge variant={pq.isCorrect===true? 'success': pq.isCorrect===false? 'danger':'neutral'}>{pq.isCorrect===true?'Correct': pq.isCorrect===false?'Incorrect':'Pending'}</Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1">{pq.type} • {pq.points} marks</div>
              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-xs font-semibold tracking-widest uppercase text-slate-500">Your Answer</div><div className="mt-1 text-slate-900">{pq.studentAnswer || <span className="text-slate-400">— Not answered</span>}</div></div>
                <div className="rounded-lg bg-white border border-slate-200 p-3"><div className="text-xs font-semibold tracking-widest uppercase text-slate-500">Result</div><div className="mt-1">{pq.isCorrect===null? 'Subjective — teacher review pending' : pq.marks!==null? `${pq.marks} / ${pq.points} marks` : '-'}</div>{pq.subjective && <div className="text-xs text-slate-500 mt-1">Teacher feedback if available will appear here.</div>}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-600"/> Exam Integrity Review</CardTitle>
          <p className="text-xs text-slate-500 mt-1">The Integrity Review Score is a review-priority indicator based on exam-related activity signals. It is not an automatic determination of academic misconduct.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrity ? (
            <>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-extrabold text-slate-900">{integrity.score} <span className="text-slate-400 text-lg">/ 100</span></div>
                <Badge variant={integrity.level==='HIGH_PRIORITY_REVIEW'?'danger': integrity.level==='REQUIRES_REVIEW'?'warning': integrity.level==='LOW_CONCERN'?'info':'success'}>{integrity.levelDisplay}</Badge>
                <span className="text-xs text-slate-500">{integrity.status}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {integrity.signals.map((sig:any)=>(
                  <div key={sig.id} className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-900">{sig.type.replace(/_/g,' ')}</div>
                    <div className="text-xs text-slate-600 mt-1">{sig.description}</div>
                    <div className="text-xs text-slate-500 mt-1">Severity: {sig.severity} • Points: {sig.points}</div>
                    <div className="text-xs text-slate-500 mt-1">Evidence: {Array.isArray(sig.evidence)? sig.evidence.join(', '): JSON.stringify(sig.evidence)}</div>
                  </div>
                ))}
              </div>
              {integrity.signals.length===0 && <div className="text-sm text-slate-500">No signals detected. Clean session.</div>}
            </>
          ) : <div className="text-sm text-slate-500">No integrity review generated yet.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="relative pl-6 border-l border-slate-200 space-y-4">
            {timeline.map((ev:any)=>(
              <div key={ev.id} className="relative">
                <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-indigo-600 border-2 border-white shadow" />
                <div className="text-xs font-mono text-slate-500">{new Date(ev.timestamp).toLocaleString()}</div>
                <div className="text-sm font-medium text-slate-900">{ev.title}</div>
                {ev.metadata && <div className="text-xs text-slate-500">{JSON.stringify(ev.metadata).slice(0,120)}</div>}
              </div>
            ))}
            {timeline.length===0 && <div className="text-sm text-slate-500">No timeline events.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Teacher Review</CardTitle></CardHeader>
        <CardContent>
          {integrity && integrity.status==='REVIEWED' ? (
            <div className="space-y-2 text-sm">
              <div><span className="text-slate-500">Reviewed by</span> <span className="font-medium">{integrity.reviewer?.name || 'Dr. Rajesh Kumar'}</span></div>
              <div><span className="text-slate-500">Status</span> <Badge variant="success">Reviewed</Badge></div>
              <div><span className="text-slate-500">Date</span> {integrity.reviewedAt ? new Date(integrity.reviewedAt).toLocaleDateString() : '-'}</div>
              {integrity.teacherNote && <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mt-2">{integrity.teacherNote}</div>}
              {integrity.notes?.map((n:any)=>(
                <div key={n.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3">{n.note} — <span className="text-xs text-slate-500">{n.teacher} {new Date(n.createdAt).toLocaleDateString()}</span></div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Teacher review pending.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
