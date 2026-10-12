import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Card } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatusBadge } from "@/components/ui/Badge"
import { ScoreBadge } from "@/components/ui/ScoreIndicator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { reviewApi } from "@/services/apiServices"
import { EmptyState, LoadingState, ErrorState } from "@/components/ui/States"
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, Download } from "lucide-react"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"

export default function ReviewQueue({examId}:{examId?:string}){
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get("search") || "")
  const [tab, setTab] = useState(searchParams.get("status") || "all")
  const [scoreFilter, setScoreFilter] = useState(searchParams.get("score") || "All")
  const [signalFilter, setSignalFilter] = useState(searchParams.get("signal") || "All")
  const [page,setPage]=useState(parseInt(searchParams.get("page")||"1"))
  const [limit] = useState(10)
  const [sortBy,setSortBy]=useState(searchParams.get("sortBy")||"priority")
  const [subjectFilter,setSubjectFilter]=useState(searchParams.get("subject")||"All")
  const [data,setData]=useState<{reviews:any[], total:number, totalPages:number} | null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)

  const load = async ()=>{
    setLoading(true); setError(null)
    try{
      // Map tab to status per Phase3
      const statusMap:any = { all:'All', pending:'Pending', in_review:'In Review', reviewed:'Reviewed', follow_up:'Requires Follow-up', high:'High Priority' }
      const status = statusMap[tab] || 'All'
      const res = await reviewApi.getReviewsPaginated({
        examId,
        status,
        search: q || undefined,
        signalType: signalFilter!=='All' ? signalFilter.toUpperCase() : undefined,
        page,
        limit,
        scoreFilter: scoreFilter!=='All' ? scoreFilter : undefined,
        sortBy: sortBy==='priority'? undefined : sortBy,
        subject: subjectFilter!=='All'? subjectFilter: undefined
      })
      setData(res)
    }catch(e:any){
      setError(e.message)
    } finally{ setLoading(false)}
  }
  useEffect(()=>{ load() },[examId, tab, scoreFilter, signalFilter, page, sortBy, subjectFilter])
  // debounce search
  useEffect(()=>{
    const id = setTimeout(()=>{
      setPage(1)
      load()
      const p = new URLSearchParams(searchParams)
      if(q) p.set("search", q); else p.delete("search")
      setSearchParams(p, {replace:true})
    }, 400)
    return ()=> clearTimeout(id)
  },[q])

  const handleTab = (v:string)=>{ setTab(v); setPage(1) }

  if(loading && !data) return <LoadingState label="Loading reviews…" />
  if(error) return <ErrorState description={error} retry={load} />

  const reviews = data?.reviews || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  return (
    <div className="space-y-5">
      {examId ? <Breadcrumb items={[{label:"Exams", to:"/teacher/exams"}, {label:"Exam", to:`/teacher/exams/${examId}`}, {label:"Reviews"}]} /> : <PageHeader title="Integrity Review Queue" description="Review priority indicators — not automatic verdicts. Scores reflect signal strength. High priority first. The system identifies patterns that may require human review." />}

      <Card className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by student, exam, score, review ID…" className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" aria-label="Search reviews" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={scoreFilter} onChange={e=>{ setScoreFilter(e.target.value); setPage(1)}} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" aria-label="Filter by score">
              <option value="All">All scores</option><option value="0-29">0–29 Normal</option><option value="30-59">30–59 Low Concern</option><option value="60-79">60–79 Requires Review</option><option value="80-100">80–100 High Priority</option>
            </select>
            <select value={signalFilter} onChange={e=>{ setSignalFilter(e.target.value); setPage(1)}} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hidden sm:block" aria-label="Filter by signal">
              <option value="All">All signals</option><option value="TAB_SWITCH">Tab Switch</option><option value="TIMING">Timing</option><option value="COPY_PASTE">Clipboard</option><option value="SIMILARITY">Similarity</option><option value="CORRELATED_PATTERN">Correlated</option><option value="SESSION_ANOMALY">Session</option>
            </select>
            <select value={subjectFilter} onChange={e=>{ setSubjectFilter(e.target.value); setPage(1)}} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] hidden md:block" aria-label="Filter by subject">
              <option value="All">All subjects</option><option value="Mathematics">Mathematics</option><option value="Physics">Physics</option><option value="Computer Science">Computer Science</option><option value="Science">Science</option><option value="English">English</option>
            </select>
            <select value={sortBy} onChange={e=> setSortBy(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]" aria-label="Sort by">
              <option value="priority">Priority</option><option value="score">Score</option><option value="generatedAt">Date</option><option value="status">Status</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <Tabs value={tab} onValueChange={handleTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Unreviewed</TabsTrigger>
              <TabsTrigger value="in_review">In Review</TabsTrigger>
              <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
              <TabsTrigger value="follow_up">Requires Follow-up</TabsTrigger>
              <TabsTrigger value="high">High Priority</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>{total} reviews • Page {page} of {totalPages}</span>
            <button onClick={()=> {/* export */}} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label="Export"><Download className="h-3.5 w-3.5" />Export</button>
          </div>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-4 py-3">Review ID</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Student</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Exam</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Score</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Priority</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Signals</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Status</th>
                <th className="hidden lg:table-cell text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Submitted</th>
                <th className="hidden lg:table-cell text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Updated</th>
                <th className="hidden xl:table-cell text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-3 py-3">Assigned</th>
                <th className="px-3 py-3" aria-label="View"></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r:any)=>{
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 max-w-[120px] truncate" title={r.id}>EG-{r.id.slice(-6).toUpperCase()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <GeneratedAvatar name={r.student?.name || 'Unknown'} size={28} />
                        <div><div className="text-[13px] font-medium text-slate-900 leading-none">{r.student?.name || 'Unknown'}</div><div className="text-xs text-slate-500">{r.student?.rollNo || ''}</div></div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-slate-700 max-w-[160px] truncate">{r.exam?.title || ''}<div className="text-xs text-slate-500">{r.exam?.subject}</div></td>
                    <td className="px-3 py-3"><ScoreBadge score={r.score} size="sm" /></td>
                    <td className="px-3 py-3"><StatusBadge status={r.level} /></td>
                    <td className="px-3 py-3"><span className="inline-flex items-center h-6 px-2 rounded-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">{r.signalCount ?? r.signals?.length ?? 0}</span></td>
                    <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                    <td className="hidden lg:table-cell px-3 py-3 text-xs text-slate-600">{r.submittedAt || r.generatedAt ? new Date(r.submittedAt || r.generatedAt).toLocaleDateString() : ''}<div className="text-[11px] text-slate-500">{r.submittedAt ? new Date(r.submittedAt).toLocaleTimeString() : ''}</div></td>
                    <td className="hidden lg:table-cell px-3 py-3 text-xs text-slate-600">{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : ''}</td>
                    <td className="hidden xl:table-cell px-3 py-3 text-xs text-slate-600">{r.assignedReviewer?.name || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Link to={`/teacher/integrity-reviews/${r.id}`} className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1">View</Link>
                        <Link to={`/teacher/reviews/${r.id}`} className="text-[11px] text-slate-500 hover:text-slate-700 hidden sm:inline">Legacy</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {reviews.length===0 && <div className="p-6"><EmptyState title="No integrity reviews require attention." description="Try adjusting filters or check back later." /></div>}
        {totalPages>1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-100">
            <span className="text-xs text-slate-600">Showing {(page-1)*limit+1}–{Math.min(page*limit, total)} of {total}</span>
            <div className="flex gap-1">
              <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="h-8 w-8 grid place-items-center rounded-lg border border-slate-300 bg-white disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
              <span className="h-8 px-3 grid place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium">{page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={()=> setPage(p=> p+1)} className="h-8 w-8 grid place-items-center rounded-lg border border-slate-300 bg-white disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex gap-2"><SlidersHorizontal className="h-4 w-4 text-slate-500 shrink-0" /> Sorting default: Highest priority first (High → Requires Review → Low → Normal), newest within same priority. Search and pagination are server-side.</div>
    </div>
  )
}

