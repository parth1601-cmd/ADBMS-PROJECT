import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { ShieldCheck } from "lucide-react"
import { useState } from "react"

export default function StudentSettings(){
  const [appearance,setAppearance]=useState("System")
  const [notif,setNotif]=useState(true)
  return (
    <div className="space-y-6 max-w-[640px]">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your preferences.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {["Light","Dark","System"].map(v=>(
              <Button key={v} variant={appearance===v?'primary':'secondary'} size="sm" onClick={()=>setAppearance(v)}>{v}</Button>
            ))}
          </div>
          <p className="text-xs text-slate-500">Theme preference is saved locally.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Notification preferences</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
            <span className="text-sm text-slate-700">New test notifications</span>
            <input type="checkbox" checked={notif} onChange={e=>setNotif(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
          </label>
          <p className="text-xs text-slate-500">You’ll be notified when a teacher publishes an exam.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Account information</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-600">
          Student account managed by ExamGuard. Contact administration for changes to class, section, or academic year.
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">Password changes are handled by your institution administrator. Contact support if you need to reset your password.</p>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-start gap-2">
            <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 grid place-items-center shrink-0"><ShieldCheck className="h-4 w-4 text-slate-500"/></div>
            <div><div className="text-[13px] font-medium text-slate-900">Session security</div><div className="text-xs text-slate-600 mt-0.5">Your session is protected with server-authoritative timers and secure cookies.</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
