import { useState, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { Card } from "@/components/ui/Card"
import { SearchInput } from "@/components/ui/Input"
import { Badge, StatusBadge } from "@/components/ui/Badge"
import { ScoreBadge, ScoreBar } from "@/components/ui/ScoreIndicator"
import { Button } from "@/components/ui/Button"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { examService, reviewService } from "@/services"
import { mockStudents } from "@/data/mockStudents"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"

export default function Students(){
  const {id} = useParams()
  const exam = examService.getAllExamsCombined().find(e=>e.id===id)!
  const [q, setQ] = useState("")
  const [filter, setFilter] = useState("All")

  const rows = useMemo(()=>{
    const reviews = reviewService.getReviews(exam.id)
    // deterministic fallback for synthetic rows
    const deterministicScore = (id:string)=> {
      let sum=0; for(let i=0;i<id.length;i++) sum = (sum*31 + id.charCodeAt(i)) % 1000
      return 18 + (sum % 12) // 18-29 Normal range
    }
    const isSubmitted = (id:string)=>{
      let sum=0; for(let i=0;i<id.length;i++) sum+= id.charCodeAt(i)
      return (sum % 5)!==0 // 80% submitted deterministically
    }
    const base = mockStudents.slice(0,12).map(s=>{
      const r = reviews.find(rv=>rv.studentId===s.id)
      return {
        student: s,
        review: r,
        score: r?.score ?? (s.id==="s6"? 24 : s.id==="s7"? 38 : deterministicScore(s.id)),
        level: r?.level ?? "Normal",
        status: r ? (r.status==="Pending" ? (r.level) : "Reviewed") : "Normal",
        submitted: r ? "Submitted" : isSubmitted(s.id) ? "Submitted" : "In Progress",
      }
    })
    let filtered = base
    if(q) filtered = filtered.filter(x=> x.student.name.toLowerCase().includes(q.toLowerCase()))
    if(filter!=="All") filtered = filtered.filter(x=> x.level===filter || x.status===filter)
    return filtered
  },[exam.id, q, filter])

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{label:"Exams", to:"/teacher/exams"}, {label:exam.title, to:`/teacher/exams/${exam.id}`}, {label:"Students"}]} />
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">Review submissions and integrity scores for {exam.title}</p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option>All</option><option>Normal</option><option>Low Concern</option><option>Requires Review</option><option>High Priority Review</option>
          </select>
        </div>
      </div>

      <Card className="p-4 flex flex-col lg:flex-row gap-3">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search students…" /></div>
        <div className="text-xs text-slate-500 flex items-center px-2">{rows.length} students</div>
      </Card>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-5 py-3">Student</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-4 py-3">Status</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-4 py-3">Submitted</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-4 py-3">Integrity Score</th>
                <th className="text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500 px-4 py-3">Review Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row=>(
                <tr key={row.student.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <GeneratedAvatar name={row.student.name} size={32} />
                      <div><div className="font-medium text-slate-900 text-[13.5px]">{row.student.name}</div><div className="text-xs text-slate-500">{row.student.rollNo} • {row.student.email}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-4"><Badge variant={row.submitted==="Submitted" ? "success":"neutral"}>{row.submitted}</Badge></td>
                  <td className="px-4 py-4 text-xs text-slate-600">Sep 03, 09:58</td>
                  <td className="px-4 py-4"><div className="w-[160px]"><ScoreBar score={row.score} /></div></td>
                  <td className="px-4 py-4"><StatusBadge status={row.level} /></td>
                  <td className="px-4 py-4">
                    {row.review ? <Link to={`/teacher/reviews/${row.review.id}`} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">View Review</Link> : <span className="text-xs text-slate-400">No review</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

