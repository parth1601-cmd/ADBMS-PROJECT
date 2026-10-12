import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/brand/Logo'

export default function Login(){
  const {login} = useAuth()
  const nav = useNavigate()
  const [email,setEmail]=useState('teacher@examguard.demo')
  const [password,setPassword]=useState('demo123')
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  const submit = async (e: React.FormEvent)=>{
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      const u = await login(email,password)
      // redirect based on role
      if(u.role==='TEACHER') nav('/teacher/dashboard')
      else nav('/student/dashboard')
    }catch(err:any){
      setError(err.message||'Login failed')
    }finally{ setLoading(false)}
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <Card className="w-full max-w-[420px]">
        <CardHeader>
          <Logo size={40} />
          <CardTitle className="mt-4 text-xl">Welcome back</CardTitle>
          <p className="text-sm text-slate-500">Log in to ExamGuard — or choose your portal</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link to="/student/login" className="rounded-xl border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 p-3 text-center transition">
              <div className="text-xs font-bold text-sky-900">Student Portal</div>
              <div className="text-[11px] text-sky-700">/student/login →</div>
            </Link>
            <Link to="/teacher/login" className="rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 p-3 text-center transition">
              <div className="text-xs font-bold text-indigo-900">Teacher Portal</div>
              <div className="text-[11px] text-indigo-700">/teacher/login →</div>
            </Link>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">Tip: Student and Teacher have <b>separate</b> login pages with different designs.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert variant="danger">{error}</Alert>}
            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" loading={loading}>Log in (auto-detect role)</Button>
            <div className="text-xs text-slate-500 text-center">
              Demo teacher: <span className="font-mono">teacher@examguard.demo / demo123</span><br/>
              Demo student: <span className="font-mono">aarav.sharma@example.com / student123</span> or <span className="font-mono">student1@examguard.demo / student123</span>
            </div>
            <div className="text-center text-xs text-slate-600 space-y-1">
              <div>No account? <Link to="/register" className="text-indigo-600 underline">Generic Register</Link> • <Link to="/student/register" className="text-sky-600 underline">Student Register</Link> • <Link to="/teacher/register" className="text-indigo-600 underline">Teacher Register</Link></div>
              <div><Link to="/" className="text-slate-500 underline">Back to home</Link></div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
