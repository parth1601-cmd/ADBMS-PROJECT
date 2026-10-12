import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge, StatusBadge } from "@/components/ui/Badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { SearchInput } from "@/components/ui/Input"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"

export default function StudentExams(){
  const [q, setQ] = useState("")
  const [tab, setTab] = useState("all")
  const [exams,setExams]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    studentApi.getStudentExams().then(setExams).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  const filtered = useMemo(()=>{
    let list=[...exams]
    if(q) list=list.filter(e=> e.title.toLowerCase().includes(q.toLowerCase()))
    if(tab==="upcoming") list=list.filter(e=> e.status==="Scheduled")
    else if(tab==="available") list=list.filter(e=> e.status==="Live" && !e.session)
    else if(tab==="completed") list=list.filter(e=> e.session?.status==='SUBMITTED' || e.session?.status==='EXPIRED')
    return list
  },[exams,q,tab])

  const getAction = (e:any)=>{
    const st=e.status
    const hasSession=e.session
    if(hasSession?.status==='IN_PROGRESS') return <Link to={`/student/exams/${e.id}/take`}><Button size="sm">Continue</Button></Link>
    if(st==="Live") return <Link to={`/student/exams/${e.id}/instructions`}><Button size="sm">Start Exam</Button></Link>
    if(st==="Scheduled") return <Button variant="secondary" size="sm" disabled>Starts Soon</Button>
    if(st==="Completed" || hasSession?.status==='SUBMITTED') return <Link to={`/student/results/${hasSession.id}`}><Button variant="ghost" size="sm">View Result</Button></Link>
    return <Badge variant="neutral">Not available</Badge>
  }

  if(loading) return <LoadingState label="Loading exams..." />
  if(error) return <ErrorState description={error} />
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">My Exams</h1>
        <p className="text-sm text-slate-500 mt-1">Upcoming, available and completed assessments.</p>
      </div>
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search exams…" /></div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((e:any)=>(
          <Card key={e.id} className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">{e.title}</div>
                <div className="text-xs text-slate-500 mt-1">{e.subject} • {e.questionsCount} questions • {e.durationMinutes} min • {e.startAt? new Date(e.startAt).toLocaleDateString():''}</div>
                {e.teacher && <div className="text-xs text-slate-500">{e.teacher.name}</div>}
              </div>
              <StatusBadge status={e.status} />
            </div>
            <div className="flex items-center gap-2 mt-auto">
              {getAction(e)}
              <Link to={`/student/exams/${e.id}/instructions`} className="text-xs font-medium text-slate-600 hover:text-slate-900 ml-auto">Instructions</Link>
            </div>
          </Card>
        ))}
      </div>
      {filtered.length===0 && <div className="text-center py-12 text-sm text-slate-500">No exams found.</div>}
    </div>
  )
}
