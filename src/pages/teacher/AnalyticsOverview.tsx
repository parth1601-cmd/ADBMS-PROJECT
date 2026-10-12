import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatCard } from "@/components/ui/StatCard"
import { reportApi } from "@/services/apiServices"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LineChart, Line } from "recharts"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { FileText, Users, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react"
import { Link } from "react-router-dom"

export default function AnalyticsOverview(){
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState<string|null>(null)
  const [range,setRange]=useState("30d")
  useEffect(()=>{
    setError(null)
    reportApi.overview().then(setData).catch(e=> setError(e.message))
  },[range])
  if(error) return <ErrorState description={error} retry={()=> window.location.reload()} />
  if(!data) return <LoadingState label="Loading analytics…" />
  const distro = [
    {name:'Normal', value: data.distribution?.NORMAL ?? 0, color:'#10b981'},
    {name:'Low', value: data.distribution?.LOW_CONCERN ?? 0, color:'#0ea5e9'},
    {name:'Review', value: data.distribution?.REQUIRES_REVIEW ?? 0, color:'#f59e0b'},
    {name:'High', value: data.distribution?.HIGH_PRIORITY_REVIEW ?? 0, color:'#ef4444'},
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="How students are performing and where review attention is needed. All data comes from the database." actions={
        <div className="flex items-center gap-2">
          <select value={range} onChange={e=> setRange(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]" aria-label="Date range">
            <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="year">This academic year</option>
          </select>
          <Link to="/teacher/analytics/integrity" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Integrity →</Link>
        </div>
      } />

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /> Integrity signals are indicators for review, not proof of misconduct. Every case requires human judgment.</div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={data.totalStudents ?? data.totalStudentsLegacy ?? 0} icon={Users} sub="Enrolled" />
        <StatCard label="Total Exams" value={data.totalExams ?? data.activeExams ?? 0} icon={FileText} sub="Live & scheduled" />
        <StatCard label="Average Score" value={data.averageScore ?? 0} icon={CheckCircle2} sub="%" />
        <StatCard label="Pass Rate" value={`${data.passRate ?? 0}%`} icon={CheckCircle2} sub="≥40% pass" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Integrity Reviews" value={data.pendingReviews ?? data.integrityReviews ?? 0} icon={ShieldAlert} sub="Needs attention" />
        <StatCard label="High Priority" value={data.highPriority ?? 0} icon={ShieldAlert} sub="80-100" />
        <StatCard label="Review Rate" value={`${data.reviewRate ?? 0}%`} icon={ShieldAlert} sub="of submissions" />
        <StatCard label="Completed" value={data.completedReviews ?? 0} icon={CheckCircle2} sub="Reviewed" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Exams at a glance</CardTitle><p className="text-xs text-slate-600 mt-1">Pending reviews and average integrity score per exam.</p></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.exams} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="title" tick={{fontSize:10, fill:'#64748b'}} interval={0} angle={-14} textAnchor="end" height={54} />
                  <YAxis tick={{fontSize:11, fill:'#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill:'#f8fafc'}} contentStyle={{fontSize:12, borderRadius:8, border:'1px solid #e2e8f0'}} />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4,4,0,0]} />
                  <Bar dataKey="avgScore" fill="#0f172a" name="Avg integrity score" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Review priority distribution</CardTitle><p className="text-xs text-slate-600 mt-1">Share of reviews by priority level.</p></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distro} dataKey="value" innerRadius={56} outerRadius={88} paddingAngle={3}>
                    {distro.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{fontSize:12, borderRadius:8, border:'1px solid #e2e8f0'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              {distro.map(d=> <div key={d.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:d.color}} />{d.name}: <b>{d.value}</b></div>)}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.reviewsOverTime && data.reviewsOverTime.length>0 && (
        <Card>
          <CardHeader><CardTitle>Reviews over time</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.reviewsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Per-exam details</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.exams?.length===0 ? <div className="p-6"><EmptyState title="No exams yet" description="Create an exam to see analytics." /></div> :
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Exam</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Qs</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Students</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Submissions</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Pending</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Avg</th>
                </tr>
              </thead>
              <tbody>{data.exams.map((e:any)=><tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/50"><td className="px-4 py-2.5 font-medium text-slate-900"><Link to={`/teacher/analytics/exams/${e.id}`} className="text-indigo-600 hover:underline">{e.title}</Link></td><td className="px-3 py-2.5 text-center tabular-nums">{e.questionsCount}</td><td className="px-3 py-2.5 text-center tabular-nums">{e.studentsCount}</td><td className="px-3 py-2.5 text-center tabular-nums">{e.submissionsCount}</td><td className="px-3 py-2.5 text-center tabular-nums">{e.pending}</td><td className="px-3 py-2.5 text-center tabular-nums">{Math.round(e.avgScore)}</td></tr>)}</tbody>
            </table>
          </div>}
        </CardContent>
      </Card>
    </div>
  )
}

