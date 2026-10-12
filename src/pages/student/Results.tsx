import { useEffect, useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { studentApi } from '@/services/apiServices'
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States'
import { Link } from 'react-router-dom'
import { SearchInput } from '@/components/ui/Input'
import { Award, ShieldCheck, Download, Filter } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function StudentResults(){
  const [results,setResults]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [q,setQ]=useState("")
  const [subjectFilter,setSubjectFilter]=useState("All")
  const [resultFilter,setResultFilter]=useState("All")
  const {toast}=useToast()
  const [downloading,setDownloading]=useState<string|null>(null)
  useEffect(()=>{
    studentApi.getResults().then(setResults).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  const subjects = useMemo(()=> ["All", ...Array.from(new Set(results.map(r=>r.exam.subject)))], [results])
  const filtered = useMemo(()=>{
    let list=[...results]
    if(q) list=list.filter(r=> r.exam.title.toLowerCase().includes(q.toLowerCase()) || r.exam.subject.toLowerCase().includes(q.toLowerCase()))
    if(subjectFilter!=='All') list=list.filter(r=> r.exam.subject===subjectFilter)
    if(resultFilter!=='All'){
      if(resultFilter==='Passed') list=list.filter(r=> r.score?.passed)
      if(resultFilter==='Failed') list=list.filter(r=> r.score && !r.score.passed)
    }
    return list
  },[results,q,subjectFilter,resultFilter])
  const download = async (sessionId:string)=>{
    setDownloading(sessionId)
    try{ await studentApi.downloadPdf(sessionId); toast({title:"Report downloaded", variant:"success"}) }
    catch(e:any){ toast({title:"Unable to generate report", description:e.message})}
    finally{ setDownloading(null)}
  }
  if(loading) return <LoadingState label="Loading results..." />
  if(error) return <ErrorState description={error} />
  if(results.length===0) return <EmptyState title="No results yet" description="Completed exams will appear here." />
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Results</h1>
        <p className="text-sm text-slate-500">Your exam submissions and statuses.</p>
      </div>
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search test name, subject..." /></div>
          <div className="flex gap-2">
            <select value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              {subjects.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select value={resultFilter} onChange={e=>setResultFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="All">All Results</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Not Passed</option>
            </select>
          </div>
        </div>
      </Card>
      <div className="hidden lg:block overflow-x-auto">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.5fr] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold tracking-widest uppercase text-slate-500">
            <span>Test</span><span>Subject</span><span>Date</span><span>Score</span><span>Result</span><span>Integrity</span>
          </div>
          {filtered.map((r:any)=>(
            <div key={r.sessionId} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.5fr] gap-3 px-5 py-4 items-center border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
              <div><div className="text-sm font-medium text-slate-900">{r.exam.title}</div><div className="text-xs text-slate-500">{r.sessionId.slice(-6)}</div></div>
              <div className="text-sm text-slate-700">{r.exam.subject}</div>
              <div className="text-xs text-slate-600">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '-'}</div>
              <div className="text-sm font-semibold text-slate-900">{r.score ? `${r.score.obtained}/${r.score.total} • ${r.score.percentage}%` : '-'}</div>
              <div>{r.score ? <Badge variant={r.score.passed?'success':'danger'}>{r.score.passed?'Passed':'Not Passed'}</Badge> : <Badge variant="neutral">{r.status}</Badge>}</div>
              <div className="flex items-center gap-2">
                <Badge variant={r.integrityStatus==='Requires Teacher Review' || r.integrityStatus==='Requires Review' ? 'warning' : r.integrityStatus==='High Priority Review'?'danger':'neutral'}>{r.integrityStatus || '-'}</Badge>
                <Link to={`/student/results/${r.sessionId}`} className="text-xs font-medium text-indigo-600 hover:underline">View</Link>
              </div>
            </div>
          ))}
        </Card>
      </div>
      <div className="grid gap-4 lg:hidden">
        {filtered.map((r:any)=>(
          <Card key={r.sessionId} className="p-5 space-y-3">
            <div className="font-medium text-slate-900">{r.exam.title}</div>
            <div className="text-xs text-slate-500">{r.exam.subject} • {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString():''} • {r.score ? `${r.score.obtained}/${r.score.total} (${r.score.percentage}%)` : r.status}</div>
            <div className="flex gap-2">
              <Badge variant={r.score?.passed?'success':'neutral'}>{r.score?.passed?'Passed':'Not Passed'}</Badge>
              {r.integrityStatus && <Badge variant="warning">{r.integrityStatus}</Badge>}
            </div>
            <div className="flex gap-2">
              <Link to={`/student/results/${r.sessionId}`} className="flex-1"><Button size="sm" variant="secondary" className="w-full gap-1.5"><Award className="h-4 w-4"/>View Result</Button></Link>
              <Link to={`/student/integrity-reports/${r.sessionId}`} className="flex-1"><Button size="sm" variant="ghost" className="w-full gap-1.5"><ShieldCheck className="h-4 w-4"/>Integrity</Button></Link>
              <Button size="sm" onClick={()=>download(r.sessionId)} loading={downloading===r.sessionId}><Download className="h-4 w-4"/></Button>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {filtered.map((r:any)=>(
          <div key={r.sessionId} className="hidden lg:flex gap-2 w-full justify-end">
            {/* actions handled in table, but for mobile we already have */}
          </div>
        ))}
      </div>
      {filtered.length===0 && <div className="text-center py-8 text-sm text-slate-500">No results match filters.</div>}
      <div className="flex gap-2">
        {results.slice(0,3).map((r:any)=>(
          <div key={r.sessionId} className="flex gap-2" />
        ))}
      </div>
      <div className="text-xs text-slate-500 flex items-center gap-2"><Filter className="h-3 w-3"/> Filters: Subject • Result • Date • Search</div>
    </div>
  )
}
