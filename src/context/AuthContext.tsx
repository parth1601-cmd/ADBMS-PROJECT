import * as React from 'react'
import { api } from '@/services/api'

type User = {id:string, name:string, email:string, role:'TEACHER'|'STUDENT'}

interface Ctx {
  user: User | null
  loading: boolean
  login: (email:string, password:string)=> Promise<User>
  register: (name:string, email:string, password:string, role:'TEACHER'|'STUDENT')=> Promise<User>
  logout: ()=> Promise<void>
  refresh: ()=> Promise<void>
}

const AuthCtx = React.createContext<Ctx | null>(null)

export function AuthProvider({children}:{children:React.ReactNode}){
  const [user, setUser] = React.useState<User|null>(null)
  const [loading, setLoading] = React.useState(true)

  const refresh = React.useCallback(async ()=>{
    try{
      const u = await api.get<User>('/auth/me')
      setUser(u)
    }catch{
      setUser(null)
    }finally{
      setLoading(false)
    }
  },[])

  React.useEffect(()=>{ refresh() },[refresh])

  const login = async (email:string, password:string)=>{
    const u = await api.post<User>('/auth/login', {email, password})
    setUser(u as any)
    // fetch me to sync
    await refresh()
    return u as any
  }
  const register = async (name:string, email:string, password:string, role:'TEACHER'|'STUDENT')=>{
    const u = await api.post<User>('/auth/register', {name,email,password,role})
    setUser(u as any)
    await refresh()
    return u as any
  }
  const logout = async ()=>{
    await api.post('/auth/logout')
    setUser(null)
  }

  return <AuthCtx.Provider value={{user, loading, login, register, logout, refresh}}>{children}</AuthCtx.Provider>
}

export function useAuth(){
  const c = React.useContext(AuthCtx)
  if(!c) throw new Error('useAuth outside provider')
  return c
}

export function RequireAuth({children, roles}:{children:React.ReactNode, roles?:('TEACHER'|'STUDENT')[]}){
  const {user, loading} = useAuth()
  if(loading) return <div className="min-h-[50vh] grid place-items-center p-10"><div className="text-center"><div className="h-6 w-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto"/><p className="text-sm text-slate-600 mt-3">Checking authentication…</p></div></div>
  if(!user) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-subtle p-6 text-center">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white grid place-items-center mx-auto"><span className="text-sm font-bold">EG</span></div>
          <h2 className="text-[16px] font-semibold text-slate-900 mt-4">Please sign in to continue</h2>
          <p className="text-[13px] text-slate-600 mt-1">Your session has expired or you’re not signed in. Choose your portal.</p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <a href="/student/login" className="h-9 grid place-items-center rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[13px] font-medium hover:bg-sky-100">Student Login</a>
            <a href="/teacher/login" className="h-9 grid place-items-center rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800">Teacher Login</a>
          </div>
          <a href="/" className="inline-block mt-4 text-xs text-slate-500 hover:text-slate-700 underline">Back to home</a>
        </div>
      </div>
    )
  }
  if(roles && !roles.includes(user.role)){
    const isStudent = user.role === 'STUDENT'
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="w-full max-w-md bg-white border border-amber-200 rounded-xl p-6 text-center">
          <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center mx-auto text-amber-700">!</div>
          <h2 className="text-[16px] font-semibold text-slate-900 mt-4">Access restricted</h2>
          <p className="text-[13px] text-slate-600 mt-1">Your role <span className="font-medium text-slate-900">{user.role}</span> cannot access this area. {isStudent ? "This is a teacher-only portal." : "This is a student-only portal."}</p>
          <div className="flex gap-2 justify-center mt-6">
            <a href={isStudent ? "/student/dashboard" : "/teacher/dashboard"} className="h-9 px-4 grid place-items-center rounded-lg bg-slate-900 text-white text-[13px] font-medium">Go to your dashboard</a>
            <a href="/" className="h-9 px-4 grid place-items-center rounded-lg border border-slate-200 bg-white text-[13px] font-medium">Home</a>
          </div>
          <div className="text-xs text-slate-500 mt-4">Error: 403 · FORBIDDEN · Role mismatch</div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
