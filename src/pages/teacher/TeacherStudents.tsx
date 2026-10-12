import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/Input'
import { api } from '@/services/api'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States'
import { Users, GraduationCap, BookOpen, BarChart3, Eye, Search, Filter, Mail } from 'lucide-react'
import { GeneratedAvatar } from '@/components/brand/GeneratedAvatar'

export default function TeacherStudents(){
  const [students,setStudents]=useState<any[]>([])
  const [q,setQ]=useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  useEffect(()=>{
    api.get<any[]>('/users/students').then(setStudents).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  if(loading) return <LoadingState label="Loading students…" />
  if(error) return <ErrorState description={error} retry={()=>location.reload()} />
  const classes = useMemo(()=> ["All", ...Array.from(new Set(students.map(s=> s.className || s.class || "Unassigned")))], [students])
  const filtered = useMemo(()=>{
    let list = students
    if(q) list = list.filter(s=> s.name.toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase()) || (s.studentId && s.studentId.toLowerCase().includes(q.toLowerCase())))
    if(classFilter!=="All") list = list.filter(s=> (s.className || s.class) === classFilter)
    return list
  },[students,q,classFilter])

  const totalStudents = students.length
  const activeStudents = students.filter(s=> s.status==="ACTIVE" || !s.status).length
  const withClass = students.filter(s=> s.className || s.class).length

  return (
    <div className="space-y-5">
      <PageHeader title="Students" description="Directory of enrolled students. Real database records — privacy-respecting, no unauthorized data exposure." actions={<div className="hidden sm:flex items-center gap-2 text-xs text-slate-600"><span className="px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">{totalStudents} total</span><span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">{activeStudents} active</span></div>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Total students</div><div className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center"><Users className="h-4 w-4 text-slate-500"/></div></div>
          <div className="text-[22px] font-semibold text-slate-900 mt-2">{totalStudents}</div>
          <div className="text-xs text-slate-600 mt-1">Enrolled</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Active</div><div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-200 grid place-items-center"><GraduationCap className="h-4 w-4 text-emerald-700"/></div></div>
          <div className="text-[22px] font-semibold text-slate-900 mt-2">{activeStudents}</div>
          <div className="text-xs text-slate-600 mt-1">Active status</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">With class</div><div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-200 grid place-items-center"><BookOpen className="h-4 w-4 text-indigo-700"/></div></div>
          <div className="text-[22px] font-semibold text-slate-900 mt-2">{withClass}</div>
          <div className="text-xs text-slate-600 mt-1">Assigned to class</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Coverage</div><div className="h-7 w-7 rounded-lg bg-amber-50 border border-amber-200 grid place-items-center"><BarChart3 className="h-4 w-4 text-amber-700"/></div></div>
          <div className="text-[22px] font-semibold text-slate-900 mt-2">{classes.length-1}</div>
          <div className="text-xs text-slate-600 mt-1">Classes represented</div>
        </Card>
      </div>

      <Card className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Search by name, email or student ID…" /></div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
              <select value={classFilter} onChange={e=> setClassFilter(e.target.value)} className="h-9 pl-8 pr-8 rounded-lg border border-slate-300 bg-white text-[13px]" aria-label="Filter by class">
                {classes.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Student</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Student ID</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Class</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Section</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Status</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold tracking-widest uppercase text-slate-500">Joined</th>
                <th className="px-3 py-3" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s=>(
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <GeneratedAvatar name={s.name} size={32} />
                      <div><div className="text-[13px] font-medium text-slate-900">{s.name}</div><div className="text-xs text-slate-500 flex items-center gap-1"><Mail className="h-3 w-3"/>{s.email}</div></div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700">{s.studentId || `STU-${s.id.slice(-6).toUpperCase()}`}</td>
                  <td className="px-3 py-3 text-xs text-slate-700">{s.className || s.class || "—"}</td>
                  <td className="px-3 py-3 text-xs text-slate-700">{s.section || "—"}</td>
                  <td className="px-3 py-3"><Badge variant={s.status==="ACTIVE" || !s.status ? "success" : "neutral"}>{s.status || "Active"}</Badge></td>
                  <td className="px-3 py-3 text-xs text-slate-600">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Link to={`/teacher/students/${s.id}/analytics`} className="h-7 px-2 grid place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700">Analytics</Link>
                      <Link to={`/teacher/students/${s.id}/analytics`} className="h-7 w-7 grid place-items-center rounded-md border border-slate-200 bg-white hover:bg-slate-50" aria-label="View"><Eye className="h-3.5 w-3.5 text-slate-600"/></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length===0 && <div className="p-10"><EmptyState title="No students found" description="Try adjusting search or filters." /></div>}
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 lg:hidden">
        {filtered.map(s=>(
          <Card key={s.id} className="p-4">
            <div className="flex items-center gap-3">
              <GeneratedAvatar name={s.name} size={40} />
              <div className="flex-1 min-w-0"><div className="text-[14px] font-semibold text-slate-900 truncate">{s.name}</div><div className="text-xs font-mono text-slate-500 truncate">{s.studentId || s.id.slice(-6)}</div><div className="text-xs text-slate-600">{s.className || s.class || "Unassigned"} • {s.section || "—"}</div></div>
              <Badge variant={s.status==="ACTIVE" || !s.status ? "success" : "neutral"}>{s.status || "Active"}</Badge>
            </div>
            <div className="flex gap-2 mt-3">
              <Link to={`/teacher/students/${s.id}/analytics`} className="flex-1"><Button size="sm" variant="secondary" className="w-full">Analytics</Button></Link>
              <a href={`mailto:${s.email}`} className="flex-1"><Button size="sm" variant="ghost" className="w-full">Email</Button></a>
            </div>
          </Card>
        ))}
        {filtered.length===0 && <EmptyState title="No students found" description="No enrolled students match your filters." />}
      </div>
    </div>
  )
}
