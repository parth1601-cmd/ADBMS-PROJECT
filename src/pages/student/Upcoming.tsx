import { useEffect, useState } from "react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { Clock3, Calendar, Timer, FileText, User } from "lucide-react"

function Countdown({to}:{to:string}){
  const [left,setLeft]=useState("")
  useEffect(()=>{
    const calc=()=>{
      const diff = new Date(to).getTime() - Date.now()
      if(diff<=0) return "Starting now"
      const d=Math.floor(diff/86400000)
      const h=Math.floor((diff%86400000)/3600000)
      const m=Math.floor((diff%3600000)/60000)
      if(d>0) return `${d}d ${h}h ${m}m`
      if(h>0) return `${h}h ${m}m`
      return `${m}m`
    }
    setLeft(calc())
    const t=setInterval(()=>setLeft(calc()),60000)
    return ()=>clearInterval(t)
  },[to])
  return <span>{left}</span>
}

export default function Upcoming(){
  const [exams,setExams]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    studentApi.getUpcoming().then(setExams).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  if(loading) return <LoadingState label="Loading upcoming tests..." />
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Upcoming Tests</h1>
        <p className="text-sm text-slate-500 mt-1">Published exams scheduled for the future. You cannot start these early.</p>
      </div>
      {exams.length===0 ? <EmptyState title="No upcoming tests" description="Upcoming published exams will appear here." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {exams.map((e:any)=>(
            <Card key={e.id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900">{e.title}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><User className="h-3 w-3"/>{e.teacher?.name} • {e.subject}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><FileText className="h-3 w-3"/>{e.questionsCount} questions • {e.totalMarks} marks • {e.durationMinutes} min</div>
                  <div className="text-xs  mt-2 flex flex-col gap-1 text-slate-600">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3"/> Start: {new Date(e.startAt).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3"/> End: {new Date(e.endAt).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5 font-medium text-amber-700"><Timer className="h-3 w-3"/> Starts in <Countdown to={e.startAt} /></span>
                  </div>
                </div>
                <Badge variant="warning">Scheduled</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" disabled className="flex-1">Starts Soon</Button>
                <span className="text-xs text-slate-500">Not startable early</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
