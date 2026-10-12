import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { reviewApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"
import { Badge } from "@/components/ui/Badge"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"

export default function SimilarityPage(){
  const {id} = useParams()
  const [data,setData]=useState<any>(null)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    if(!id) return
    reviewApi.getSimilarity(id).then(setData).catch(e=> setError(e.message))
  },[id])
  if(error) return <ErrorState description={error} />
  if(!data) return <LoadingState label="Loading similarity…" />
  const list = Array.isArray(data) ? data : (data.data || data)
  if(!list || list.length===0) return <div className="space-y-6"><PageHeader title="Answer Similarity" description="No similar answers detected. Only authorized teachers can access this information." /><Card><CardContent className="p-6 text-sm text-slate-500">No high similarity detected for this review. Similarity analysis compares objective answer patterns and short answer Jaccard token overlap.</CardContent></Card></div>
  return (
    <div className="space-y-6">
      <PageHeader title="Answer Similarity Analysis" description="Compare answers between students where exam/question configuration permits it. High answer similarity detected; teacher review recommended — not proof of misconduct." />
      {list.map((entry:any, idx:number)=>(
        <Card key={idx}>
          <CardHeader>
            <CardTitle>Similarity with {entry.peer?.name || entry.peerName || 'Peer'} — {entry.similarity ?? entry.similarityPercent}% match</CardTitle>
            <p className="text-xs text-slate-600 mt-1">{entry.matches ?? '-'} / {entry.total ?? '-'} matches • Confidence: {entry.confidence ? (entry.confidence>=0.80?'High':'Moderate')+' confidence' : ''}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <GeneratedAvatar name={entry.peer?.name || 'Peer'} size={28} />
              <span className="text-sm font-medium">{entry.peer?.name || entry.peerName}</span>
              <Badge variant={entry.similarity>=80 ? 'danger' : entry.similarity>=70 ? 'warning' : 'neutral'}>{entry.similarity}% similar</Badge>
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold tracking-widest uppercase text-slate-500">Q</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold tracking-widest uppercase text-slate-500">My Answer</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold tracking-widest uppercase text-slate-500">Peer Answer</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold tracking-widest uppercase text-slate-500">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {(entry.details || entry.table || []).map((r:any)=>(
                    <tr key={r.questionId || r.q} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">Q{r.order || r.q.replace('Q','')}</td>
                      <td className="px-3 py-2 max-w-[220px] truncate">{r.myAnswer || r.a}</td>
                      <td className="px-3 py-2 max-w-[220px] truncate">{r.peerAnswer || r.b}</td>
                      <td className="px-3 py-2"><Badge variant={r.match ? 'success' : 'neutral'}>{r.match ? 'Match' : 'Different'}</Badge>{r.similarity && <span className="ml-2 text-xs text-slate-500">{r.similarity}%</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-slate-500">Highlighted matching phrases only when appropriate. Privacy: only authorized teachers can access.</div>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Link to={`/teacher/integrity-reviews/${id}`} className="text-sm text-indigo-600 hover:text-indigo-700">Back to review</Link>
      </div>
    </div>
  )
}

