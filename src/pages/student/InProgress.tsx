import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { Clock3, PlayCircle, Timer } from "lucide-react"

export default function InProgress(){
  const [sessions,setSessions]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    studentApi.getInProgress().then(setSessions).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  if(loading) return <LoadingState label="Loading in-progress tests..." />
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">In Progress</h1>
        <p className="text-sm text-slate-500 mt-1">Continue your active exam sessions. Never creates duplicate sessions.</p>
      </div>
      {sessions.length===0 ? <EmptyState title="No active sessions" description="Your in-progress exams will appear here. Start a test from Available Tests." action={{label:"Go to Available", onClick:()=> location.href='/student/tests'}} /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {sessions.map((s:any)=>(
            <Card key={s.sessionId} className="p-5 flex flex-col gap-4 border-amber-200 bg-amber-50/30">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-slate-900">{s.exam.title}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.exam.subject} • {s.exam.teacher?.name}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Timer className="h-3 w-3"/> Time left: {Math.floor(s.remainingSec/60)}:{String(s.remainingSec%60).padStart(2,'0')} • Deadline {s.deadlineAt ? new Date(s.deadlineAt).toLocaleString(): ''}</div>
                  <div className="text-xs text-slate-600 mt-2">Progress: {s.progress.answered}/{s.progress.total} answered • {s.progress.percent}%</div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden"><div className="h-full bg-amber-500" style={{width:`${s.progress.percent}%`}}/></div>
                </div>
                <Badge variant="warning">In Progress</Badge>
              </div>
              <Link to={`/student/exams/${s.exam.id}/take`} className="mt-auto"><Button size="sm" className="w-full gap-2"><PlayCircle className="h-4 w-4"/> Continue Test</Button></Link>
              <div className="text-xs text-slate-500 flex items-center gap-1.5"><Clock3 className="h-3 w-3"/> Resumes existing session</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
