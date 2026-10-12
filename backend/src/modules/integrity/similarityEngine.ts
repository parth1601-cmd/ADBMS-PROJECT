import type { SimilarityResult } from "./integrityTypes.js"

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim()
}

export function tokenize(text: string): string[] {
  const norm = normalizeText(text)
  if (!norm) return []
  return norm.split(" ").filter(Boolean)
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  if (setA.size === 0 && setB.size === 0) return 0
  const inter = [...setA].filter(x => setB.has(x)).length
  const union = new Set([...setA, ...setB]).size
  if (union === 0) return 0
  return Math.round((inter / union) * 100)
}

export function ngramSimilarity(a: string, b: string, n=3): number {
  const normA = normalizeText(a)
  const normB = normalizeText(b)
  if(!normA || !normB) return 0
  const bag = (s:string)=>{
    const m=new Map<string,number>()
    for(let i=0;i<=s.length-n;i++){
      const gram=s.slice(i,i+n)
      m.set(gram,(m.get(gram)||0)+1)
    }
    return m
  }
  const ma=bag(normA), mb=bag(normB)
  let inter=0, union=0
  const all=new Set([...ma.keys(), ...mb.keys()])
  for(const k of all){
    const ca=ma.get(k)||0, cb=mb.get(k)||0
    inter+= Math.min(ca,cb)
    union+= Math.max(ca,cb)
  }
  if(union===0) return 0
  return Math.round(inter/union*100)
}

export function levenshteinSimilarity(a: string, b: string): number {
  const sa = normalizeText(a), sb=normalizeText(b)
  if(!sa && !sb) return 100
  if(!sa || !sb) return 0
  const m=sa.length, n=sb.length
  const dp:Array<number> = Array(n+1).fill(0).map((_,i)=>i)
  for(let i=1;i<=m;i++){
    let prev=dp[0]; dp[0]=i
    for(let j=1;j<=n;j++){
      const tmp=dp[j]
      const cost= sa[i-1]===sb[j-1]?0:1
      dp[j]= Math.min(dp[j]+1, dp[j-1]+1, prev+cost)
      prev=tmp
    }
  }
  const dist=dp[n]
  const maxLen=Math.max(m,n)
  return Math.round((1 - dist/maxLen)*100)
}

export function semanticPlaceholderSimilarity(a:string, b:string): number {
  // simple heuristic: if shares 70% tokens after stopword removal, treat as semantic overlap
  const stop = new Set(["the","is","a","an","of","to","in","and","or","for","with","on","as","by","at","from"])
  const tok = (s:string)=> tokenize(s).filter(t=> !stop.has(t))
  const ta=tok(a), tb=tok(b)
  if(ta.length===0 || tb.length===0) return jaccardSimilarity(a,b)
  const setA=new Set(ta), setB=new Set(tb)
  const inter=[...setA].filter(x=> setB.has(x)).length
  const union=new Set([...setA, ...setB]).size
  return Math.round(inter/union*100)
}

export function combinedSimilarity(a:string,b:string): { jaccard:number, ngram:number, edit:number, semantic:number, avg:number }{
  const j=jaccardSimilarity(a,b)
  const n=ngramSimilarity(a,b,3)
  const e=levenshteinSimilarity(a,b)
  const s=semanticPlaceholderSimilarity(a,b)
  // weighted avg with emphasis on jaccard and semantic
  const avg=Math.round(j*0.35 + n*0.25 + e*0.2 + s*0.2)
  return { jaccard:j, ngram:n, edit:e, semantic:s, avg }
}

export function objectiveOverlap(myAnswers: { questionId: string; answer: string }[], peerAnswers: Map<string, string>): { matches: number; total: number; percent: number } {
  let matches = 0
  let total = 0
  for (const ma of myAnswers) {
    const pa = peerAnswers.get(ma.questionId)
    if (pa !== undefined) {
      total++
      if (String(pa).trim().toLowerCase() === String(ma.answer).trim().toLowerCase()) matches++
    }
  }
  const pct = total > 0 ? Math.round((matches / total) * 100) : 0
  return { matches, total, percent: pct }
}

export function computeSimilarityResults(
  myAnswers: { questionId: string; answer: string; type: string; order: number }[],
  peers: { sessionId: string; studentId: string; studentName: string; answers: { questionId: string; answer: string; type: string; order: number }[] }[]
): SimilarityResult[] {
  const results: SimilarityResult[] = []
  const myMcq = myAnswers.filter(a => a.type === "MCQ" || a.type === "TF")
  const myShort = myAnswers.filter(a => a.type === "SHORT" && a.answer.length > 20)

  for (const peer of peers) {
    const peerMap = new Map(peer.answers.map(p => [p.questionId, p.answer]))

    // objective overlap
    const obj = objectiveOverlap(myMcq.map(m => ({ questionId: m.questionId, answer: m.answer })), peerMap)

    // subjective: average jaccard across short answers
    let subjectiveSum = 0
    let subjectiveCount = 0
    const details: SimilarityResult["details"] = []
    for (const ma of myMcq) {
      const pa = peerMap.get(ma.questionId)
      if (pa !== undefined) {
        details.push({
          questionId: ma.questionId,
          order: ma.order,
          type: ma.type,
          myAnswer: ma.answer,
          peerAnswer: pa,
          match: String(ma.answer).trim().toLowerCase() === String(pa).trim().toLowerCase(),
        })
      }
    }
    // Add short answer details with improved multi-method similarity
    for (const sa of myShort) {
      const pa = peerMap.get(sa.questionId)
      if (pa && pa.length > 20) {
        const combo = combinedSimilarity(sa.answer, pa)
        const sim = combo.avg
        details.push({
          questionId: sa.questionId,
          order: sa.order,
          type: sa.type,
          myAnswer: sa.answer,
          peerAnswer: pa,
          match: sim >= 78, // slightly lower threshold due to richer metric
          similarity: sim,
          jaccard: combo.jaccard,
          ngram: combo.ngram,
          edit: combo.edit,
          semantic: combo.semantic,
        } as any)
        subjectiveSum += sim
        subjectiveCount++
      }
    }

    // combined percent weighted: if short exists, average both
    let similarityPercent = obj.percent
    let confidence = 0.6
    if (subjectiveCount > 0) {
      const subjAvg = Math.round(subjectiveSum / subjectiveCount)
      // if high subjective, boost
      similarityPercent = Math.round((obj.percent * 0.7 + subjAvg * 0.3))
      confidence = subjAvg >= 85 ? 0.92 : subjAvg >= 75 ? 0.82 : 0.68
    } else {
      confidence = obj.percent >= 85 ? 0.90 : obj.percent >= 75 ? 0.80 : 0.65
    }

    // sort details by order
    details.sort((a, b) => a.order - b.order)

    if (obj.total >= 3 || subjectiveCount > 0) {
      results.push({
        peerSessionId: peer.sessionId,
        peerStudentId: peer.studentId,
        peerName: peer.studentName,
        similarityPercent,
        matches: obj.matches,
        total: obj.total,
        details,
        confidence,
      })
    }
  }
  // sort descending by similarityPercent
  results.sort((a, b) => b.similarityPercent - a.similarityPercent)
  return results
}

export function findBestSimilarity(results: SimilarityResult[]): SimilarityResult | null {
  if (results.length === 0) return null
  // highest percent
  const best = results[0]
  // only return if >=70 as per spec threshold for requiring review
  if (best.similarityPercent >= 70) return best
  return null
}
