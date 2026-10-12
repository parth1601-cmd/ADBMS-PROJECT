import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/brand/Logo'

export default function TeacherRegister(){
  const {register} = useAuth()
  const nav = useNavigate()
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPw,setShowPw]=useState(false)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      const u = await register(name,email,password,'TEACHER')
      if(u.role!=='TEACHER'){
        setError('Account created as Student')
        return
      }
      nav('/teacher/dashboard')
    }catch(err:any){ setError(err.message)}
    finally{ setLoading(false)}
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] bg-white rounded-[20px] border border-slate-200 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-[#1e1b4b] via-indigo-600 to-violet-600" />
        <div className="p-7 sm:p-8">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <div className="font-semibold leading-none">Teacher Registration</div>
              <div className="text-[11px] tracking-widest uppercase text-slate-500">Join ExamGuard • Teacher Portal</div>
            </div>
          </div>
          <h2 className="text-xl font-bold mt-5">Create teacher account</h2>
          <p className="text-sm text-slate-500">Separate portal only for teachers</p>

          <form onSubmit={submit} className="space-y-4 mt-6">
            {error && <Alert variant="danger">{error}</Alert>}
            <Input label="Full name" value={name} onChange={e=>setName(e.target.value)} placeholder="Dr. Rajesh Kumar" required className="h-11" />
            <Input label="Teacher Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="teacher@school.edu" required className="h-11" />
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-slate-700">Password (min 6)</label>
              <div className="relative">
                <Input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create password" required className="h-11 pr-10" />
                <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500">
                  {showPw? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </button>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2 text-xs text-amber-900">
              <Lock className="h-4 w-4 shrink-0" /> You are registering as <b>TEACHER</b> — access to teacher dashboard, exams & reviews.
            </div>
            <Button type="submit" className="w-full h-11 gap-2" loading={loading}>Create teacher account <ArrowRight className="h-4 w-4"/></Button>
            <div className="text-center text-sm text-slate-600">
              Already have account? <Link to="/teacher/login" className="text-indigo-600 font-semibold hover:underline">Teacher Login</Link>
            </div>
            <div className="text-center text-xs">
              <Link to="/student/register" className="text-slate-500 underline">Are you a student? Register here →</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
