import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Clock3, Save, ChevronLeft, ChevronRight, Flag, Grid3x3, AlertTriangle, WifiOff, Wifi, Maximize, Minimize, Cloud, CloudOff, RefreshCw, Bookmark } from "lucide-react"
import { useToast } from "@/components/ui/Toast"
import { studentApi } from "@/services/apiServices"
import { LoadingState, ErrorState } from "@/components/ui/States"

type SaveState = "saved" | "saving" | "offline" | "retrying" | "failed"

export default function TakeExam(){
  const {id} = useParams()
  const [searchParams]=useSearchParams()
  const navigate = useNavigate()
  const {toast} = useToast()
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const [session,setSession]=useState<any>(null)
  const [questions,setQuestions]=useState<any[]>([])
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string,string>>({})
  const [visited,setVisited]=useState<Set<number>>(new Set([0]))
  const [marked,setMarked]=useState<Set<string>>(new Set())
  const [saveState,setSaveState]=useState<SaveState>("saved")
  const [saveLabel,setSaveLabel]=useState<string>("Saved just now")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState(3600)
  const [deadlineAt,setDeadlineAt]=useState<string | null>(null)
  const [examTitle,setExamTitle]=useState('')
  const [autoSubmitting,setAutoSubmitting]=useState(false)
  const [online,setOnline]=useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [fullscreen,setFullscreen]=useState(false)
  const [showFullscreenPrompt,setShowFullscreenPrompt]=useState(true)
  const [announcements,setAnnouncements]=useState<any[]>([])
  const eventBuffer=useRef<any[]>([])
  const flushRef=useRef<number|null>(null)
  const heartbeatRef=useRef<number|null>(null)
  const savingRef=useRef(false)

  useEffect(()=>{
    const onOnline = ()=> { setOnline(true); setSaveState("retrying"); flushBuffer(); setSaveLabel("Retrying…") }
    const onOffline = ()=> { setOnline(false); setSaveState("offline"); setSaveLabel("Offline") }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const onFsChange=()=>{
      const isFs= !!document.fullscreenElement
      setFullscreen(isFs)
      if(session){
        const type=isFs? 'FULLSCREEN_ENTERED':'FULLSCREEN_EXITED'
        bufferEvent({eventType:type})
        if(!isFs){
          toast({title:"Fullscreen mode was exited.", description:"You can re-enter fullscreen for a focused environment.", variant:"info"})
        }
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return ()=>{ window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); document.removeEventListener('fullscreenchange', onFsChange)}
  },[session])

  const bufferEvent=(ev:any)=>{
    eventBuffer.current.push({ ...ev, timestamp: new Date().toISOString() })
    // flush if buffer >=10 or every 5s
    if(eventBuffer.current.length>=10) flushBuffer()
  }
  const flushBuffer=async()=>{
    if(!session || eventBuffer.current.length===0 || !online) return
    const batch=[...eventBuffer.current]
    eventBuffer.current=[]
    try{
      await studentApi.postEvents(session.id, batch)
      setSaveState("saved"); setSaveLabel("Saved just now")
    }catch(e:any){
      // re-queue and mark retrying
      eventBuffer.current = [...batch, ...eventBuffer.current]
      setSaveState("retrying"); setSaveLabel("Retrying…")
      // don't spam, will retry on next flush
    }
  }

  // periodic flush
  useEffect(()=>{
    if(!session) return
    const id=setInterval(()=> flushBuffer(), 4000)
    return ()=> clearInterval(id)
  },[session, online])

  // heartbeat every 30s
  useEffect(()=>{
    if(!session) return
    const hb=async()=>{
      try{
        await studentApi.postHeartbeat(session.id, { currentQuestionId: questions[idx]?.id, connectionState: online? (document.hidden? "FOCUS_LOST":"ACTIVE") : "DISCONNECTED", timestamp: new Date().toISOString() })
      }catch{}
    }
    hb()
    const id=setInterval(hb, 30000)
    heartbeatRef.current=id as any
    return ()=> { if(heartbeatRef.current) clearInterval(heartbeatRef.current as any)}
  },[session, idx, online, questions])

  // announcements polling
  useEffect(()=>{
    if(!session) return
    const fetchAnn=async()=>{
      try{
        const res:any = await studentApi.getAnnouncements(session.examId, session.id)
        const list=Array.isArray(res)? res : (res?.data || [])
        if(list?.length) setAnnouncements(list.slice(0,3))
      }catch{}
    }
    fetchAnn()
    const id=setInterval(fetchAnn, 15000)
    return ()=> clearInterval(id)
  },[session])

  // init session
  useEffect(()=>{
    let mounted=true
    async function init(){
      try{
        const sidParam = searchParams.get('session')
        let sess:any
        if(sidParam){
          sess = await studentApi.getSession(sidParam)
        } else {
          const start = await studentApi.startExam(id!)
          const sid = start.session.id
          sess = await studentApi.getSession(sid)
        }
        if(!mounted) return
        if(sess.status!=='IN_PROGRESS'){
          toast({title:"Session not active", description:`Status: ${sess.status}`})
          navigate(`/student/results/${sess.id}`)
          return
        }
        setSession(sess)
        setQuestions(sess.questions)
        setExamTitle(sess.exam.title)
        setDeadlineAt(sess.deadlineAt)
        if(sess.deadlineAt){
          const rem = Math.max(0, Math.floor((new Date(sess.deadlineAt).getTime() - Date.now())/1000))
          setTimeLeft(rem)
        } else {
          setTimeLeft(sess.remainingSec)
        }
        const ansMap: Record<string,string> = {}
        for(const a of sess.answers) ansMap[a.questionId]=a.answer
        setAnswers(ansMap)
        setVisited(new Set([0]))
        // marked for review
        try{
          const m:any = await studentApi.getMarkForReview(sess.id)
          const ids=m?.markedQuestionIds || m?.data?.markedQuestionIds || []
          if(ids.length) setMarked(new Set(ids))
        }catch{}
        // initial events
        if(sess.events && !sess.events.some((e:any)=> e.eventType==='SESSION_STARTED')){
          bufferEvent({eventType:'SESSION_STARTED'})
        }
        setLoading(false)
      }catch(e:any){
        setError(e.message)
        setLoading(false)
      }
    }
    init()
    return ()=>{ mounted=false}
  },[id, searchParams])

  // timer
  useEffect(()=>{
    if(loading || !session || !deadlineAt) return
    const t = setInterval(()=> {
      const rem = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now())/1000))
      setTimeLeft(rem)
      if(rem<=0){
        clearInterval(t)
        if(!autoSubmitting){
          setAutoSubmitting(true)
          handleAutoSubmit()
        }
      }
    }, 1000)
    return ()=> clearInterval(t)
  },[loading, session, deadlineAt])

  useEffect(()=>{
    if(loading || !session || deadlineAt) return
    const t = setInterval(()=> setTimeLeft(s=> {
      if(s<=1){
        clearInterval(t)
        handleAutoSubmit()
        return 0
      }
      return s-1
    }), 1000)
    return ()=> clearInterval(t)
  },[loading, session, deadlineAt])

  const handleAutoSubmit = async ()=>{
    if(!session) return
    try{
      await flushBuffer()
      await studentApi.submitSession(session.id)
      toast({title:"Time is up. Your test is being submitted.", variant:"info"})
      navigate(`/student/exams/${id}/submitted`)
    }catch(e:any){
      toast({title:"Auto-submit failed", description:e.message})
    }
  }

  // visibility + fullscreen + copy/paste tracking with buffering
  useEffect(()=>{
    if(!session) return
    const handler = ()=>{
      const type = document.hidden ? 'TAB_HIDDEN' : 'TAB_VISIBLE'
      bufferEvent({eventType:type})
    }
    const onBlur=()=> bufferEvent({eventType:'WINDOW_BLUR'})
    const onFocus=()=> bufferEvent({eventType:'WINDOW_FOCUS'})
    const onCopy = ()=> bufferEvent({eventType:'COPY'})
    const onPaste = ()=> bufferEvent({eventType:'PASTE'})
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    return ()=>{
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
    }
  },[session])

  const fmt = (s:number)=> `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`
  const timerWarning = timeLeft <= 60 ? 'critical' : timeLeft <= 300 ? 'warning' : 'normal'

  const select = async (val:string)=>{
    const q = questions[idx]
    if(!q || !session) return
    if(savingRef.current) return
    savingRef.current=true
    setSaveState("saving"); setSaveLabel("Saving…")
    setAnswers(prev=> ({...prev, [q.id]: val}))
    setVisited(prev=> new Set(prev).add(idx))
    try{
      await studentApi.saveAnswer(session.id, q.id, val)
      setSaveState("saved"); setSaveLabel("Saved just now")
      const isUpdate = !!answers[q.id]
      bufferEvent({eventType: isUpdate ? 'ANSWER_CHANGED':'QUESTION_ANSWERED', questionId: q.id})
    }catch(e:any){
      setSaveState("failed"); setSaveLabel("Save failed")
      toast({title:"Failed to save", description:e.message})
    }finally{
      savingRef.current=false
      setTimeout(()=>{ if(saveState==="saved") setSaveLabel("Saved just now")}, 2000)
    }
  }

  const handleShort = (val:string)=>{
    // debounced saving for short answer: we reuse select but with debounce 800ms
    const q = questions[idx]
    if(!q) return
    setAnswers(prev=> ({...prev, [q.id]: val}))
    setVisited(prev=> new Set(prev).add(idx))
    setSaveState("saving"); setSaveLabel("Saving…")
    // simple debounce via timeout
    if((handleShort as any)._t) clearTimeout((handleShort as any)._t)
    ;(handleShort as any)._t = setTimeout(async()=>{
      try{
        await studentApi.saveAnswer(session.id, q.id, val)
        setSaveState("saved"); setSaveLabel("Saved just now")
        bufferEvent({eventType: answers[q.id] ? 'ANSWER_CHANGED':'QUESTION_ANSWERED', questionId:q.id})
      }catch{
        setSaveState("failed"); setSaveLabel("Save failed")
      }
    }, 600)
  }

  const toggleMark=async()=>{
    const q=questions[idx]
    if(!q || !session) return
    const isMarked=marked.has(q.id)
    const next=!isMarked
    setMarked(prev=>{
      const n=new Set(prev)
      if(next) n.add(q.id); else n.delete(q.id)
      return n
    })
    try{
      await studentApi.toggleMarkForReview(session.id, q.id, next)
      toast({title: next? "Marked for review":"Unmarked", variant:"info"})
    }catch{}
  }

  const handleSubmit = async ()=>{
    if(!session) return
    await flushBuffer()
    try{
      await studentApi.submitSession(session.id)
      toast({title:"Exam submitted", description:"Your responses have been recorded.", variant:"success"})
      navigate(`/student/results/${session.id}`)
    }catch(e:any){
      toast({title:"Submission failed", description:e.message})
    }
  }

  const goIdx = (i:number)=>{
    setIdx(i)
    setVisited(prev=> new Set(prev).add(i))
    if(session && questions[i]){
      bufferEvent({eventType:'QUESTION_OPENED', questionId: questions[i].id})
    }
  }

  const enterFullscreen=async()=>{
    try{
      await document.documentElement.requestFullscreen()
      setShowFullscreenPrompt(false)
    }catch{}
  }

  if(loading) return <div className="p-6"><LoadingState label="Starting exam session…" /></div>
  if(error) return <div className="p-6"><ErrorState description={error} retry={()=> location.reload()} /></div>
  if(!session) return <div className="p-6 text-sm text-slate-600">Session not found.</div>
  const q = questions[idx]
  const progress = questions.length? Math.round(((idx+1)/questions.length)*100):0
  const answeredCount = Object.keys(answers).filter(k=> answers[k] && answers[k].trim().length>0).length
  const remainingCount = questions.length - answeredCount
  const markedCount = marked.size

  const saveIcon = saveState==="saving" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : saveState==="saved" ? <Cloud className="h-3.5 w-3.5 text-emerald-600" /> : saveState==="offline" ? <CloudOff className="h-3.5 w-3.5 text-red-600" /> : saveState==="retrying" ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-600" />

  return (
    <div className="min-h-[calc(100vh-56px)] -m-4 lg:-m-6 bg-[#f8fafc] flex flex-col">
      {showFullscreenPrompt && (
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 lg:px-6 py-3 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white grid place-items-center shrink-0"><Maximize className="h-4 w-4" /></div>
          <div className="flex-1">
            <div className="text-sm font-medium text-indigo-900">Fullscreen mode helps provide a focused examination environment.</div>
            <div className="text-xs text-indigo-800 mt-0.5">You can enter fullscreen for better focus. Exiting fullscreen will be recorded as an observed event, not as misconduct.</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={enterFullscreen}><Maximize className="h-4 w-4" />Enter fullscreen</Button>
            <Button size="sm" variant="ghost" onClick={()=>setShowFullscreenPrompt(false)}>Dismiss</Button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="px-4 lg:px-6 h-[52px] flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-slate-900 truncate flex items-center gap-2"><span>ExamGuard</span><span className="text-slate-300">•</span><span className="truncate">{examTitle}</span></div>
            <div className="text-xs text-slate-500 hidden sm:block">Question {idx+1} of {questions.length} • {answeredCount} answered • {markedCount} marked</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border ${timerWarning==='critical' ? 'bg-red-50 border-red-200 text-red-700' : timerWarning==='warning' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`} role="timer" aria-live={timerWarning!=='normal' ? "assertive" : "off"} aria-label={`${Math.floor(timeLeft/60)} minutes ${timeLeft%60} seconds remaining`}>
              <Clock3 className="h-3.5 w-3.5" aria-hidden/> {fmt(timeLeft)}
            </span>
            <span className="sm:hidden text-xs font-mono font-medium px-2 py-1 rounded-lg bg-slate-900 text-white" aria-live="polite">{fmt(timeLeft)}</span>
            <span className={`hidden lg:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${online? "bg-emerald-50 border-emerald-200 text-emerald-800":"bg-red-50 border-red-200 text-red-800"}`} aria-live="polite">
              {online? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />} {online? "Online" : "Offline"}
            </span>
            <span className={`hidden md:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${saveState==="saved"? "bg-emerald-50 border-emerald-200 text-emerald-800" : saveState==="saving"? "bg-amber-50 border-amber-200 text-amber-800" : saveState==="offline"? "bg-slate-100 border-slate-300 text-slate-700" : "bg-red-50 border-red-200 text-red-700"}`} aria-live="polite" title={saveLabel}>
              {saveIcon} {saveLabel}
            </span>
            <button onClick={()=>{
              if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen()
            }} className="hidden lg:inline-flex h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label={fullscreen? "Exit fullscreen":"Enter fullscreen"}>{fullscreen? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</button>
            <Button size="sm" onClick={()=>setConfirmOpen(true)}>Submit</Button>
          </div>
        </div>
        <div className="h-1 bg-slate-100" aria-hidden><div className="h-full bg-slate-900 transition-all duration-300" style={{width:`${progress}%`}} /></div>
        {timerWarning!=='normal' && (
          <div className={`px-4 lg:px-6 py-2 text-xs flex items-center gap-2 border-b ${timerWarning==='critical' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-900 border-amber-200'}`} role="alert">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {timerWarning==='critical' ? 'Less than 1 minute remaining. The test will be auto-submitted.' : 'Less than 5 minutes remaining. Review your answers.'}
          </div>
        )}
        {!online && (
          <div className="px-4 lg:px-6 py-2 text-xs flex items-center gap-2 bg-red-50 text-red-800 border-b border-red-200" role="alert">
            <WifiOff className="h-3.5 w-3.5" /> Your connection appears unstable. Your saved answers will be synchronized when the connection is restored.
          </div>
        )}
        {announcements.length>0 && (
          <div className="px-4 lg:px-6 py-2 text-xs flex flex-col gap-1 bg-indigo-50 text-indigo-900 border-b border-indigo-200" role="status" aria-live="polite">
            {announcements.map((a:any)=>(
              <div key={a.id} className="flex items-start gap-2"><span className="font-semibold shrink-0">Exam Announcement:</span><span>{a.message}</span><span className="ml-auto text-[11px] text-indigo-700">{new Date(a.createdAt).toLocaleTimeString()}</span></div>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_320px] gap-0 w-full max-w-[1120px] mx-auto">
        <div className="p-4 lg:p-6">
          <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 flex gap-2 text-xs text-indigo-900 mb-4">
            <span className="font-semibold shrink-0">Privacy:</span>
            <span>ExamGuard records limited exam-session events such as question navigation, answer changes, focus state, and connection status to support transparent examination review.</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">Question {idx+1} of {questions.length}</span>
            <span className="text-xs text-slate-600">{answeredCount} answered • {markedCount} marked • {remainingCount} remaining</span>
          </div>

          {q ? (
            <Card className="p-5 lg:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-[15px] font-medium leading-6 text-slate-900 flex-1">{q.text}</h2>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 shrink-0">{q.points} marks</span>
              </div>
              <div className="mt-5 space-y-2.5">
                {q.type==="SHORT" || q.type==="SHORT_ANSWER" || q.type==="LONG_ANSWER" ? (
                  <div>
                    <label htmlFor="short-answer" className="sr-only">Your answer</label>
                    <textarea id="short-answer" value={answers[q.id]||""} onChange={e=>handleShort(e.target.value)} placeholder="Type your answer…" className="w-full min-h-[140px] rounded-lg border border-slate-300 bg-white p-3 text-[14px] leading-6 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5"><Save className="h-3 w-3" /> Auto-saved. Technology assists, keep it concise.</div>
                  </div>
                ) : (
                  (q.options||[]).map((opt:string)=>{
                    const selected = answers[q.id]===opt
                    return (
                      <label key={opt} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50"}`}>
                        <input type="radio" name={q.id} checked={selected} onChange={()=>select(opt)} className="h-4 w-4 accent-slate-900" />
                        <span className={`text-[14px] flex-1 ${selected? "text-white":"text-slate-800"}`}>{opt}</span>
                        {selected && <span className="text-xs font-medium text-white/80">Selected</span>}
                      </label>
                    )
                  })
                )}
              </div>

              <div className="flex items-center justify-between mt-6 gap-3">
                <Button variant="secondary" disabled={idx===0} onClick={()=>goIdx(Math.max(0,idx-1))}><ChevronLeft className="h-4 w-4" /> Previous</Button>
                <Button variant={marked.has(q.id)? "secondary":"ghost"} onClick={toggleMark} className="gap-1.5"><Bookmark className={`h-4 w-4 ${marked.has(q.id)? "fill-amber-500 text-amber-500":""}`} />{marked.has(q.id)? "Marked":"Mark for Review"}</Button>
                {idx < questions.length-1 ? <Button onClick={()=>goIdx(Math.min(questions.length-1,idx+1))}>Next <ChevronRight className="h-4 w-4" /></Button> : <Button onClick={()=>setConfirmOpen(true)} variant="primary">Submit</Button>}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center"><div className="text-sm text-slate-600">No questions in this exam.</div><Button size="sm" className="mt-3" onClick={()=>setConfirmOpen(true)}>Submit anyway</Button></Card>
          )}

          <div className="flex gap-2 mt-4 lg:hidden">
            <Button variant="secondary" className="flex-1" onClick={()=>document.getElementById("navigator")?.scrollIntoView({behavior:"smooth"})}><Grid3x3 className="h-4 w-4" /> Navigator</Button>
            <Button variant={marked.has(q?.id)? "secondary":"ghost"} onClick={toggleMark}><Flag className="h-4 w-4" /> Flag</Button>
          </div>
        </div>

        <div id="navigator" className="border-t lg:border-t-0 lg:border-l border-slate-200 bg-white p-4 lg:p-5 lg:sticky lg:top-[57px] lg:h-[calc(100vh-57px)] lg:overflow-auto">
          <h3 className="text-[13px] font-semibold text-slate-900">Question Navigator</h3>
          <p className="text-xs text-slate-600 mt-1">Current • Answered • Marked • Visited • Unvisited. Timer is server-authoritative.</p>
          <div className="grid grid-cols-5 gap-1.5 mt-4">
            {questions.map((qq:any,i:number)=> {
              const isAnswered = !!answers[qq.id] && String(answers[qq.id]).trim().length>0
              const isMarked = marked.has(qq.id)
              const isCurrent = i===idx
              const isVisited = visited.has(i)
              let cls="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              let label=""
              if(isCurrent){ cls="bg-slate-900 text-white border-slate-900"; label="Current" }
              else if(isMarked && isAnswered){ cls="bg-purple-50 border-purple-300 text-purple-800 ring-1 ring-purple-300"; label="Marked & Answered" }
              else if(isMarked){ cls="bg-amber-50 border-amber-400 text-amber-900 ring-1 ring-amber-300"; label="Marked" }
              else if(isAnswered) cls="bg-emerald-50 border-emerald-300 text-emerald-800"
              else if(isVisited) cls="bg-slate-100 border-slate-300 text-slate-700"
              else { cls="bg-white border-slate-200 text-slate-700"; label="Unvisited" }
              return (
                <button key={qq.id} onClick={()=>goIdx(i)} title={`${label} — Q${i+1}`} className={`h-9 rounded-lg border text-[13px] font-medium flex flex-col items-center justify-center leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${cls}`} aria-label={`Question ${i+1} ${isMarked? 'marked':''} ${isAnswered? 'answered': isVisited? 'visited':'not visited'} ${isCurrent? 'current':''}`} aria-current={isCurrent? "true": undefined}>
                  <span>{i+1}</span>
                  {isMarked && <span className="text-[8px] leading-none">●</span>}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-900" />Current</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Answered</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Marked</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Visited</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white border border-slate-300" />Unvisited</span>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Progress</span><span className="text-sm font-semibold text-slate-900 tabular-nums">{answeredCount}/{questions.length}</span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Marked for Review</span><span className="text-sm font-semibold text-amber-700 tabular-nums">{markedCount}</span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 lg:hidden flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 flex items-center gap-1"><Clock3 className="h-3 w-3" />{fmt(timeLeft)} left</span>
              <span className={`text-xs font-medium ${timerWarning==='critical'?'text-red-700': timerWarning==='warning'?'text-amber-700':'text-slate-600'}`}>{timerWarning==='critical'?'Critical': timerWarning==='warning'?'Warning':'On time'}</span>
            </div>
            <Button className="w-full" onClick={()=>setConfirmOpen(true)}>Submit exam</Button>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">{saveIcon} {saveLabel}</div>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={()=>setConfirmOpen(false)} title="Submit Test?" description="Summary of your attempt. You won’t be able to change answers after submission.">
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-600">Answered</span><span className="font-medium tabular-nums">{answeredCount} / {questions.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Marked for Review</span><span className="font-medium tabular-nums text-amber-700">{markedCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Unanswered</span><span className="font-medium tabular-nums">{remainingCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Time left</span><span className="font-medium tabular-nums">{fmt(timeLeft)}</span></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={()=>setConfirmOpen(false)}>Continue Test</Button>
            <Button onClick={handleSubmit}>Submit Test</Button>
          </div>
        </div>
      </Modal>
      {timeLeft===0 && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm grid place-items-center z-50 p-6 text-center">
          <Card className="p-6 max-w-sm">
            <div className="text-[15px] font-semibold text-slate-900">Time is up</div>
            <div className="text-sm text-slate-600 mt-1">Your test is being submitted…</div>
          </Card>
        </div>
      )}
    </div>
  )
}
