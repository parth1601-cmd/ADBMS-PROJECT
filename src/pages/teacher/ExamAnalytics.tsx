import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { reportApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Button } from "@/components/ui/Button"

export default function ExamAnalytics(){
  const { examId, id } = useParams()
  const eid = examId || id
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    if(!eid) return
    reportApi.examReport(eid!).then(setData).catch(e=> setError(e.message))
  },[eid])
  if(error) return <ErrorState description={error} />
  if(!data) return <LoadingState label="Loading exam analytics…" />
  const stats = data.stats || data
  const questions = data.questions || data.questionStats || []
  return (
    <div className="space-y-6">
      <PageHeader title={data.exam?.title || "Exam Analytics"} description={`${data.exam?.subject || ''} • Analytics for this exam`} actions={<Link to="/teacher/analytics"><Button variant="secondary" size="sm">Back to analytics</Button></Link>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Total Students</div><div className="text-xl font-semibold mt-1">{stats.totalStudents ?? stats.started ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Completed</div><div className="text-xl font-semibold mt-1">{stats.completed ?? stats.submitted ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Average Score</div><div className="text-xl font-semibold mt-1">{stats.averageScore ?? stats.avgScore ?? 0}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Pass Rate</div><div className="text-xl font-semibold mt-1">{stats.passRate ?? 0}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Highest</div><div className="text-xl font-semibold mt-1">{stats.highestScore ?? 0}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Lowest</div><div className="text-xl font-semibold mt-1">{stats.lowestScore ?? 0}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Median</div><div className="text-xl font-semibold mt-1">{stats.medianScore ?? 0}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Avg Completion</div><div className="text-xl font-semibold mt-1">{stats.averageCompletionTimeSec ? `${Math.floor(stats.averageCompletionTimeSec/60)}m` : '-'}</div></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Score distribution</CardTitle></CardHeader>
          <CardContent>
            {data.scoreDistribution?.length===0 ? <EmptyState title="No submissions yet" description="" /> :
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="range" tick={{fontSize:11}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f172a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Time per question</CardTitle></CardHeader>
          <CardContent>
            {data.timePerQuestion?.length===0 ? <EmptyState title="No data" description="Not enough responses yet." /> :
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timePerQuestion.slice(0,10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="question" tick={{fontSize:10}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="avgTime" fill="#0ea5e9" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Question analytics</CardTitle><p className="text-xs text-slate-600 mt-1">Helps identify poorly designed questions. If insufficient data: “Not enough responses yet.”</p></CardHeader>
        <CardContent className="p-0">
          {questions.length===0 ? <div className="p-6"><EmptyState title="No questions" description="No questions for this exam." /></div> :
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Q</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Type</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Text</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Attempts</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Correct</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Incorrect</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Skipped</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Avg time</th>
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q:any)=>(
                  <tr key={q.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-center font-medium">Q{q.order}</td>
                    <td className="px-3 py-2 text-xs">{q.type}</td>
                    <td className="px-3 py-2 max-w-[260px] truncate text-xs" title={q.text}>{q.text}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{q.attempts ?? q.attempts}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{q.correct ?? 0} {q.correctPct!==undefined ? `(${q.correctPct}%)` : ''}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{q.incorrect ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{q.skipped ?? q.skippedCount ?? 0}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{q.avgTimeSec ?? q.averageTime ?? '-'}s</td>
                    <td className="px-3 py-2 text-center text-xs">{q.difficulty ?? q.difficultyEstimate ?? '-'} {q.notEnoughData && <span className="text-amber-600 block text-[11px]">Not enough responses yet.</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </CardContent>
      </Card>

      {data.classPerformance && (
        <Card>
          <CardHeader><CardTitle>Performance by class / section</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.classPerformance.map((c:any)=>(
                <div key={c.class} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <span className="text-sm font-medium">{c.class} {c.section ? `• ${c.section}`:''}</span>
                  <span className="text-sm text-slate-600">Avg {c.averageScore ?? c.avgScore} • Pass {c.passRate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

