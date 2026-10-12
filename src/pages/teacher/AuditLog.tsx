import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { auditApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"

export default function AuditLog(){
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState<string|null>(null)
  const [search,setSearch]=useState("")
  const [action,setAction]=useState("All")
  const [page,setPage]=useState(1)
  const limit=20
  const load = async()=>{
    setError(null)
    try{
      const res = await auditApi.list({ search: search||undefined, action: action!=='All'? action: undefined, page, limit })
      setData(res)
    }catch(e:any){ setError(e.message) }
  }
  useEffect(()=>{ load() },[page, action])
  const handleSearch = (e:React.FormEvent)=>{ e.preventDefault(); setPage(1); load() }
  if(error) return <ErrorState description={error} retry={load} />
  if(!data) return <LoadingState label="Loading audit log…" />
  const logs = data.logs || data.data || data || []
  const totalPages = data.totalPages || Math.ceil((data.total||logs.length)/limit) || 1
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Chronological record of teacher and system actions. Records are not editable." />
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Search by actor, action, entity…" className="w-full h-9 pl-3 pr-3 rounded-lg border border-slate-300 bg-white text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" aria-label="Search audit log" />
            </div>
            <select value={action} onChange={e=> setAction(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px]" aria-label="Filter by action">
              <option value="All">All actions</option><option value="EXAM_CREATED">EXAM_CREATED</option><option value="EXAM_PUBLISHED">EXAM_PUBLISHED</option><option value="REVIEW_STATUS_CHANGED">REVIEW_STATUS_CHANGED</option><option value="REVIEW_NOTE_ADDED">REVIEW_NOTE_ADDED</option><option value="REPORT_GENERATED">REPORT_GENERATED</option><option value="PDF_DOWNLOADED">PDF_DOWNLOADED</option>
            </select>
            <button type="submit" className="h-9 px-4 rounded-lg bg-slate-900 text-white text-[13px] font-medium">Search</button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Audit records</CardTitle><p className="text-xs text-slate-600">Page {page} of {totalPages} • {data.total ?? logs.length} records</p></CardHeader>
        <CardContent className="p-0">
          {logs.length===0 ? <div className="p-6"><EmptyState title="No audit activity found" description="Try adjusting filters or date range." /></div> :
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Timestamp</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Actor</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Action</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Entity</th>
                  <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l:any)=>(
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs tabular-nums">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs">{l.actor?.name || l.actorId.slice(0,8)}</td>
                    <td className="px-3 py-2 text-xs font-mono">{l.action}</td>
                    <td className="px-3 py-2 text-xs">{l.entityType} • {l.entityId.slice(0,8)}</td>
                    <td className="px-3 py-2 text-xs max-w-[260px] truncate">{l.metadata ? JSON.stringify(l.metadata).slice(0,80) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          <div className="flex items-center justify-between p-3 border-t border-slate-100">
            <button disabled={page<=1} onClick={()=> setPage(p=> Math.max(1,p-1))} className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-[13px] disabled:opacity-50">Previous</button>
            <span className="text-xs text-slate-600">Page {page} / {totalPages}</span>
            <button disabled={page>=totalPages} onClick={()=> setPage(p=> p+1)} className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-[13px] disabled:opacity-50">Next</button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

