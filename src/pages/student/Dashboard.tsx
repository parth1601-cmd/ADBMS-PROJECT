import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { PageHeader } from "@/components/ui/PageHeader"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"
import { Clock3, FileText, Award, Calendar, Activity, CheckCircle2, PlayCircle, ArrowRight, BookOpen } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"

export default function StudentDashboard(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    studentApi.getDashboard().then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  if(loading) return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/> )}</div>
    </div>
  )
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  const s = data.stats
  const student = data.student
  const today = new Date().toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'})

  const StatusCard = ({label,value,icon:Icon,color}:{label:string; value:number; icon:any; color:string}) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">{label}</div>
        <div className={`h-7 w-7 rounded-lg grid place-items-center border ${color}`}><Icon className="h-4 w-4" aria-hidden/></div>
      </div>
      <div className="text-[22px] font-semibold tracking-tight text-slate-900 mt-2 leading-none">{value}</div>
      <div className="text-xs text-slate-600 mt-1">{label==="Available"?"Ready to start": label==="Upcoming"?"Scheduled": label==="In progress"?"Continue": "Submitted"}</div>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-semibold tracking-tight text-slate-900">Welcome back, {student.name}</h1>
            <p className="text-[13px] text-slate-600 mt-1">Here’s what you need to do next.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 w-fit"><Calendar className="h-3 w-3" aria-hidden/>{today}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">Class {student.class}</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">Section {student.section}</span>
          <span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700">{student.academicYear}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard label="Available" value={s.available} icon={FileText} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
        <StatusCard label="Upcoming" value={s.upcoming} icon={Clock3} color="bg-amber-50 border-amber-200 text-amber-700" />
        <StatusCard label="In progress" value={s.inProgress} icon={PlayCircle} color="bg-indigo-50 border-indigo-200 text-indigo-700" />
        <StatusCard label="Completed" value={s.completed} icon={CheckCircle2} color="bg-slate-50 border-slate-200 text-slate-600" />
      </div>

      {/* What to do next - priority */}
      {s.inProgress>0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500 text-white grid place-items-center"><PlayCircle className="h-4 w-4" aria-hidden/></div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-slate-900">You have {s.inProgress} test{s.inProgress>1?'s':''} in progress</div>
              <div className="text-xs text-slate-600">Continue where you left off — timer is running.</div>
            </div>
            <Link to="/student/in-progress"><Button size="sm">Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden/></Button></Link>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold tracking-widest uppercase text-slate-500">Available now</h2>
              <Link to="/student/tests" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
            </div>
            {data.availableTests.length===0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-8 w-8 text-slate-400 mx-auto" aria-hidden/>
                <div className="text-[13px] font-medium text-slate-900 mt-3">No tests available right now</div>
                <div className="text-xs text-slate-600 mt-1">Check upcoming or completed sections.</div>
              </Card>
            ) : data.availableTests.slice(0,3).map((ex:any)=>(
              <Card key={ex.id} className="p-4 flex gap-3 items-center hover:bg-slate-50/50 transition-colors mb-3 last:mb-0">
                <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 grid place-items-center text-slate-700 shrink-0"><FileText className="h-4 w-4" aria-hidden/></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-900 truncate">{ex.title}</div>
                  <div className="text-xs text-slate-600">{ex.subject} • {ex.questionsCount} Q • {ex.durationMinutes} min <span className="hidden sm:inline">• <Badge variant="success">{ex.status}</Badge></span></div>
                </div>
                <Link to={`/student/exams/${ex.id}/instructions`}><Button size="sm">Start</Button></Link>
              </Card>
            ))}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold tracking-widest uppercase text-slate-500">Upcoming</h2>
              <Link to="/student/upcoming" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
            </div>
            {data.upcomingTests.length===0 ? <div className="text-sm text-slate-500">No upcoming tests.</div> : data.upcomingTests.slice(0,3).map((ex:any)=>(
              <Card key={ex.id} className="p-4 flex gap-3 items-center mb-3 last:mb-0">
                <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-200 grid place-items-center text-amber-700 shrink-0"><Clock3 className="h-4 w-4" aria-hidden/></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-900 truncate">{ex.title}</div>
                  <div className="text-xs text-slate-600 truncate">{ex.subject} • Starts {new Date(ex.startAt).toLocaleString()} • {ex.durationMinutes} min</div>
                </div>
                <Badge variant="neutral">Scheduled</Badge>
              </Card>
            ))}
          </section>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-[13px]"><Activity className="h-4 w-4" aria-hidden/> Recent submissions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.recentSubmissions.length===0 ? <div className="text-[13px] text-slate-600">No submissions yet.</div> : data.recentSubmissions.slice(0,4).map((it:any)=>(
                <div key={it.sessionId} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 grid place-items-center shrink-0"><CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden/></div>
                  <div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-slate-900 truncate">{it.exam.title}</div><div className="text-xs text-slate-600">{it.exam.subject} • {new Date(it.submittedAt).toLocaleDateString()}</div></div>
                </div>
              ))}
              <div className="grid gap-2 pt-1">
                <Link to="/student/results"><Button variant="secondary" size="sm" className="w-full">View results</Button></Link>
                <Link to="/student/tests" className="text-center text-xs font-medium text-slate-600 hover:text-slate-900">Browse all tests</Link>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-slate-900">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm font-medium"><Award className="h-4 w-4 text-amber-300" aria-hidden/> Your progress</div>
              <div className="text-xs text-slate-300 mt-1">Completed {s.completed} of {s.completed + s.available + s.upcoming + s.inProgress} assigned exams.</div>
              <div className="mt-3 h-1.5 bg-white/15 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{width:`${s.completed ? Math.round(s.completed/(s.completed+s.available+s.upcoming+s.inProgress)*100):0}%`}} /></div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">Average {s.averageScore}%</span>
                <Link to="/student/results" className="text-xs font-medium text-white hover:underline">See details →</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
