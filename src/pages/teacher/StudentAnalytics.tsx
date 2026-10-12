import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { reportApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

export default function StudentAnalytics(){
  const { studentId, id } = useParams()
  const sid = studentId || id
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState<string|null>(null)
  const [range,setRange]=useState("30d")
  useEffect(()=>{
    if(!sid) return
    reportApi.studentAnalytics(sid, {range}).then(setData).catch(e=> setError(e.message))
  },[sid, range])
  if(!sid) return <ErrorState description="No student id" />
  if(error) return <ErrorState description={error} />
  if(!data) return <LoadingState label="Loading student analytics…" />
  const subjectData = data.subjectPerformance || data.subjects || []
  const recent = data.recentResults || data.recent || data.exams || []
  const integrity = data.integrity || { total: data.integrityReviews ?? 0, reviewed: data.reviewed ?? 0, requiresFollowUp: data.requiresFollowUp ?? 0 }
  return (
    <div className="space-y-6">
      <PageHeader title={data.student?.name || "Student Analytics"} description={`${data.student?.email || ''} • ${data.student?.class || '10-A'}`} actions={
        <select value={range} onChange={e=> setRange(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]" aria-label="Date range">
          <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="year">This academic year</option>
        </select>
      } />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Exams completed</div><div className="text-xl font-semibold mt-1">{data.examsCompleted ?? data.stats?.examsCompleted ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Average score</div><div className="text-xl font-semibold mt-1">{data.averageScore ?? data.stats?.averageScore ?? 0}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Pass rate</div><div className="text-xl font-semibold mt-1">{data.passRate ?? data.stats?.passRate ?? 0}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Integrity reviews</div><div className="text-xl font-semibold mt-1">{integrity.total}</div><div className="text-xs text-slate-500">Reviewed: {integrity.reviewed} • Follow-up: {integrity.requiresFollowUp ?? integrity.requires_follow_up ?? 0}</div></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Subject performance</CardTitle></CardHeader>
          <CardContent>
            {subjectData.length===0 ? <EmptyState title="No data" description="Not enough responses yet." /> :
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="subject" tick={{fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="averageScore" fill="#0f172a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Integrity review history</CardTitle><p className="text-xs text-slate-600">Neutral history — not a “cheating history”.</p></CardHeader>
          <CardContent>
            {data.integrityHistory?.length===0 ? <EmptyState title="No integrity reviews" description="No reviews for this student." /> :
            <div className="space-y-2">
              {data.integrityHistory.slice(0,5).map((r:any)=>(
                <div key={r.sessionId} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div><div className="text-sm font-medium">{r.exam}</div><div className="text-xs text-slate-600">{r.subject} • Score {r.score}</div></div>
                  <span className="text-xs px-2 py-1 rounded-full border bg-slate-50">{r.level}</span>
                </div>
              ))}
            </div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent results</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recent.length===0 ? <div className="p-6"><EmptyState title="No results yet" description="Student has not completed exams." /></div> :
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Exam</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Subject</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Score</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Passed</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r:any)=>(
                  <tr key={r.examId || r.sessionId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium">{r.title || r.exam}</td>
                    <td className="px-3 py-2">{r.subject}</td>
                    <td className="px-3 py-2 text-center">{r.score ?? r.percentage ?? '-'}%</td>
                    <td className="px-3 py-2 text-center">{r.passed ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-xs">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </CardContent>
      </Card>
    </div>
  )
}

