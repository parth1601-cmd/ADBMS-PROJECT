import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/Toast'

export default function TeacherSettings(){
  const {user} = useAuth()
  const {toast} = useToast()
  const [name,setName]=useState(user?.name || '')
  const [settings,setSettings]=useState<any>(null)
  useEffect(()=>{
    api.get('/users/settings').then(setSettings).catch(()=>{})
  },[])
  const saveProfile = async ()=>{
    try{
      await api.patch('/users/profile', {name})
      toast({title:'Profile updated', variant:'success'})
    }catch(e:any){ toast({title:e.message})}
  }
  return (
    <div className="space-y-6 max-w-[720px]">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage profile and preferences.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Name" value={name} onChange={e=> setName(e.target.value)} />
          <Input label="Email" value={user?.email || ''} disabled />
          <Input label="Role" value={user?.role || ''} disabled />
          <Button onClick={saveProfile}>Save profile</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Exam defaults</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <div>Default duration: {settings?.examDefaults?.durationMinutes || 60} minutes</div>
          <div>Attempts allowed: {settings?.examDefaults?.attemptsAllowed || 1}</div>
          <div className="text-xs text-slate-500 mt-2">Security-sensitive settings remain server-controlled.</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Integrity thresholds</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-600">
          <div>Normal: 0–29 • Low Concern: 30–59 • Requires Review: 60–79 • High Priority: 80–100</div>
          <p className="text-xs text-slate-500 mt-2">Thresholds are configurable server-side. Scores are review-priority indicators — not verdicts.</p>
        </CardContent>
      </Card>
    </div>
  )
}

