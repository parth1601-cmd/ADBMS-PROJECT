import { useAuth } from '@/context/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { useToast } from '@/components/ui/Toast'
import { studentApi } from '@/services/apiServices'
import { Avatar } from '@/components/ui/Avatar'

export default function StudentProfile(){
  const {user} = useAuth()
  const {toast}=useToast()
  const [profile,setProfile]=useState<any>(null)
  const [name,setName]=useState(user?.name || '')
  useEffect(()=>{
    studentApi.getProfile().then(p=>{ setProfile(p); setName(p.name)}).catch(()=>{})
  },[])
  const save = async ()=>{
    try{
      await api.patch('/users/profile', {name})
      toast({title:'Profile updated', variant:'success'})
    }catch(e:any){ toast({title:e.message})}
  }
  if(!profile) return <div className="p-6 text-sm text-slate-500">Loading profile...</div>
  return (
    <div className="space-y-6 max-w-[640px]">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500">Your account information. Real authenticated user data.</p>
      </div>
      <Card className="p-6 flex items-center gap-4">
        <Avatar fallback={profile.name.slice(0,2).toUpperCase()} size={64} />
        <div>
          <div className="text-lg font-semibold text-slate-900">{profile.fullName || profile.name}</div>
          <div className="text-sm font-mono text-slate-500">{profile.studentId}</div>
          <div className="text-xs text-slate-500 mt-1">{profile.class} • Section {profile.section} • {profile.academicYear}</div>
        </div>
      </Card>
      <Card>
        <CardHeader><CardTitle>Personal information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Full name" value={name} onChange={e=>setName(e.target.value)} />
          <Input label="Student ID" value={profile.studentId} disabled />
          <Input label="Email" value={profile.email} disabled />
          <Input label="Class" value={profile.class} disabled />
          <Input label="Section" value={profile.section} disabled />
          <Input label="Academic year" value={profile.academicYear} disabled />
          <Input label="Role" value={profile.role} disabled />
          <p className="text-xs text-slate-500">Role, Student ID, Class, Section, and academic permissions are managed by the institution and cannot be changed here.</p>
          <Button onClick={save}>Save changes</Button>
        </CardContent>
      </Card>
    </div>
  )
}
