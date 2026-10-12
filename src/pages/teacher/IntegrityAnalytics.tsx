import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { reportApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts"

export default function IntegrityAnalytics(){
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState<string|null>(null)
  const [range,setRange]=useState("30d")
  useEffect(()=>{
    reportApi.integrityAnalytics({range}).then(setData).catch(e=> setError(e.message))
  },[range])
  if(error) return <ErrorState description={error} />
  if(!data) return <LoadingState label="Loading integrity analytics…" />
  const distro = [
    {name:'Normal', value:data.distribution.NORMAL, color:'#10b981'},
    {name:'Low', value:data.distribution.LOW_CONCERN, color:'#0ea5e9'},
    {name:'Review', value:data.distribution.REQUIRES_REVIEW, color:'#f59e0b'},
    {name:'High', value:data.distribution.HIGH_PRIORITY_REVIEW, color:'#ef4444'},
  ]
  return (
    <div className="space-y-6">
      <PageHeader title="Integrity Analytics" description="How integrity signals are distributed across exams, classes and time. Signals require human review." actions={
        <select value={range} onChange={e=> setRange(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]" aria-label="Date range">
          <option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="year">This academic year</option>
        </select>
      } />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Total submissions", data.totalSubmissions],
          ["Reviews generated", data.reviewsGenerated],
          ["Avg integrity score", data.averageIntegrityScore],
          ["High priority", data.highPriorityReviews],
          ["Review rate", `${data.reviewRate}%`],
          ["Avg tab events", data.averageTabEvents],
          ["Avg answer changes", data.averageAnswerChanges],
          ["Avg clipboard", data.averageClipboardEvents],
        ].map(([label,val])=>(
          <Card key={String(label)}><CardContent className="p-4"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">{label}</div><div className="text-xl font-semibold text-slate-900 mt-1">{String(val)}</div></CardContent></Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Integrity score distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distro} dataKey="value" innerRadius={56} outerRadius={88} paddingAngle={3}>
                    {distro.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              {distro.map(d=> <div key={d.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:d.color}} />{d.name}: <b>{d.value}</b></div>)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Signal frequency</CardTitle><p className="text-xs text-slate-600 mt-1">How often each signal type appears.</p></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.signalFrequency} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="type" tick={{fontSize:9, fill:'#64748b'}} interval={0} angle={-14} textAnchor="end" height={54} />
                  <YAxis tick={{fontSize:11}} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f172a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      {data.reviewsOverTime?.length>0 && (
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
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Signal frequency by exam</CardTitle></CardHeader>
          <CardContent>
            {data.signalByExam?.length===0 ? <div className="text-sm text-slate-500">No data.</div> :
            <div className="space-y-3">
              {data.signalByExam.slice(0,5).map((e:any)=>(
                <div key={e.exam} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-medium text-slate-900">{e.exam}</div>
                  <div className="text-xs text-slate-600 mt-1">{Object.entries(e.counts).map(([k,v])=> `${k}:${v}`).join(' • ')}</div>
                </div>
              ))}
            </div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Class / section comparison</CardTitle></CardHeader>
          <CardContent>
            {data.classComparison?.map((c:any)=>(
              <div key={c.class} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                <div><div className="text-sm font-medium">{c.class} {c.section}</div><div className="text-xs text-slate-600">{c.students} students</div></div>
                <div className="text-right"><div className="text-sm font-semibold">{c.averageReviewScore}</div><div className="text-xs text-slate-500">avg review score</div></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

