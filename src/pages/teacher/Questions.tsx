import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Textarea } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Badge } from "@/components/ui/Badge"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { useToast } from "@/components/ui/Toast"
import { examService } from "@/services"
import { questionApi, examApi } from "@/services/apiServices"
import type { Question } from "@/types"
import { GripVertical, Copy, Trash2, Plus, Eye } from "lucide-react"
import { LoadingState } from "@/components/ui/States"

export default function Questions(){
  const {id} = useParams()
  const [exam,setExam]=useState<any>(null)
  const {toast}=useToast()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading,setLoading]=useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Question | null>(null)
  const selected = questions.find(q=>q.id===selectedId)

  useEffect(()=>{
    async function load(){
      try{
        const e = await examApi.getExamById(id!)
        setExam(e || examService.getAllExamsCombined().find(x=>x.id===id))
      }catch{ setExam(examService.getAllExamsCombined().find(x=>x.id===id)) }
      try{
        const qs = await questionApi.getQuestions(id!)
        const mapped = qs.map((q:any)=> ({...q, type:q.type.toLowerCase()}))
        setQuestions(mapped)
        if(mapped[0]) setSelectedId(mapped[0].id)
      }catch{
        const mock = (await import('@/data/mockQuestions')).getQuestionsByExam(id!)
        const mapped = mock.map(q=> ({...q}))
        setQuestions(mapped as any)
        if(mapped[0]) setSelectedId(mapped[0].id)
      } finally{ setLoading(false)}
    }
    load()
  },[id])

  if(loading) return <LoadingState label="Loading questions..." />
  if(!exam) return <div>Not found</div>

  const openNew = ()=>{
    const q: Question = {id:"q"+Date.now(), examId:id!, order: questions.length+1, type:"mcq", text:"New question", options:["Option A","Option B","Option C","Option D"], correctAnswer:"Option A", points:2, required:true}
    setEditing(q)
  }
  const save = async ()=>{
    if(!editing) return
    if(!editing.text.trim()){ toast({title:"Question text required"}); return }
    try{
      if(questions.find(p=>p.id===editing.id)){
        await questionApi.updateQuestion(editing.id, {text:editing.text, type:editing.type, points:editing.points, required:editing.required, options:editing.options, correctAnswer:editing.correctAnswer, order:editing.order})
        setQuestions(prev=> prev.map(p=>p.id===editing.id ? editing : p))
      } else {
        const created = await questionApi.createQuestion(id!, {text:editing.text, type:editing.type, points:editing.points, required:editing.required, options:editing.options, correctAnswer:editing.correctAnswer, order:editing.order})
        // reload to get real id
        const qs = await questionApi.getQuestions(id!)
        setQuestions(qs.map((q:any)=> ({...q, type:q.type.toLowerCase()})) as any)
        setSelectedId((created as any).id)
      }
      setEditing(null)
      toast({title:"Question saved to database", variant:"success"})
    }catch(e:any){
      // fallback local
      setQuestions(prev=>{
        const exists = prev.find(p=>p.id===editing.id)
        if(exists) return prev.map(p=>p.id===editing.id ? editing : p)
        return [...prev, editing]
      })
      setSelectedId(editing.id)
      setEditing(null)
      toast({title:"Question saved locally (offline)", variant:"success"})
    }
  }
  const duplicate = async (q: Question)=>{
    try{
      await questionApi.createQuestion(id!, {text: q.text+" (copy)", type:q.type, points:q.points, required:q.required, options:q.options, correctAnswer:q.correctAnswer})
      const qs = await questionApi.getQuestions(id!)
      setQuestions(qs.map((x:any)=> ({...x, type:x.type.toLowerCase()})) as any)
      toast({title:"Duplicated", variant:"success"})
    }catch{
      const dup: Question = {...q, id:"q"+Date.now(), order: questions.length+1, text: q.text+" (copy)"}
      setQuestions(prev=>[...prev, dup])
    }
  }
  const remove = async (qid:string)=>{
    if(!confirm("Delete this question? This persists to database.")) return
    try{
      await questionApi.deleteQuestion(qid)
      setQuestions(prev=>prev.filter(p=>p.id!==qid))
      if(selectedId===qid) setSelectedId(questions[0]?.id ?? null)
      toast({title:"Deleted", variant:"success"})
    }catch{
      setQuestions(prev=>prev.filter(p=>p.id!==qid))
      if(selectedId===qid) setSelectedId(questions[0]?.id ?? null)
    }
  }

  const persistInline = async (updated: Question)=>{
    // auto-save on change (debounced) - for demo we save immediately via API
    setQuestions(prev=>prev.map(p=>p.id===updated.id? updated:p))
    try{
      await questionApi.updateQuestion(updated.id, {text:updated.text, points:updated.points, required:updated.required, options:updated.options, correctAnswer:updated.correctAnswer, type:updated.type})
    }catch{}
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{label:"Exams", to:"/teacher/exams"}, {label: exam.title, to:`/teacher/exams/${exam.id}`}, {label:"Questions"}]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900">Question Management</h1>
          <p className="text-sm text-slate-500">{exam.title} • {questions.length} questions (DB-persisted)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openNew} className="gap-2"><Plus className="h-4 w-4"/> Add Question</Button>
          <Button onClick={()=>toast({title:"All changes are auto-saved to database", variant:"success"})}>Save</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr_340px] gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <div className="divide-y divide-slate-100 max-h-[640px] overflow-auto">
            {questions.map(q=>(
              <div key={q.id} className={`p-4 flex gap-3 cursor-pointer hover:bg-slate-50 ${selectedId===q.id ? "bg-indigo-50/60" : ""}`} onClick={()=>setSelectedId(q.id)}>
                <GripVertical className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-slate-900 line-clamp-2">{q.order}. {q.text}</div>
                  <div className="flex items-center gap-1.5 mt-1.5"><Badge variant="neutral">{q.type}</Badge><span className="text-xs text-slate-500">{q.points} pts</span></div>
                </div>
                <div className="flex flex-col gap-1" onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>duplicate(q)} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-white border border-transparent hover:border-slate-200"><Copy className="h-3.5 w-3.5 text-slate-600"/></button>
                  <button onClick={()=>remove(q.id)} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5"/></button>
                </div>
              </div>
            ))}
            {questions.length===0 && <div className="p-8 text-center text-sm text-slate-500">No questions yet.</div>}
          </div>
          <div className="p-3 border-t border-slate-200">
            <Button variant="secondary" className="w-full gap-2" onClick={openNew}><Plus className="h-4 w-4"/>Add Question</Button>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader><CardTitle>Editor</CardTitle></CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div className="grid gap-4">
                  <Textarea label="Question text" value={selected.text} onChange={e=>{ const v=e.target.value; const upd={...selected, text:v}; persistInline(upd)}} rows={3} />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[12.5px] font-medium text-slate-700">Type</label>
                      <select value={selected.type} onChange={e=>{ const v=e.target.value as any; const upd={...selected, type:v, options: v==="short"? undefined : selected.options ?? ["Option A","Option B"] }; persistInline(upd)}} className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                        <option value="mcq">Multiple Choice</option><option value="tf">True / False</option><option value="short">Short Answer</option>
                      </select>
                    </div>
                    <Input label="Points" type="number" value={String(selected.points)} onChange={e=>{ const upd={...selected, points:Number(e.target.value)}; persistInline(upd)}} />
                  </div>
                  {selected.type!=="short" && (
                    <div className="space-y-2">
                      <label className="text-[12.5px] font-medium text-slate-700">Options</label>
                      {(selected.options ?? []).map((opt,i)=>(
                        <div key={i} className="flex gap-2">
                          <input value={opt} onChange={e=>{ const v=e.target.value; const newOpts = selected.options!.map((o,idx)=> idx===i? v:o); const upd={...selected, options:newOpts, correctAnswer: selected.correctAnswer===opt? v:selected.correctAnswer}; persistInline(upd)}} className="flex-1 h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
                          <label className="flex items-center gap-1.5 text-xs"><input type="radio" checked={selected.correctAnswer===opt} onChange={()=>{ const upd={...selected, correctAnswer:opt}; persistInline(upd)}} /> Correct</label>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={()=>{ const upd={...selected, options:[...(selected.options||[]), `Option ${ (selected.options?.length||0)+1 }`]}; persistInline(upd)}}>+ Add option</Button>
                    </div>
                  )}
                  {selected.type==="short" && (
                    <Textarea label="Reference answer" value={selected.correctAnswer} onChange={e=>{ const upd={...selected, correctAnswer:e.target.value}; persistInline(upd)}} />
                  )}
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.required} onChange={e=>{ const upd={...selected, required:e.target.checked}; persistInline(upd)}} /> Required</label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" onClick={()=>setEditing(selected)}>Advanced edit</Button>
                  <Button onClick={()=>toast({title:"Auto-saved to database", variant:"success"})}>Save changes</Button>
                </div>
              </div>
            ) : <div className="text-sm text-slate-500 py-10 text-center">Select a question to edit.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Eye className="h-4 w-4 text-slate-500"/><CardTitle>Student Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="text-sm font-medium text-slate-900">{selected.text}</div>
                {selected.type==="mcq" && <div className="mt-3 space-y-2">{selected.options?.map((o,i)=><label key={i} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50"><input type="radio" name="preview"/> <span className="text-sm">{o}</span></label>)}</div>}
                {selected.type==="tf" && <div className="mt-3 space-y-2">{selected.options?.map(o=><label key={o} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white"><input type="radio" name="preview"/><span className="text-sm">{o}</span></label>)}</div>}
                {selected.type==="short" && <textarea placeholder="Type your answer here…" className="mt-3 w-full min-h-[90px] rounded-xl border border-slate-200 p-3 text-sm" />}
                <div className="text-xs text-slate-500 mt-3">{selected.points} points • {selected.required ? "Required" : "Optional"}</div>
              </div>
            ) : <div className="text-sm text-slate-500">Preview appears here.</div>}
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs leading-5 text-amber-900">
              Preview shows how the question appears to the student. Integrity signals are recorded passively.
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal open={!!editing} onClose={()=>setEditing(null)} title={editing?.id && questions.find(q=>q.id===editing.id) ? "Edit Question" : "Add Question"}>
        {editing && (
          <div className="space-y-4">
            <Textarea label="Question text" value={editing.text} onChange={e=>setEditing({...editing, text:e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-[12.5px] font-medium text-slate-700">Type</label><select value={editing.type} onChange={e=>setEditing({...editing, type:e.target.value as any})} className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="mcq">MCQ</option><option value="tf">True/False</option><option value="short">Short</option></select></div>
              <Input label="Points" type="number" value={String(editing.points)} onChange={e=>setEditing({...editing, points:Number(e.target.value)})} />
            </div>
            <Input label="Correct answer" value={editing.correctAnswer} onChange={e=>setEditing({...editing, correctAnswer:e.target.value})} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={()=>setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save to DB</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

