import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, BookOpen, Award, ArrowRight, Eye, EyeOff, ShieldCheck, Clock3, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/brand/Logo'
import { GeneratedAvatar } from '@/components/brand/GeneratedAvatar'
import { StudentHeroPattern } from '@/components/brand/Illustrations'

export default function StudentLogin(){
  const {login, logout} = useAuth()
  const nav = useNavigate()
  const [email,setEmail]=useState('aarav.sharma@example.com')
  const [password,setPassword]=useState('student123')
  const [showPw,setShowPw]=useState(false)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)

  const submit = async (e: React.FormEvent)=>{
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      const u = await login(email,password)
      if(u.role !== 'STUDENT'){
        await logout().catch(()=>{})
        setError('This is the Student Portal. Teachers please use Teacher Login → /teacher/login')
        return
      }
      nav('/student/dashboard')
    }catch(err:any){
      const msg = err.message||'Login failed'
      // Friendly message for backend down
      if(msg.includes('Failed to fetch') || msg.includes('Cannot connect')){
        setError('Backend not reachable. Please start backend: open terminal, run  cd backend  then  npm run dev  (backend should run on http://localhost:4000)')
      } else {
        setError(msg)
      }
    }finally{ setLoading(false)}
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-white flex">
      {/* Left promo - hidden on mobile — self-generated pattern, no external photo */}
      <div className="hidden lg:flex w-[52%] xl:w-[56%] bg-[#0F172A] relative overflow-hidden flex-col justify-between p-10 xl:p-12 text-white">
        {/* self-generated subtle pattern */}
        <StudentHeroPattern className="absolute inset-0 w-full h-full opacity-100" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Logo size={40} theme="dark" />
            <div>
              <div className="font-semibold tracking-tight leading-none">ExamGuard</div>
              <div className="text-[10px] tracking-[0.14em] uppercase opacity-70 font-medium">Secure Assessments. Fair Futures.</div>
              <div className="text-[11px] tracking-[0.18em] uppercase opacity-50 font-medium">Student Portal</div>
            </div>
            <span className="ml-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold tracking-widest uppercase backdrop-blur">New • 2026</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8 max-w-[520px]">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white/90">Your exams. One secure place.</span>
            </div>
            <h1 className="text-[36px] xl:text-[42px] font-bold tracking-tight leading-[0.95] mt-6">
              Learn. <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-indigo-300">Prepare.</span><br/>
              Excel with confidence.
            </h1>
            <p className="text-[15px] leading-6 text-white/70 mt-4">
              Access your tests, track progress, view results and stay updated — everything for students, in one beautiful portal separate from teachers.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <BookOpen className="h-5 w-5 text-sky-300" />
              <div className="text-sm font-semibold mt-3">My Tests</div>
              <div className="text-xs text-white/60 mt-1">Upcoming & in-progress</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <Award className="h-5 w-5 text-amber-300" />
              <div className="text-sm font-semibold mt-3">Results</div>
              <div className="text-xs text-white/60 mt-1">Instant scores & analysis</div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <div className="text-sm font-semibold mt-3">Fair Exams</div>
              <div className="text-xs text-white/60 mt-1">Proctored & trusted</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white text-slate-900 p-4 flex gap-4 items-center shadow-xl">
            <GeneratedAvatar name="Aarav Sharma" size={48} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">“I can see all my exams in one place. Super clean!”</div>
              <div className="text-xs text-slate-500">— Aarav Sharma, Class 12 • Science</div>
            </div>
            <div className="hidden xl:flex items-center gap-1 text-amber-500 text-sm">★★★★★</div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/50">
          <span>© 2026 ExamGuard — Student Experience</span>
          <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5"/> 12,400+ students</span>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-[#f8fafc] lg:bg-transparent">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo — self-generated */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Logo size={40} />
            <div className="text-left">
              <div className="font-semibold leading-none text-slate-900">ExamGuard</div>
              <div className="text-[11px] tracking-widest uppercase text-slate-500 font-medium">Student Portal</div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-slate-200 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
            <div className="p-7 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-xs font-semibold tracking-wide">STUDENT LOGIN</span>
                  </div>
                  <h2 className="text-[22px] font-bold tracking-tight text-slate-900 mt-3">Welcome back, Student!</h2>
                  <p className="text-[13.5px] text-slate-500 mt-1">Sign in to access your exams & results</p>
                </div>
                <div className="hidden sm:grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4 mt-6">
                {error && <Alert variant="danger">{error}</Alert>}

                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-medium text-slate-700">Student Email</label>
                  <div className="relative">
                    <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@school.edu" required className="pr-10 h-11 text-[14px]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12.5px] font-medium text-slate-700">Password</label>
                    <a href="#" className="text-xs text-indigo-600 hover:underline font-medium">Forgot?</a>
                  </div>
                  <div className="relative">
                    <Input type={showPw? 'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required className="pr-10 h-11 text-[14px]" />
                    <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500">
                      {showPw? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                  <span className="text-xs text-slate-600">Remember me on this device</span>
                </label>

                <Button type="submit" className="w-full h-11 text-[14px] bg-[#0f172a] hover:bg-[#1e293b] gap-2" loading={loading}>
                  Sign in to Student Portal <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="relative flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] tracking-widest uppercase font-semibold text-slate-400">Demo Access</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 space-y-1">
                  <div className="text-xs font-semibold text-sky-900 flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/> Try with demo student account</div>
                  <div className="font-mono text-xs text-sky-800 break-all">aarav.sharma@example.com / student123</div>
                  <div className="font-mono text-xs text-sky-700">student1@examguard.demo / student123</div>
                </div>

                <div className="text-center text-[13px] text-slate-600 space-y-2 pt-1">
                  <div>New student? <Link to="/student/register" className="text-indigo-600 font-semibold hover:underline">Create student account</Link></div>
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <Link to="/" className="text-slate-500 hover:text-slate-700 underline">Back to home</Link>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <Link to="/teacher/login" className="text-slate-500 hover:text-slate-700 underline">Teacher Login →</Link>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <Link to="/login" className="text-slate-500 hover:text-slate-700 underline">Generic Login</Link>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-7 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Secure & encrypted • Student data only
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-4">Separate portal for students — Teachers use a different login</p>
        </div>
      </div>
    </div>
  )
}
