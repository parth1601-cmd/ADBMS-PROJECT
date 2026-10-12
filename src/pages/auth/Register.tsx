import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/brand/Logo'

export default function Register(){
  const {register} = useAuth()
  const nav = useNavigate()
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [role,setRole]=useState<'TEACHER'|'STUDENT'>('STUDENT')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      const u = await register(name,email,password,role)
      if(u.role==='TEACHER') nav('/teacher/dashboard')
      else nav('/student/dashboard')
    }catch(err:any){ setError(err.message)}
    finally{ setLoading(false)}
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <Card className="w-full max-w-[440px]">
        <CardHeader>
          <Logo size={36} />
          <CardTitle className="mt-3">Create account</CardTitle>
          <p className="text-sm text-slate-500">Join ExamGuard</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}
            <Input label="Full name" value={name} onChange={e=>setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <Input label="Password (min 6)" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-slate-700">Role</label>
              <select value={role} onChange={e=>setRole(e.target.value as any)} className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm">
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
              </select>
            </div>
            <Button type="submit" className="w-full" loading={loading}>Create account</Button>
            <div className="text-center text-xs"><Link to="/login" className="text-indigo-600 underline">Already have an account? Log in</Link></div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
