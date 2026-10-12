import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { ShieldAlert, Download } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

export default function IntegrityReports(){
  const [reports,setReports]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const {toast}=useToast()
  const [downloading,setDownloading]=useState<string|null>(null)
  useEffect(()=>{
    studentApi.getIntegrityReports().then(setReports).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  const download = async (sid:string)=>{
    setDownloading(sid)
    try{ await studentApi.downloadPdf(sid); toast({title:"Report downloaded", variant:"success"})}
    catch(e:any){ toast({title:"Unable to generate report", description:e.message})}
    finally{ setDownloading(null)}
  }
  if(loading) return <LoadingState label="Loading integrity reports..." />
  if(error) return <ErrorState description={error} />
  if(reports.length===0) return <EmptyState title="No integrity reports" description="Integrity reviews for your submitted exams will appear here." icon={ShieldAlert} />
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Integrity Reports</h1>
        <p className="text-sm text-slate-500">Review-priority indicators based on exam-related signals. Not an automatic determination of cheating.</p>
      </div>
      <div className="grid gap-4">
        {reports.map((r:any)=>(
          <Card key={r.sessionId} className="p-5 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center"><ShieldAlert className="h-5 w-5 text-amber-700"/></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900">{r.exam.title}</div>
              <div className="text-xs text-slate-500 mt-1">{r.exam.subject} • Submitted {new Date(r.submittedAt).toLocaleDateString()} • Signals {r.signalsCount}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-bold text-slate-900">{r.score}/100</span>
                <Badge variant={r.levelRaw==='HIGH_PRIORITY_REVIEW'?'danger': r.levelRaw==='REQUIRES_REVIEW'?'warning': r.levelRaw==='LOW_CONCERN'?'info':'success'}>{r.level}</Badge>
                <Badge variant={r.status==='REVIEWED'?'success':'warning'}>{r.status}</Badge>
              </div>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <Link to={`/student/integrity-reports/${r.sessionId}`} className="flex-1 lg:flex-initial"><Button size="sm" variant="secondary" className="w-full">View Report</Button></Link>
              <Button size="sm" onClick={()=>download(r.sessionId)} loading={downloading===r.sessionId} className="gap-1.5"><Download className="h-4 w-4"/> PDF</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
