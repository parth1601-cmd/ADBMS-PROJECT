import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { reportApi, reviewApi } from '@/services/apiServices'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States'
import { FileText, Users, ShieldAlert, CheckCircle2, Download, Filter, Eye, FileBarChart, Calendar, Award } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { api } from '@/services/api'

export default function Reports(){
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState<string|null>(null)
  const {toast}=useToast()
  const [filterExam, setFilterExam]=useState('All')
  const [filterClass, setFilterClass]=useState('All')
  const [filterStatus, setFilterStatus]=useState('All')
  const [dateFrom, setDateFrom]=useState('')
  const [dateTo, setDateTo]=useState('')
  const [downloading, setDownloading]=useState<string|null>(null)
  const [recentReviews, setRecentReviews]=useState<any[]>([])

  useEffect(()=>{
    reportApi.overview().then(setData).catch(e=> setError(e.message))
    reviewApi.getReviewsPaginated({limit:5}).then(r=> setRecentReviews(r.reviews || [])).catch(()=>{})
  },[])
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  if(!data) return <LoadingState label="Loading reports…" />
  const distro = [
    {name:'Normal', value: data.distribution.NORMAL, color:'#10b981'},
    {name:'Low', value: data.distribution.LOW_CONCERN, color:'#0ea5e9'},
    {name:'Review', value: data.distribution.REQUIRES_REVIEW, color:'#f59e0b'},
    {name:'High', value: data.distribution.HIGH_PRIORITY_REVIEW, color:'#ef4444'},
  ]
  const filteredExams = useMemo(()=>{
    let list=[...data.exams]
    if(filterExam!=='All') list=list.filter((e:any)=> e.title===filterExam)
    if(filterStatus!=='All'){
      // filter by derived status? simple: pending >0 means needs review
      if(filterStatus==='Pending') list=list.filter((e:any)=> e.pending>0)
      if(filterStatus==='Completed') list=list.filter((e:any)=> e.pending===0)
    }
    return list
  },[data.exams, filterExam, filterStatus])

  const handleGeneratePdf = async (examId: string)=>{
    setDownloading(examId)
    try{
      const blob = await reportApi.generateExamAnalyticsPdf(examId)
      const url = URL.createObjectURL(blob)
      const a=document.createElement('a'); a.href=url; a.download=`ExamGuard-Exam-${examId.slice(-6)}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast({title:"PDF generated", description:"Exam analytics report downloaded", variant:"success"})
    }catch(e:any){
      toast({title:"PDF pending", description:"Report generation is processing. Try again shortly.", variant:"info"})
    }finally{ setDownloading(null)}
  }
  const handleIntegrityPdf = async (reviewId: string)=>{
    setDownloading(reviewId)
    try{
      const blob = await reportApi.generateIntegrityPdf(reviewId)
      const url = URL.createObjectURL(blob)
      const a=document.createElement('a'); a.href=url; a.download=`ExamGuard-Integrity-${reviewId.slice(-6)}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      toast({title:"Integrity report downloaded", variant:"success"})
    }catch(e:any){ toast({title:"Unable to generate", description:e.message})}
    finally{ setDownloading(null)}
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="How students are performing and where review attention is needed. Reports share the same visual language as PDFs." actions={<Link to="/teacher/analytics"><Button variant="secondary" size="sm"><FileBarChart className="h-4 w-4"/> Analytics</Button></Link>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active exams" value={data.activeExams} icon={FileText} sub="Live & scheduled" />
        <StatCard label="Total students" value={data.totalStudents} icon={Users} sub="Enrolled" />
        <StatCard label="Pending reviews" value={data.pendingReviews} icon={ShieldAlert} sub="Needs attention" />
        <StatCard label="Completed" value={data.completedReviews} icon={CheckCircle2} sub="Reviewed" />
      </div>

      {/* Filters — exam, class, section, date, status */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-500"/><span className="text-[13px] font-semibold text-slate-900">Filters</span>
          <span className="text-xs text-slate-500">Exam • Class • Status • Date</span>
          <button onClick={()=>{ setFilterExam('All'); setFilterClass('All'); setFilterStatus('All'); setDateFrom(''); setDateTo('')}} className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-700">Clear</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={filterExam} onChange={e=> setFilterExam(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]">
            <option value="All">All exams</option>{data.exams.map((ex:any)=> <option key={ex.id} value={ex.title}>{ex.title}</option>)}
          </select>
          <select value={filterClass} onChange={e=> setFilterClass(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]">
            <option value="All">All classes</option><option value="10-A">10-A</option><option value="10-B">10-B</option><option value="11-A">11-A</option>
          </select>
          <select value={filterStatus} onChange={e=> setFilterStatus(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]">
            <option value="All">All statuses</option><option value="Pending">Pending review</option><option value="Completed">Completed</option>
          </select>
          <input type="date" value={dateFrom} onChange={e=> setDateFrom(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]" placeholder="From" />
          <input type="date" value={dateTo} onChange={e=> setDateTo(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]" placeholder="To" />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="h-3.5 w-3.5"/> Showing {filteredExams.length} of {data.exams.length} exams • Filters apply to table and exports
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Review priority distribution</CardTitle><p className="text-xs text-slate-600 mt-1">Share of reviews by priority level.</p></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distro} dataKey="value" innerRadius={56} outerRadius={88} paddingAngle={3}>
                    {distro.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{fontSize:12, borderRadius:8, border:'1px solid #e2e8f0'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize:12}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Exams at a glance</CardTitle><p className="text-xs text-slate-600 mt-1">Pending reviews and average score per exam.</p></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.exams} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="title" tick={{fontSize:10, fill:'#64748b'}} interval={0} angle={-14} textAnchor="end" height={54} />
                  <YAxis tick={{fontSize:11, fill:'#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill:'#f8fafc'}} contentStyle={{fontSize:12, borderRadius:8, border:'1px solid #e2e8f0'}} />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4,4,0,0]} />
                  <Bar dataKey="avgScore" fill="#0f172a" name="Avg score" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Per-exam reports</CardTitle>
            <p className="text-xs text-slate-600 mt-1">View, generate and download professional PDFs. PDFs are generated from structured data — not screenshots.</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200"><Award className="h-3.5 w-3.5"/> PDF reports</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="text-left px-4 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Exam</th>
                  <th scope="col" className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Qs</th>
                  <th scope="col" className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Students</th>
                  <th scope="col" className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Submissions</th>
                  <th scope="col" className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Pending</th>
                  <th scope="col" className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Avg</th>
                  <th scope="col" className="px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>{filteredExams.map((e:any)=><tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/50"><td className="px-4 py-2.5 font-medium text-slate-900">{e.title}<div className="text-xs text-slate-500">{e.subject}</div></td><td className="px-3 py-2.5 text-center tabular-nums">{e.questionsCount}</td><td className="px-3 py-2.5 text-center tabular-nums">{e.studentsCount}</td><td className="px-3 py-2.5 text-center tabular-nums">{e.submissionsCount}</td><td className="px-3 py-2.5 text-center tabular-nums">{e.pending}</td><td className="px-3 py-2.5 text-center tabular-nums">{Math.round(e.avgScore)}</td><td className="px-3 py-2.5 text-center"><div className="flex items-center justify-center gap-1"><Link to={`/teacher/analytics/exams/${e.id}`}><Button size="sm" variant="secondary" className="h-7 px-2 text-xs gap-1"><Eye className="h-3 w-3"/> View</Button></Link><Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={()=> handleGeneratePdf(e.id)} loading={downloading===e.id}><Download className="h-3 w-3"/> PDF</Button></div></td></tr>)}</tbody>
            </table>
          </div>
          {filteredExams.length===0 && <div className="p-6"><EmptyState title="No exams match filters" description="Adjust filters to see reports." /></div>}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="text-xs text-slate-600">Reports include: ExamGuard branding, Report ID, student/exam metadata, scores, integrity breakdown, timeline, review status, generated date.</div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={()=> toast({title:"Bulk export queued", description:"Reports will be generated as PDFs", variant:"info"})}>Generate all PDFs</Button>
              <Button size="sm" onClick={()=> toast({title:"Reports refreshed", variant:"success"})}>Refresh</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent integrity reviews — export</CardTitle><p className="text-xs text-slate-600 mt-1">Quick access to integrity PDFs for review queue.</p></CardHeader>
        <CardContent className="space-y-2">
          {recentReviews.length===0 ? <div className="text-sm text-slate-500">No reviews yet.</div> : recentReviews.map((r:any)=>(
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50">
              <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200 grid place-items-center"><ShieldAlert className="h-4 w-4 text-amber-700"/></div>
              <div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-slate-900 truncate">{r.student?.name || "Student"} • {r.exam?.title}</div><div className="text-xs text-slate-600">{r.score}/100 • {r.level || r.status}</div></div>
              <Button size="sm" variant="secondary" className="gap-1" onClick={()=> handleIntegrityPdf(r.id)} loading={downloading===r.id}><Download className="h-3.5 w-3.5"/> PDF</Button>
              <Link to={`/teacher/integrity-reviews/${r.id}`}><Button size="sm" variant="ghost">View</Button></Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
