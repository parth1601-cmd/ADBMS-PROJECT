import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { StatCard } from "@/components/ui/StatCard"
import { Button } from "@/components/ui/Button"
import { PageHeader } from "@/components/ui/PageHeader"
import { ScoreBadge } from "@/components/ui/ScoreIndicator"
import { Alert } from "@/components/ui/Alert"
import { EmptyState } from "@/components/ui/States"
import { FileText, Users, ShieldAlert, BarChart3, Plus, ArrowRight, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { reportApi, reviewApi } from "@/services/apiServices"
import { useAuth } from "@/context/AuthContext"
import { Skeleton } from "@/components/ui/Skeleton"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"

export default function TeacherDashboard(){
  const {user} = useAuth()
  const [data,setData]=useState<any>(null)
  const [reviews,setReviews]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    Promise.allSettled([
      reportApi.overview().then(setData).catch(()=> setData({activeExams:4, totalStudents:40, pendingReviews:6, completedReviews:1, distribution:{NORMAL:1, LOW_CONCERN:1, REQUIRES_REVIEW:3, HIGH_PRIORITY_REVIEW:2}, exams: [], recentActivity: []})),
      reviewApi.getReviews({status:'Pending'}).then(r=> setReviews(r.slice(0,3))).catch(()=>{})
    ]).finally(()=> setLoading(false))
  },[])
  if(loading) {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({length:4}).map((_,i)=><div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"><Skeleton className="h-3 w-20"/><Skeleton className="h-6 w-12"/><Skeleton className="h-3 w-24"/></div>)}
        </div>
      </div>
    )
  }
  const distro = data ? [
    {name:"Normal", value: data.distribution.NORMAL, color:"#10b981"},
    {name:"Low", value: data.distribution.LOW_CONCERN, color:"#0ea5e9"},
    {name:"Review", value: data.distribution.REQUIRES_REVIEW, color:"#f59e0b"},
    {name:"High", value: data.distribution.HIGH_PRIORITY_REVIEW, color:"#ef4444"},
  ] : []
  const greeting = (()=>{ const h=new Date().getHours(); if(h<12) return "Good morning"; if(h<18) return "Good afternoon"; return "Good evening"})()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.name?.split(" ")[0] || "Teacher"}`}
        description="Here’s what needs your attention today."
        actions={
          <>
            <Link to="/teacher/exams"><Button variant="secondary" size="sm"><Plus className="h-4 w-4" />Create exam</Button></Link>
            <Link to="/teacher/reviews"><Button size="sm">Review queue<ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active exams" value={data.activeExams} sub="Live & scheduled" icon={FileText} />
        <StatCard label="Students" value={data.totalStudents} sub="Total enrolled" icon={Users} />
        <StatCard label="Needs review" value={data.pendingReviews} sub="Awaiting your decision" icon={ShieldAlert} />
        <StatCard label="Reviewed" value={data.completedReviews} sub="Completed" icon={CheckCircle2} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attention */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Needs attention</CardTitle>
              <p className="text-xs text-slate-600 mt-1">Highest priority integrity reviews</p>
            </div>
            <Link to="/teacher/reviews" className="text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap">View all →</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviews.length>0 ? reviews.map((r:any)=>(
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
                <GeneratedAvatar name={r.student.name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-900 truncate">{r.student.name}</div>
                  <div className="text-xs text-slate-600 truncate">{r.exam.title} • {r.signals?.length || 0} signals</div>
                </div>
                <div className="text-right shrink-0">
                  <ScoreBadge score={r.score} size="sm" />
                </div>
                <Link to={`/teacher/reviews/${r.id}`} className="shrink-0"><Button size="sm" variant="secondary">Review</Button></Link>
              </div>
            )) : (
              <EmptyState title="No pending reviews" description="All submissions have been reviewed. You’re all caught up." />
            )}
            {reviews.length>0 && <Alert variant="neutral" className="text-xs">Scores show review priority, not a verdict. Every case needs your judgment.</Alert>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review distribution</CardTitle>
            <p className="text-xs text-slate-600 mt-1">Across active exams</p>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distro} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize:11, fill:'#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:11, fill:'#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{fill:'#f8fafc'}} contentStyle={{fontSize:12, borderRadius:8, border:'1px solid #e2e8f0'}} />
                  <Bar dataKey="value" radius={[6,6,0,0]} fill="#0f172a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {distro.map(d=>(
                <div key={d.name} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full" style={{background:d.color}} aria-hidden/>{d.name}</span>
                  <span className="font-medium text-slate-900">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden/> Today</span>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {[
                {t:"09:58", title:"Exam submitted — Aarav Sharma", desc:"Mathematics Midterm · Review score 78"},
                {t:"09:55", title:"New review — Ananya Patel", desc:"Score 61 · Requires Review"},
                {t:"Yesterday", title:"Review completed — Diya Nair", desc:"Marked Reviewed · No concerns"},
                {t:"Sep 02", title:"Exam published — Mathematics Midterm", desc:"40 students notified"},
              ].map((it,i)=>(
                <li key={i} className="flex gap-3">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" aria-hidden/>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">{it.t}</span>
                      <span className="text-[13px] font-medium text-slate-900 truncate">{it.title}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{it.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <Link to="/teacher/exams" className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white grid place-items-center group-hover:bg-slate-800"><Plus className="h-4 w-4" aria-hidden/></div>
              <div><div className="text-[13px] font-medium text-slate-900">Create exam</div><div className="text-xs text-slate-600">Draft, preview, publish</div></div>
              <ArrowRight className="h-4 w-4 text-slate-400 ml-auto" aria-hidden/>
            </Link>
            <Link to="/teacher/reviews" className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 grid place-items-center"><ShieldAlert className="h-4 w-4" aria-hidden/></div>
              <div><div className="text-[13px] font-medium text-slate-900">Review queue</div><div className="text-xs text-slate-600">{data.pendingReviews} pending</div></div>
              <ArrowRight className="h-4 w-4 text-slate-400 ml-auto" aria-hidden/>
            </Link>
            <Link to="/teacher/students" className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center"><Users className="h-4 w-4" aria-hidden/></div>
              <div><div className="text-[13px] font-medium text-slate-900">Students</div><div className="text-xs text-slate-600">Directory & performance</div></div>
            </Link>
            <Link to="/teacher/reports" className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center"><BarChart3 className="h-4 w-4" aria-hidden/></div>
              <div><div className="text-[13px] font-medium text-slate-900">Reports</div><div className="text-xs text-slate-600">Analytics & insights</div></div>
            </Link>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" aria-hidden/>
              <p className="text-xs leading-4 text-slate-600">Tip: Review priority scores are signals, not verdicts. Use timeline & signals to decide.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

