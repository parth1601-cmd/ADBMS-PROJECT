import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { SearchInput } from "@/components/ui/Input"
import { Clock3, FileText, User, Hash, Calendar } from "lucide-react"

export default function AvailableTests(){
  const [exams,setExams]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [q,setQ]=useState("")
  useEffect(()=>{
    studentApi.getStudentExams().then(data=>{
      // filter available: isAvailable true and not submitted
      const now=new Date()
      const filtered=data.filter((e:any)=>{
        const startOk = !e.startAt || now >= new Date(e.startAt)
        const endOk = !e.endAt || now <= new Date(e.endAt)
        const isLive = e.status==='Live'
        const notSubmitted = !e.session || e.session.status!=='SUBMITTED'
        return isLive && startOk && endOk && notSubmitted
      })
      setExams(filtered)
    }).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  if(loading) return <LoadingState label="Loading available tests..." />
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  const filtered = q ? exams.filter(e=> e.title.toLowerCase().includes(q.toLowerCase()) || e.subject.toLowerCase().includes(q.toLowerCase())) : exams
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Available Tests</h1>
        <p className="text-sm text-slate-500 mt-1">Published tests currently available for you. Class 10-A.</p>
      </div>
      <Card className="p-4">
        <SearchInput value={q} onChange={setQ} placeholder="Search tests, subjects..." />
      </Card>
      {filtered.length===0 ? <EmptyState title="No available tests" description="No published tests are currently available. Check upcoming or completed." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((e:any)=>(
            <Card key={e.id} className="p-5 flex flex-col gap-4 hover:shadow-card transition">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{e.title}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><FileText className="h-3 w-3"/>{e.subject} • {e.questionsCount} questions • {e.totalMarks} marks • {e.durationMinutes} min</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><User className="h-3 w-3"/>{e.teacher?.name}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Calendar className="h-3 w-3"/> {e.startAt? new Date(e.startAt).toLocaleString():''} → {e.endAt? new Date(e.endAt).toLocaleString():''}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="success">{e.status}</Badge>
                    {e.session?.status==='IN_PROGRESS' && <Badge variant="warning">In Progress</Badge>}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 grid place-items-center text-indigo-700"><Hash className="h-4 w-4"/></div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                {e.session?.status==='IN_PROGRESS' ? (
                  <Link to={`/student/exams/${e.id}/take`} className="flex-1"><Button size="sm" className="w-full">Continue Test</Button></Link>
                ) : (
                  <Link to={`/student/exams/${e.id}/instructions`} className="flex-1"><Button size="sm" className="w-full">Start Test</Button></Link>
                )}
                <Link to={`/student/exams/${e.id}/instructions`} className="text-xs font-medium text-slate-600 hover:text-slate-900">Instructions</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
