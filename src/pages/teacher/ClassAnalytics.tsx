import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { reportApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { Link } from "react-router-dom"

export default function ClassAnalytics(){
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    reportApi.classAnalytics().then(setData).catch(e=> setError(e.message))
  },[])
  if(error) return <ErrorState description={error} />
  if(!data) return <LoadingState label="Loading class analytics…" />
  const classes = data.classes || data.sections || []
  if(classes.length===0) return <div className="space-y-6"><PageHeader title="Class Analytics" description="Performance by class and section." /><EmptyState title="No class data" description="No analytics data for this period." /></div>
  return (
    <div className="space-y-6">
      <PageHeader title="Class Analytics" description="Average score, pass rate, completion and review scores by class." />
      <div className="grid lg:grid-cols-2 gap-6">
        {classes.map((c:any)=>(
          <Card key={c.class}>
            <CardHeader><CardTitle>{c.class} {c.section && `• ${c.section}`}</CardTitle><p className="text-xs text-slate-600">{c.students} students</p></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Avg score</div><div className="text-lg font-semibold mt-1">{c.averageScore ?? '-'}</div></div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Pass rate</div><div className="text-lg font-semibold mt-1">{c.passRate ?? '-'}%</div></div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Completion</div><div className="text-lg font-semibold mt-1">{c.completionRate ?? '-'}%</div></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <span className="text-sm text-slate-600">Avg review score</span><span className="text-sm font-semibold">{c.averageReviewScore ?? c.avgReviewScore ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3">
                <span className="text-sm text-amber-900">Reviews requiring attention</span><span className="text-sm font-bold text-amber-900">{c.reviewsRequiringAttention ?? 0}</span>
              </div>
              <Link to="/teacher/analytics" className="text-xs text-indigo-600 hover:underline">View analytics →</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

