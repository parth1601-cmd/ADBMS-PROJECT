import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"
import { ShieldAlert, Download, MessageSquare, Send } from "lucide-react"
import { useToast } from "@/components/ui/Toast"
import { clarificationApi } from "@/services/apiServices"

export default function IntegrityReportDetail(){
  const {sessionId}=useParams()
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const {toast}=useToast()
  const [downloading,setDownloading]=useState(false)
  const [clarMsg,setClarMsg]=useState("")
  const [clarifications,setClarifications]=useState<any[]>([])
  const [clarSending,setClarSending]=useState(false)
  useEffect(()=>{
    studentApi.getIntegrityReport(sessionId!).then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false))
    // load clarifications
    clarificationApi.listForStudent().then((list:any)=>{
      const filtered = (Array.isArray(list)? list: []).filter((c:any)=> c.sessionId===sessionId)
      setClarifications(filtered)
    }).catch(()=>{})
  },[sessionId])
  const download = async ()=>{
    setDownloading(true)
    try{ await studentApi.downloadPdf(sessionId!); toast({title:"Report downloaded", variant:"success"})}
    catch(e:any){ toast({title:"Unable to generate report", description:e.message})}
    finally{ setDownloading(false)}
  }
  if(loading) return <LoadingState label="Loading integrity report..." />
  if(error) return <ErrorState description={error} />
  if(!data) return <div>Not found</div>
  const {session, review, timeline}=data
  return (
    <div className="max-w-[760px] mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/student/integrity-reports" className="hover:underline">Integrity Reports</Link> <span>›</span> <span className="text-slate-900 font-medium">{session.exam.title}</span>
      </div>
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-amber-500" />
        <CardContent className="p-6 lg:p-8 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-semibold text-slate-900">{session.exam.title}</h1>
              <p className="text-sm text-slate-500 mt-1">{session.exam.subject} • {session.exam.teacher} • {session.student.name} • {session.student.studentId}</p>
              <p className="text-xs text-slate-500 mt-1">Submitted {new Date(session.submittedAt).toLocaleString()}</p>
            </div>
            <Button onClick={download} loading={downloading} className="gap-2"><Download className="h-4 w-4"/> Download Full Report PDF</Button>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center gap-4">
            <div className="text-2xl font-extrabold text-slate-900">{review.score}<span className="text-slate-400 text-lg">/100</span></div>
            <Badge variant={review.level==='HIGH_PRIORITY_REVIEW'?'danger': review.level==='REQUIRES_REVIEW'?'warning': review.level==='LOW_CONCERN'?'info':'success'}>{review.levelDisplay || review.level}</Badge>
            <span className="text-xs text-slate-500">{review.status}</span>
            <span className="text-xs font-mono text-slate-500 ml-auto">Report {review.reportId}</span>
          </div>
          <p className="text-xs leading-5 text-slate-500">The Integrity Review Score is a review-priority indicator based on exam-related activity signals. It is not an automatic determination of academic misconduct.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Signal Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {review.signals.map((s:any)=>(
            <div key={s.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600"/>
                <span className="text-sm font-medium text-slate-900">{s.type}</span>
                <Badge variant={s.severity==='HIGH'?'danger': s.severity==='MEDIUM'?'warning':'neutral'}>{s.severity}</Badge>
                <span className="text-xs text-slate-500 ml-auto">{s.points} pts</span>
              </div>
              <div className="text-sm text-slate-600 mt-2">{s.description}</div>
              <div className="text-xs text-slate-500 mt-1">Evidence: {Array.isArray(s.evidence)? s.evidence.join(', '): JSON.stringify(s.evidence)}</div>
            </div>
          ))}
          {review.signals.length===0 && <div className="text-sm text-slate-500">No signals — clean session.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="relative pl-6 border-l border-slate-200 space-y-3">
            {timeline.map((ev:any)=>(
              <div key={ev.id} className="relative">
                <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-amber-500 border-2 border-white shadow" />
                <div className="text-xs font-mono text-slate-500">{new Date(ev.timestamp).toLocaleString()}</div>
                <div className="text-sm font-medium text-slate-900">{ev.title || ev.eventType}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Teacher Review</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {review.status==='REVIEWED' ? (
            <div>
              <div>Reviewed</div>
              {review.notes?.map((n:any)=>(
                <div key={n.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 mt-2">{n.note} — {n.teacher} {new Date(n.createdAt).toLocaleDateString()}</div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500">Teacher review pending.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Review Clarification</CardTitle><p className="text-xs text-slate-600">If you experienced a network interruption or have context about recorded events, you may submit a short explanation. Technology assists teachers — human judgment decides.</p></CardHeader>
        <CardContent className="space-y-4">
          {clarifications.length>0 && (
            <div className="space-y-2">
              {clarifications.map((c:any)=>(
                <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm text-slate-800">{c.message}</div>
                  <div className="text-xs text-slate-500 mt-1">Status: {c.status} • {new Date(c.createdAt).toLocaleString()}</div>
                  {c.response && <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-200 p-2 text-sm"><span className="font-medium">Teacher response:</span> {c.response}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900">Recorded signals are indicators for review and should be interpreted in context. This is not proof of misconduct.</div>
          <div>
            <label className="text-sm font-medium text-slate-700">Your explanation</label>
            <textarea value={clarMsg} onChange={e=>setClarMsg(e.target.value)} placeholder="I experienced a network interruption during the exam. My focus left at 10:21 due to…" rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
            <div className="text-xs text-slate-500 mt-1">Max 2000 characters. Be concise and factual. Do not include private information beyond exam context.</div>
          </div>
          <div className="flex justify-end">
            <Button disabled={clarSending || clarMsg.trim().length<10} onClick={async()=>{
              setClarSending(true)
              try{
                await clarificationApi.create(review.id, clarMsg, sessionId!)
                toast({title:"Clarification submitted", description:"Your teacher will review it.", variant:"success"})
                setClarMsg("")
                // reload
                clarificationApi.listForStudent().then((list:any)=>{
                  const filtered = (Array.isArray(list)? list: []).filter((c:any)=> c.sessionId===sessionId)
                  setClarifications(filtered)
                })
              }catch(e:any){ toast({title:"Failed", description:e.message, variant:"info"})}
              finally{ setClarSending(false)}
            }}><Send className="h-4 w-4" />Submit explanation</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
