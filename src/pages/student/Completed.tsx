import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { Award, FileText, ShieldCheck, Download } from "lucide-react"
import { useToast } from "@/components/ui/Toast"

export default function Completed(){
  const [items,setItems]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const {toast}=useToast()
  const [downloading,setDownloading]=useState<string|null>(null)
  useEffect(()=>{
    studentApi.getCompleted().then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  const download = async (sessionId:string)=>{
    setDownloading(sessionId)
    try{
      await studentApi.downloadPdf(sessionId)
      toast({title:"Report downloaded", variant:"success"})
    }catch(e:any){
      toast({title:"Unable to generate report", description:e.message})
    }finally{ setDownloading(null)}
  }
  if(loading) return <LoadingState label="Loading completed tests..." />
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Completed Tests</h1>
        <p className="text-sm text-slate-500 mt-1">Submitted exams with scores and integrity reviews.</p>
      </div>
      {items.length===0 ? <EmptyState title="No completed tests" description="Your submitted exams will appear here." /> : (
        <div className="space-y-4">
          {items.map((it:any)=>(
            <Card key={it.sessionId} className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">{it.exam.title}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2"><FileText className="h-3 w-3"/>{it.exam.subject} • {it.exam.teacher?.name} • Submitted {it.submittedAt ? new Date(it.submittedAt).toLocaleString():''}</div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {it.score ? (
                      <>
                        <Badge variant={it.score.passed ? "success":"danger"}>{it.score.passed ? "PASSED":"NOT PASSED"} • {it.score.obtained}/{it.score.total} • {it.score.percentage}%</Badge>
                        <span className="text-xs text-slate-500">Correct {it.score.correct} • Incorrect {it.score.incorrect} • Unanswered {it.score.unanswered}</span>
                      </>
                    ) : <Badge variant="neutral">{it.status}</Badge>}
                    {it.integrity && <Badge variant={it.integrity.status==='Pending' ? 'warning':'neutral'}>{it.integrity.level} • {it.integrity.status}</Badge>}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 lg:ml-4 w-full lg:w-auto">
                  <Link to={`/student/results/${it.sessionId}`} className="flex-1 lg:flex-initial"><Button size="sm" variant="secondary" className="w-full gap-1.5"><Award className="h-4 w-4"/> View Result</Button></Link>
                  <Link to={`/student/integrity-reports/${it.sessionId}`} className="flex-1 lg:flex-initial"><Button size="sm" variant="ghost" className="w-full gap-1.5"><ShieldCheck className="h-4 w-4"/> Integrity</Button></Link>
                  <Button size="sm" onClick={()=>download(it.sessionId)} loading={downloading===it.sessionId} className="gap-1.5"><Download className="h-4 w-4"/> PDF</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
