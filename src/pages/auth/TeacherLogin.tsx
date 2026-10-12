import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Users, BarChart3, Eye, EyeOff, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/brand/Logo'
import { TeacherHeroPattern } from '@/components/brand/Illustrations'

export default function TeacherLogin(){
  const {login, logout} = useAuth()
  const nav = useNavigate()
  const [email,setEmail]=useState('teacher@examguard.demo')
  const [password,setPassword]=useState('demo123')
  const [showPw,setShowPw]=useState(false)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  const submit = async (e: React.FormEvent)=>{
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      const u = await login(email,password)
      if(u.role !== 'TEACHER'){
        await logout().catch(()=>{})
        setError('This is the Teacher Portal. Students please use Student Login → /student/login')
        return
      }
      nav('/teacher/dashboard')
    }catch(err:any){
      const msg = err.message||'Login failed'
      if(msg.includes('Failed to fetch') || msg.includes('Cannot connect')){
        setError('Backend not reachable. Please start backend: open terminal, run  cd backend  then  npm run dev  (backend should run on http://localhost:4000)')
      } else {
        setError(msg)
      }
    }finally{ setLoading(false)}
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Left form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-[440px]">
          <div className="flex items-center gap-3 mb-8">
            <Logo size={40} variant="wordmark" sublabel="Secure Assessments. Fair Futures." />
            <div className="hidden">
              <div className="font-semibold tracking-tight leading-none text-slate-900">ExamGuard</div>
              <div className="text-[11px] tracking-[0.18em] uppercase text-slate-500 font-medium">Teacher Portal</div>
            </div>
            <span className="ml-auto hidden sm:inline-flex px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold tracking-widest uppercase">Secure</span>
          </div>

          <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.15)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#1e1b4b] via-indigo-600 to-violet-600" />
            <div className="p-7 sm:p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white">
                <Shield className="h-4 w-4 text-amber-300" />
                <span className="text-xs font-semibold tracking-wide">TEACHER LOGIN</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900 mt-4">Welcome back, Educator</h1>
              <p className="text-[13.5px] text-slate-500 mt-1">Sign in to manage exams, review integrity & reports</p>

              <form onSubmit={submit} className="space-y-4 mt-6">
                {error && <Alert variant="danger">{error}</Alert>}

                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-medium text-slate-700">Teacher Email</label>
                  <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="teacher@school.edu" required className="h-11 text-[14px]" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12.5px] font-medium text-slate-700">Password</label>
                    <a href="#" className="text-xs font-medium text-indigo-600 hover:underline">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Input type={showPw? 'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required className="h-11 text-[14px] pr-10" />
                    <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500">
                      {showPw? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#1e1b4b] focus:ring-[#1e1b4b]" defaultChecked />
                  <span className="text-xs text-slate-600">Keep me signed in</span>
                  <span className="ml-auto text-xs text-slate-500 flex items-center gap-1"><Lock className="h-3 w-3"/> Encrypted</span>
                </label>

                <Button type="submit" className="w-full h-11 text-[14px] gap-2" loading={loading}>
                  Sign in to Teacher Portal <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs font-semibold text-slate-700">Demo teacher account</div>
                  <div className="font-mono text-xs text-slate-600 mt-1 break-all">teacher@examguard.demo / demo123</div>
                </div>

                <div className="text-center text-[13px] text-slate-600 space-y-2 pt-1">
                  <div>New teacher? <Link to="/teacher/register" className="text-indigo-600 font-semibold hover:underline">Create teacher account</Link></div>
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <Link to="/" className="text-slate-500 hover:text-slate-700 underline">Back to home</Link>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <Link to="/student/login" className="text-indigo-600 hover:underline font-medium">Student Login →</Link>
                  </div>
                </div>
              </form>
            </div>
            <div className="px-7 sm:px-8 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5"/> Privacy-first</span>
              <span>Role-restricted access</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/> No tracking</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/> GDPR ready</span>
          </div>
        </div>
      </div>

      {/* Right promo — self-generated pattern */}
      <div className="hidden lg:flex w-[48%] xl:w-[50%] bg-[#0F172A] relative overflow-hidden flex-col justify-between p-10 xl:p-12 text-white border-l border-slate-200">
        <TeacherHeroPattern className="absolute inset-0 w-full h-full" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 backdrop-blur">
            <BarChart3 className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-xs font-medium">Trusted by 1,200+ educators</span>
          </div>
          <h2 className="text-[34px] xl:text-[38px] font-bold tracking-tight leading-[1] mt-6">Teach with<br/><span className="text-indigo-300">confidence</span> & control</h2>
          <p className="text-sm leading-6 text-white/70 mt-4 max-w-[480px]">
            ExamGuard gives teachers a dedicated portal — separate from students — to create exams, monitor integrity signals, and review with full context.
          </p>
        </div>

        <div className="relative z-10 space-y-4 max-w-[520px]">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-xl">
              <div className="h-8 w-8 rounded-lg bg-amber-100 border border-amber-200 grid place-items-center"><Shield className="h-4 w-4 text-amber-700"/></div>
              <div className="text-sm font-semibold mt-3">Integrity Reviews</div>
              <div className="text-xs text-slate-500 mt-1">78% average score • 5 pending</div>
              <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full w-[78%] bg-amber-500 rounded-full"/></div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur p-4">
              <Users className="h-5 w-5 text-sky-300" />
              <div className="text-sm font-semibold mt-3">Students</div>
              <div className="text-2xl font-bold mt-1">142</div>
              <div className="text-xs text-white/60">Across 6 exams</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white text-slate-900 p-4 flex items-center gap-3 shadow-xl">
            <div className="h-10 w-10 rounded-full bg-emerald-100 grid place-items-center"><CheckCircle2 className="h-5 w-5 text-emerald-700"/></div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Separate & Secure</div>
              <div className="text-xs text-slate-500">Teacher data never mixed with student portal</div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">Isolated</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur">Exam Builder</span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur">Question Bank</span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur">Review Queue</span>
            <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur">Reports</span>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/50 flex items-center justify-between">
          <span>© 2026 ExamGuard — Teacher Experience</span>
          <span>SOC 2 • Encrypted</span>
        </div>
      </div>
    </div>
  )
}
