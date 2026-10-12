import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/brand/Logo'

export default function StudentRegister(){
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
      const u = await register(name,email,password,'STUDENT')
      if(u.role!=='STUDENT'){
        setError('Account created as Teacher, please use Teacher Portal')
        return
      }
      nav('/student/dashboard')
    }catch(err:any){ setError(err.message)}
    finally{ setLoading(false)}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] bg-white rounded-[24px] border border-slate-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
        <div className="p-7 sm:p-8">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <div className="font-semibold leading-none">Student Registration</div>
              <div className="text-[11px] tracking-widest uppercase text-slate-500">Join ExamGuard • Student Portal</div>
            </div>
          </div>
          <h2 className="text-xl font-bold mt-5">Create student account</h2>
          <p className="text-sm text-slate-500">Separate portal only for students</p>

          <form onSubmit={submit} className="space-y-4 mt-6">
            {error && <Alert variant="danger">{error}</Alert>}
            <Input label="Full name" value={name} onChange={e=>setName(e.target.value)} placeholder="Aarav Sharma" required className="h-11" />
            <Input label="Student Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@school.edu" required className="h-11" />
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-medium text-slate-700">Password (min 6)</label>
              <div className="relative">
                <Input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create password" required className="h-11 pr-10" />
                <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500">
                  {showPw? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </button>
              </div>
            </div>
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 flex gap-2 text-xs text-indigo-800">
              <ShieldCheck className="h-4 w-4 shrink-0" /> You are registering as <b>STUDENT</b> — this will give access to Student Portal only.
            </div>
            <Button type="submit" className="w-full h-11 gap-2 bg-[#0f172a] hover:bg-[#1e293b]" loading={loading}>Create student account <ArrowRight className="h-4 w-4"/></Button>
            <div className="text-center text-sm text-slate-600">
              Already have account? <Link to="/student/login" className="text-indigo-600 font-semibold hover:underline">Student Login</Link>
            </div>
            <div className="text-center text-xs">
              <Link to="/teacher/register" className="text-slate-500 underline">Are you a teacher? Register here →</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
