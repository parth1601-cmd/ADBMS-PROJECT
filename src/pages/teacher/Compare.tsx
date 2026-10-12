import { useEffect, useState } from "react"
import { useParams, Link, useSearchParams } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { reviewApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"
import { Alert } from "@/components/ui/Alert"

function highlightDiff(a:string,b:string){
  if(!a || !b) return { a, b, same: [] }
  const norm=(s:string)=> s.toLowerCase().replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim()
  const ta=norm(a).split(" ").filter(Boolean)
  const tb=norm(b).split(" ").filter(Boolean)
  const setB=new Set(tb)
  const setA=new Set(ta)
  // simple: highlight identical phrases
  return { aTokens: ta, bTokens: tb, same: [...setA].filter(x=> setB.has(x)) }
}

export default function Compare(){
  const {id} = useParams()
  const [sp]=useSearchParams()
  const bId= sp.get('b')
  const [aData,setAData]=useState<any>(null)
  const [bData,setBData]=useState<any>(null)
  const [compare,setCompare]=useState<any>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)

  useEffect(()=>{
    if(!id) return
    const load=async()=>{
      setLoading(true)
      try{
        const a:any= await reviewApi.getReview(id!)
        const aNorm=a?.data || a
        setAData(aNorm)
        if(bId){
          const res:any = await reviewApi.compare(id!, bId)
          const c=res?.data || res
          setCompare(c)
          // also fetch b review for names
          const b:any= await reviewApi.getReview(bId)
          setBData(b?.data || b)
        } else if(aNorm?.similarity?.peerSessionId){
          // auto compare with best peer if available
          // need similar review id for peer? Use compare endpoint which works with review ids, but we have sessionId; try to find review for peer
          // For demo, try to use similarity peer
          // We will attempt compare via reviewApi compare if we can find peer review id via listing?
          // For now, just show similarity from aData
        }
      }catch(e:any){ setError(e.message)}
      finally{ setLoading(false)}
    }
    load()
  },[id,bId])

  if(loading) return <LoadingState label="Loading comparison…" />
  if(error) return <ErrorState description={error} />
  const studentA = aData?.student
  const studentB = compare?.b || bData?.student || {name: compare?.b?.name || 'Peer'}

  // If direct compare data exists, render it
  if(compare){
    return (
      <div className="space-y-6">
        <PageHeader title={`Compare: ${studentA?.name} vs ${studentB?.name}`} description={`Answer-by-answer side-by-side. Matching fragments highlighted when supported. Similarity indicates textual overlap, not automatic plagiarism.`} actions={<Link to={`/teacher/integrity-reviews/${id}`}><Button variant="secondary" size="sm">Back to review</Button></Link>} />
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center gap-2"><GeneratedAvatar name={studentA?.name||'A'} size={32} /><span className="text-sm font-medium">{studentA?.name}</span></div>
            <span className="text-slate-400">vs</span>
            <div className="flex items-center gap-2"><GeneratedAvatar name={studentB?.name||'B'} size={32} /><span className="text-sm font-medium">{studentB?.name}</span></div>
            <div className="ml-auto flex gap-4 text-center">
              <div><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Matches</div><div className="text-sm font-bold">{compare.matches}/{compare.total}</div></div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block" />
              <div><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Similarity</div><div className="text-sm font-bold">{compare.similarity}%</div></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Question-by-question diff</CardTitle><p className="text-xs text-slate-600">Green = identical/different visual, matched phrases in bold. Same incorrect answer flagged where relevant.</p></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Q</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold tracking-widest uppercase text-slate-500">{studentA?.name}</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold tracking-widest uppercase text-slate-500">{studentB?.name}</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Similarity</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.table.map((r:any, idx:number)=>{
                    const diff=highlightDiff(r.a||"", r.b||"")
                    const match=r.match
                    // naive highlight: wrap same tokens in <mark>
                    const renderWithHighlight=(text:string, _tokens:string[], same:string[])=>{
                      if(!text) return <span className="text-slate-400 italic">—</span>
                      // Simple: if contains same word, highlight that word
                      let parts=text.split(/(\s+)/)
                      return parts.map((p,i)=>{
                        const norm=p.toLowerCase().replace(/[^\w]/g,"")
                        if(same.includes(norm) && norm.length>3) return <mark key={i} className="bg-amber-100 px-0.5 rounded">{p}</mark>
                        return <span key={i}>{p}</span>
                      })
                    }
                    return (
                      <tr key={idx} className={`border-t border-slate-100 ${match? "bg-amber-50/30":""}`}>
                        <td className="px-3 py-3 font-medium whitespace-nowrap">Q{r.order}</td>
                        <td className="px-3 py-3 max-w-[280px]">
                          <div className="text-xs text-slate-500 truncate">{r.question?.slice(0,60) || `Question ${r.order}`}</div>
                          <div className="text-[13px] leading-5 text-slate-800 mt-1 break-words">{renderWithHighlight(r.a||"", (diff as any).aTokens || [], (diff as any).same || [])}</div>
                          <div className="text-xs text-slate-500 mt-1">{r.a?.length||0} chars</div>
                        </td>
                        <td className="px-3 py-3 max-w-[280px]">
                          <div className="text-[13px] leading-5 text-slate-800 break-words">{renderWithHighlight(r.b||"", (diff as any).bTokens || [], (diff as any).same || [])}</div>
                          <div className="text-xs text-slate-500 mt-1">{r.b?.length||0} chars</div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={match? "warning":"neutral"}>{match? "Match":"Different"}</Badge>
                          {r.similarity!=null && <div className="text-xs text-slate-500 mt-1">{r.similarity}% similar</div>}
                          {match && r.a && r.b && String(r.a).trim().toLowerCase()===String(r.b).trim().toLowerCase() && <div className="text-xs font-medium text-amber-700 mt-1">Identical</div>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Alert variant="neutral">Similarity indicates textual overlap between responses. Context and question type should be considered during review. High similarity alone is not proof of misconduct.</Alert>
      </div>
    )
  }

  // Fallback: show similarity from aData if no compare param
  const sim = aData?.similarity
  const simResults = aData?.similarityResults
  if(!sim && !simResults) return <div className="space-y-6"><PageHeader title="Answer Comparison" description="No similarity data. Use ?b=reviewId to compare two reviews." /><Card><CardContent className="p-6 text-sm text-slate-600">Add <code className="bg-slate-100 px-1 rounded">?b=otherReviewId</code> to URL to compare two authorized submissions. Example: <Link to={`/teacher/integrity-reviews/${id}`} className="text-indigo-600 underline">back</Link></CardContent></Card></div>

  return (
    <div className="space-y-6">
      <PageHeader title={`Comparison — ${studentA?.name}`} description="Textual overlap with peer responses. Matching phrases highlighted. Similarity does not prove misconduct." actions={<Link to={`/teacher/integrity-reviews/${id}`}><Button variant="secondary" size="sm">Back to review</Button></Link>} />
      {sim && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <GeneratedAvatar name={studentA?.name||'A'} size={32} /><span className="text-sm font-medium">{studentA?.name}</span>
            <span className="text-slate-400">vs</span>
            <GeneratedAvatar name={sim.peerName||'Peer'} size={32} /><span className="text-sm font-medium">{sim.peerName}</span>
            <div className="ml-auto text-center"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Similarity</div><div className="text-sm font-bold">{sim.similarityPercent ?? sim.percent}%</div></div>
          </CardContent>
        </Card>
      )}
      <div className="text-xs text-slate-500">Use URL <code>?b=REVIEW_ID</code> for side-by-side diff of two specific reviews. Current data shows automatic best peer.</div>
      {sim?.table && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="px-3 py-2 text-left text-[11px] tracking-widest uppercase text-slate-500">Q</th><th className="px-3 py-2 text-left text-[11px] tracking-widest uppercase text-slate-500">A</th><th className="px-3 py-2 text-left text-[11px] tracking-widest uppercase text-slate-500">Peer</th><th className="px-3 py-2 text-left text-[11px] tracking-widest uppercase text-slate-500">Match</th></tr></thead>
                <tbody>{sim.table.map((r:any)=>(<tr key={r.q} className="border-t border-slate-100"><td className="px-3 py-2">{r.q}</td><td className="px-3 py-2 max-w-[220px] truncate">{r.a}</td><td className="px-3 py-2 max-w-[220px] truncate">{r.b}</td><td className="px-3 py-2"><Badge variant={r.match? "success":"neutral"}>{r.match? "Match":"Diff"}</Badge></td></tr>))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
