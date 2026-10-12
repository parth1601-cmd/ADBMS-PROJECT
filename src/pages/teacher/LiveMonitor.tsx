import { useEffect, useState, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge, StatusBadge } from "@/components/ui/Badge"
import { PageHeader } from "@/components/ui/PageHeader"
import { EmptyState, LoadingState } from "@/components/ui/States"
import { api } from "@/services/api"
import { useToast } from "@/components/ui/Toast"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"
import { Monitor, Radio, Wifi, WifiOff, Eye, Clock3, Search, Send, X, AlertTriangle, Activity, Users } from "lucide-react"

type Session = {
  sessionId:string
  student:{id:string,name:string,email:string,studentId:string}
  exam:{id:string,title:string,subject:string}
  progress:{answered:number,total:number,percent:number}
  timeRemainingSec:number
  connectionState:string
  integrityActivity:number
  lastActivityAt:string
  currentQuestion:string|null
  currentQuestionId:string|null
  recentEvents:any[]
  startedAt:string
  submittedAt?:string
}

function stateMeta(state:string){
  const map:any={
    ACTIVE:{label:"Active", color:"bg-emerald-50 text-emerald-800 border-emerald-200", dot:"bg-emerald-500", icon: Wifi},
    FOCUS_LOST:{label:"Focus lost", color:"bg-amber-50 text-amber-800 border-amber-200", dot:"bg-amber-500", icon: Eye},
    DISCONNECTED:{label:"Disconnected", color:"bg-red-50 text-red-800 border-red-200", dot:"bg-red-500", icon: WifiOff},
    INACTIVE:{label:"Inactive", color:"bg-slate-50 text-slate-700 border-slate-200", dot:"bg-slate-400", icon: Clock3},
    SUBMITTED:{label:"Submitted", color:"bg-indigo-50 text-indigo-800 border-indigo-200", dot:"bg-indigo-500", icon: Activity},
  }
  return map[state] || map.ACTIVE
}

export default function LiveMonitor(){
  const {toast}=useToast()
  const [sessions,setSessions]=useState<Session[]|null>(null)
  const [counts,setCounts]=useState<any>(null)
  const [filter,setFilter]=useState("All")
  const [search,setSearch]=useState("")
  const [selected,setSelected]=useState<Session|null>(null)
  const [drawerData,setDrawerData]=useState<any|null>(null)
  const [events,setEvents]=useState<any[]>([])
  const [broadcastMsg,setBroadcastMsg]=useState("")
  const [sending,setSending]=useState(false)
  const esRef=useRef<EventSource|null>(null)

  const fmt=(s:number)=> `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const load=async()=>{
    try{
      const res:any = await api.get('/teacher/live/sessions')
      const data=res?.data || res
      setSessions(data.sessions || [])
      setCounts(data.counts || null)
    }catch(e){ setSessions([])}
  }
  const loadEvents=async()=>{
    try{
      const res:any= await api.get('/teacher/live/events')
      const data=res?.data || res
      setEvents(data||[])
    }catch{}
  }
  const loadDetail=async(id:string)=>{
    try{
      const res:any= await api.get(`/teacher/live/sessions/${id}`)
      setDrawerData(res?.data || res)
    }catch{}
  }

  useEffect(()=>{
    load(); loadEvents()
    const id=setInterval(()=>{ load(); loadEvents()}, 5000)
    // SSE try
    try{
      const token = localStorage.getItem('examguard_token') || sessionStorage.getItem('examguard_token') || ''
      // Use fetch EventSource with auth header not trivial; fallback to polling only
      // Attempt to connect with query param token? Instead just use polling
    }catch{}
    return ()=> clearInterval(id)
  },[])

  useEffect(()=>{
    if(selected) loadDetail(selected.sessionId)
  },[selected])

  const filtered = (sessions||[]).filter(s=>{
    if(filter!=="All" && s.connectionState!==filter) return false
    if(search && ! (s.student.name.toLowerCase().includes(search.toLowerCase()) || s.exam.title.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const handleBroadcast=async(target:'ALL'|'SINGLE')=>{
    if(!broadcastMsg.trim()) return
    setSending(true)
    try{
      // Pick first live exam for demo if target ALL use first session's exam id
      const examId = selected?.exam.id || filtered[0]?.exam.id || sessions?.[0]?.exam.id
      if(!examId){ toast({title:"No active exam to broadcast", variant:"info"}); return}
      await api.post(`/teacher/live/exams/${examId}/broadcast`, { message: broadcastMsg, sessionId: target==='SINGLE' ? selected?.sessionId : undefined, target })
      toast({title:"Announcement sent", description: broadcastMsg, variant:"success"})
      setBroadcastMsg("")
    }catch(e:any){ toast({title:"Failed", description:e.message, variant:"info"})}
    finally{ setSending(false)}
  }

  if(!sessions) return <LoadingState label="Loading live sessions…" />
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitor"
        description="Privacy-respecting live proctor HUD · Tab/window focus, connection, progress and recent exam-session events. Technology assists, human judgment decides."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
            <Button variant="secondary" size="sm" onClick={load}><Radio className="h-4 w-4" />Refresh</Button>
          </div>
        }
      />

      <Card className="p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by student, exam…" className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["All","ACTIVE","FOCUS_LOST","DISCONNECTED","INACTIVE","SUBMITTED"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className={`h-8 px-3 rounded-lg border text-xs font-medium ${filter===f? "bg-slate-900 text-white border-slate-900":"bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                {f==="All" ? `All (${counts?.all||0})` : `${f.replace(/_/g,' ')} (${counts?.[f]||0})`}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-2 text-center">
          {counts && Object.entries(counts).slice(1).map(([k,v])=>{
            const meta=stateMeta(k)
            return <div key={k} className={`rounded-lg border p-2.5 ${meta.color}`}><div className="text-[11px] tracking-widest uppercase font-semibold">{k.replace(/_/g,' ')}</div><div className="text-sm font-bold mt-1">{v as number}</div></div>
          })}
        </div>
      </Card>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          {filtered.length===0 ? <EmptyState title="No active sessions" description="When students start exams, their live cards appear here. For demo, start an exam as Aarav Sharma." /> : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(s=>{
                const meta=stateMeta(s.connectionState)
                const Icon=meta.icon
                return (
                  <Card key={s.sessionId} className="hover:shadow-card cursor-pointer transition" onClick={()=>setSelected(s)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <GeneratedAvatar name={s.student.name} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-slate-900 truncate">{s.student.name}</div>
                          <div className="text-xs text-slate-500 truncate">{s.student.studentId} • {s.student.email}</div>
                          <div className="text-xs text-slate-600 mt-1 truncate">{s.exam.title} • {s.exam.subject}</div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full border ${meta.color}`}><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /><Icon className="h-3 w-3" />{meta.label}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-center">
                          <div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Progress</div>
                          <div className="text-sm font-semibold text-slate-900 mt-1">{s.progress.answered}/{s.progress.total} • {s.progress.percent}%</div>
                          <div className="text-xs text-slate-600">{s.currentQuestion || "—"}</div>
                        </div>
                        <div className={`rounded-lg border p-2.5 text-center ${s.timeRemainingSec<300? "bg-amber-50 border-amber-200":"bg-white border-slate-200"}`}>
                          <div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Time left</div>
                          <div className="text-sm font-mono font-semibold text-slate-900 mt-1">{fmt(s.timeRemainingSec)}</div>
                          <div className="text-xs text-slate-600">{s.timeRemainingSec<60? "Critical": s.timeRemainingSec<300? "Warning":"On time"}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{s.integrityActivity} recent events</span>
                        <span>{new Date(s.lastActivityAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">Session {s.sessionId.slice(-6).toUpperCase()} • {s.connectionState}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Teacher announcements</CardTitle><p className="text-xs text-slate-600">Privacy-respecting: announcement text only, no private device data.</p></CardHeader>
            <CardContent className="space-y-3">
              <textarea value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} placeholder="Example: 5 minutes remaining. Please ensure your answers are saved." className="w-full min-h-[72px] rounded-lg border border-slate-300 bg-white p-3 text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              <div className="flex gap-2">
                <Button onClick={()=>handleBroadcast('ALL')} disabled={sending || !broadcastMsg.trim()}><Send className="h-4 w-4" /> Broadcast to all</Button>
                <Button variant="secondary" onClick={()=>handleBroadcast('SINGLE')} disabled={sending || !selected || !broadcastMsg.trim()}>Send to {selected? selected.student.name.split(" ")[0] : "selected"}</Button>
              </div>
              <div className="text-xs text-slate-500">Students see: Exam Announcement • Message. Never expose private session info.</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Radio className="h-4 w-4" /> Live event feed</CardTitle><span className="text-xs text-slate-500">{events.length} events</span></CardHeader>
            <CardContent>
              <ol className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {events.length===0 ? <div className="py-8 text-center text-sm text-slate-500">No recent events.</div> : events.slice(0,30).map((ev:any)=>(
                  <li key={ev.id} className="flex gap-3 text-sm">
                    <span className="text-xs font-mono text-slate-500 whitespace-nowrap">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-slate-900 truncate">{ev.student?.name || "Student"} • {ev.title}</div>
                      <div className="text-xs text-slate-600 truncate">{ev.exam?.title}</div>
                    </div>
                    <span className="text-xs text-slate-500">{ev.eventType}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 text-xs text-slate-500">Throttled: updates every 3–5s, not aggressive polling.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Privacy notice</CardTitle></CardHeader>
            <CardContent className="text-xs leading-5 text-slate-600">
              Only exam-related technical signals are recorded: tab visibility, focus, fullscreen, question navigation, answer changes, connection heartbeat. No browsing history, clipboard content, camera or mic. Scores are review-priority indicators, not proof of misconduct.
            </CardContent>
          </Card>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-slate-900/30" onClick={()=>{ setSelected(null); setDrawerData(null)}} />
          <div className="w-full max-w-[420px] bg-white border-l border-slate-200 shadow-xl overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{selected.student.name}</div>
                <div className="text-xs text-slate-600">{selected.exam.title} • {selected.exam.subject}</div>
                <div className="text-xs font-mono text-slate-500 mt-1">Session {selected.sessionId.slice(0,8)} • Started {new Date(selected.startedAt as string).toLocaleString()}</div>
              </div>
              <button onClick={()=>{ setSelected(null); setDrawerData(null)}} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              {!drawerData ? <div className="py-8 text-center text-sm text-slate-500">Loading…</div> : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-200 p-3 text-center"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Time remaining</div><div className="text-lg font-mono font-semibold text-slate-900 mt-1">{fmt(drawerData.timeRemainingSec)}</div></div>
                    <div className="rounded-lg border border-slate-200 p-3 text-center"><div className="text-[11px] tracking-widest uppercase font-semibold text-slate-500">Progress</div><div className="text-lg font-semibold text-slate-900 mt-1">{drawerData.progress.answered}/{drawerData.progress.total}</div><div className="text-xs text-slate-600">{drawerData.progress.percent}%</div></div>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-slate-600">Current question</span><span className="font-medium">{drawerData.session.currentQuestionId ? drawerData.session.currentQuestionId.slice(-6) : "—"}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Answered</span><span className="font-medium">{drawerData.answeredCount}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Connection</span><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${stateMeta(drawerData.connectionState).color}`}>{drawerData.connectionState}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Heartbeat</span><span className="font-mono text-xs">{drawerData.session.heartbeatCount||0}</span></div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2">Recent exam-session events</h4>
                    <ol className="space-y-2">
                      {drawerData.recentEvents.map((ev:any)=>(
                        <li key={ev.id} className="rounded-lg border border-slate-200 p-2.5">
                          <div className="text-[13px] font-medium text-slate-900">{ev.eventType.replace(/_/g,' ')}</div>
                          <div className="text-xs text-slate-600">{new Date(ev.timestamp).toLocaleTimeString()} {ev.questionId? `• Q ${ev.questionId.slice(-4)}`:''}</div>
                          {ev.metadata && <div className="text-xs font-mono text-slate-500 mt-1 truncate">{typeof ev.metadata==='string'? ev.metadata: JSON.stringify(ev.metadata).slice(0,100)}</div>}
                        </li>
                      ))}
                      {drawerData.recentEvents.length===0 && <div className="text-xs text-slate-500">No events yet.</div>}
                    </ol>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">Do not expose private device info. Only exam-related signals.</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
