import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/ui/PageHeader"
import { notificationApi } from "@/services/apiServices"
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/Toast"

export default function NotificationsPage(){
  const [list,setList]=useState<any[]|null>(null)
  const [error,setError]=useState<string|null>(null)
  const {toast}=useToast()
  const load = ()=> notificationApi.list(50).then(setList).catch(e=> setError(e.message))
  useEffect(()=>{ load() },[])
  const markAll = async()=>{
    await notificationApi.markAll().catch(()=> notificationApi.markAllLegacy())
    toast({title:"All notifications marked as read", variant:"success"})
    load()
  }
  const markOne = async(id:string)=>{
    await notificationApi.markRead(id).catch(()=>{})
    load()
  }
  if(error) return <ErrorState description={error} retry={load} />
  if(!list) return <LoadingState label="Loading notifications…" />
  const unread = list.filter(n=> !n.read).length
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description={`${unread} unread • Stay updated on submissions and reviews.`} actions={<Button variant="secondary" size="sm" onClick={markAll}>Mark all as read</Button>} />
      <Card>
        <CardHeader><CardTitle>Recent</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.length===0 ? <EmptyState title="No notifications" description="You’re all caught up." /> :
          list.map(n=>(
            <div key={n.id} className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${n.read ? 'bg-white border-slate-200' : 'bg-indigo-50/50 border-indigo-100'}`}>
              <div>
                <div className={`text-[13px] font-medium ${n.read ? 'text-slate-900' : 'text-indigo-900'}`}>{n.title}</div>
                <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                <div className="text-[11px] text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!n.read && <span className="h-2 w-2 rounded-full bg-indigo-600" aria-hidden />}
                <Button variant={n.read ? "ghost" : "secondary"} size="sm" onClick={()=> markOne(n.id)}>{n.read ? 'Read' : 'Mark read'}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

