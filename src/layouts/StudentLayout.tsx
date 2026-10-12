import { useState, useEffect, useRef } from "react"
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { LayoutDashboard, FileText, Award, User, Menu, X, Bell, LogOut, Clock3, PlayCircle, CheckCircle2, ShieldAlert, Settings, ChevronDown, Search, HelpCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/cn"
import { useAuth } from "@/context/AuthContext"
import { studentApi } from "@/services/apiServices"
import { Logo } from "@/components/brand/Logo"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"

const learningNav = [
  {to:"/student/dashboard", label:"Dashboard", icon:LayoutDashboard},
  {to:"/student/tests", label:"Available", icon:FileText},
  {to:"/student/upcoming", label:"Upcoming", icon:Clock3},
  {to:"/student/in-progress", label:"In Progress", icon:PlayCircle},
  {to:"/student/completed", label:"Completed", icon:CheckCircle2},
  {to:"/student/results", label:"Results", icon:Award},
  {to:"/student/integrity-reports", label:"Integrity", icon:ShieldAlert},
]

const accountNav = [
  {to:"/student/profile", label:"Profile", icon:User},
  {to:"/student/settings", label:"Settings", icon:Settings},
]

export default function StudentLayout(){
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const {user, logout} = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const [profile, setProfile] = useState<any>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const [searchQ, setSearchQ] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(()=>{
    studentApi.getProfile().then(setProfile).catch(()=>{})
  },[])
  const displayName = profile?.fullName || profile?.name || user?.name || 'Student'
  const studentId = profile?.studentId || (user ? `STU-${user.id.slice(-5).toUpperCase()}` : 'STU-XXXXX')
  const classInfo = profile ? `${profile.class} • ${profile.section}` : ''

  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      if(profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if(searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', h)
    return ()=> document.removeEventListener('mousedown', h)
  },[])

  useEffect(()=>{
    if(!searchQ.trim()){ setSearchResults([]); setSearchOpen(false); return }
    const id=setTimeout(async()=>{
      setSearchLoading(true); setSearchOpen(true)
      try{
        const exams = await studentApi.getStudentExams().then(d=> d.filter((e:any)=> e.title.toLowerCase().includes(searchQ.toLowerCase()) || e.subject.toLowerCase().includes(searchQ.toLowerCase())).slice(0,4)).catch(()=>[])
        setSearchResults(exams as any[])
      }catch{ setSearchResults([])}
      finally{ setSearchLoading(false)}
    },300)
    return ()=> clearTimeout(id)
  },[searchQ])

  const titleMap: Record<string,string> = {
    "/student/dashboard":"Dashboard",
    "/student/tests":"Available Tests",
    "/student/upcoming":"Upcoming",
    "/student/in-progress":"In Progress",
    "/student/completed":"Completed",
    "/student/results":"Results",
    "/student/integrity-reports":"Integrity",
  }
  const title = titleMap[loc.pathname] || loc.pathname.split("/").filter(Boolean).pop()?.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()) || "Student"

  const NavItem = ({to,label,icon:Icon}:{to:string; label:string; icon:any}) => (
    <NavLink to={to} title={collapsed ? label : undefined} className={({isActive})=>cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors", collapsed && "justify-center px-2", isActive? "bg-slate-900 text-white":"text-slate-600 hover:bg-slate-100 hover:text-slate-900")}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <aside className={cn("hidden lg:flex shrink-0 flex-col bg-white border-r border-slate-200 sticky top-0 h-screen transition-all duration-200", collapsed ? "w-[64px]" : "w-[256px]")}>
        <div className="h-[56px] flex items-center gap-2.5 px-3 border-b border-slate-200">
          <Logo size={28} />
          {!collapsed && (
            <div>
              <div className="text-[13px] font-semibold tracking-tight text-slate-900 leading-none">ExamGuard</div>
              <div className="text-[10px] font-medium tracking-widest uppercase text-slate-500">Student</div>
            </div>
          )}
          <button onClick={()=> setCollapsed(v=>!v)} className="ml-auto h-7 w-7 grid place-items-center rounded-md hover:bg-slate-100 text-slate-500 hidden lg:grid" aria-label={collapsed ? "Expand" : "Collapse"}>{collapsed ? <PanelLeftOpen className="h-4 w-4"/> : <PanelLeftClose className="h-4 w-4"/>}</button>
        </div>
        {!collapsed && (
          <div className="px-3 py-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <GeneratedAvatar name={displayName} size={36} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-slate-900 leading-none truncate">{displayName}</div>
                <div className="text-xs font-mono text-slate-500 mt-0.5 truncate">{studentId}</div>
                {classInfo && <div className="text-[11px] text-slate-500 truncate">{classInfo}</div>}
              </div>
            </div>
          </div>
        )}
        {collapsed && <div className="px-2 py-3 border-b border-slate-200 flex justify-center"><GeneratedAvatar name={displayName} size={32} /></div>}
        <div className="flex-1 overflow-auto py-4 px-2 space-y-6">
          <div>
            {!collapsed && <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Learning</div>}
            <nav className="space-y-0.5" aria-label="Learning">{learningNav.map(i=> <NavItem key={i.to} {...i} />)}</nav>
          </div>
          <div>
            {!collapsed && <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Account</div>}
            <nav className="space-y-0.5" aria-label="Account">{accountNav.map(i=> <NavItem key={i.to} {...i} />)}</nav>
          </div>
        </div>
        <div className="p-2 border-t border-slate-200">
          {!collapsed ? (
            <button onClick={async()=>{ await logout(); navigate('/student/login')}} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <LogOut className="h-4 w-4" aria-hidden/> Log out
            </button>
          ) : (
            <button onClick={async()=>{ await logout(); navigate('/student/login')}} className="w-full flex items-center justify-center py-2 rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Log out"><LogOut className="h-4 w-4"/></button>
          )}
          {!collapsed && <div className="text-[11px] text-slate-400 text-center mt-2">Student Portal</div>}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/30" onClick={()=>setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white border-r border-slate-200 flex flex-col">
            <div className="h-[56px] flex items-center justify-between px-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5"><Logo size={28} /><span className="text-[13px] font-semibold">ExamGuard</span><span className="text-[10px] tracking-widest uppercase text-slate-500 ml-1">Student</span></div>
              <button onClick={()=>setMobileOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100" aria-label="Close navigation"><X className="h-4 w-4" aria-hidden/></button>
            </div>
            <div className="px-3 py-3 border-b border-slate-200 flex items-center gap-3">
              <GeneratedAvatar name={displayName} size={32} />
              <div className="min-w-0 flex-1"><div className="text-[13px] font-medium truncate">{displayName}</div><div className="text-xs font-mono text-slate-500 truncate">{studentId}</div></div>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-6 overflow-auto">
              <div>
                <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Learning</div>
                <div className="space-y-1">{learningNav.map(i=>{
                  const Icon=i.icon
                  return <NavLink key={i.to} to={i.to} onClick={()=>setMobileOpen(false)} className={({isActive})=>cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium", isActive? "bg-slate-900 text-white":"text-slate-600 hover:bg-slate-100")}>
                    <Icon className="h-4 w-4"/>{i.label}
                  </NavLink>
                })}</div>
              </div>
              <div>
                <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Account</div>
                <div className="space-y-1">{accountNav.map(i=>{
                  const Icon=i.icon
                  return <NavLink key={i.to} to={i.to} onClick={()=>setMobileOpen(false)} className={({isActive})=>cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium", isActive? "bg-slate-900 text-white":"text-slate-600 hover:bg-slate-100")}>
                    <Icon className="h-4 w-4"/>{i.label}
                  </NavLink>
                })}</div>
              </div>
            </nav>
            <div className="p-3 border-t border-slate-200">
              <button onClick={async()=>{ await logout(); navigate('/student/login')}} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100"><LogOut className="h-4 w-4"/> Log out</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[56px] bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
          <Button variant="ghost" size="icon" className="lg:hidden -ml-1" onClick={()=>setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" aria-hidden/></Button>
          <div className="hidden lg:block text-[14px] font-semibold text-slate-900 truncate">{title}</div>
          <div className="flex-1 flex justify-center lg:justify-end">
            <div ref={searchRef} className="hidden md:flex items-center w-full max-w-[380px] relative">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
                <input value={searchQ} onChange={e=> setSearchQ(e.target.value)} onFocus={()=> searchQ && setSearchOpen(true)} placeholder="Search tests, subjects…" className="w-full h-8 pl-9 pr-9 rounded-lg border border-slate-300 bg-slate-50 text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white" aria-label="Search" />
                {searchQ && <button onClick={()=>{ setSearchQ(""); setSearchOpen(false)}} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-md hover:bg-slate-100 text-slate-500" aria-label="Clear search"><X className="h-3.5 w-3.5"/></button>}
              </div>
              {searchOpen && (
                <div className="absolute top-10 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden z-30">
                  {searchLoading ? <div className="p-4 text-center text-sm text-slate-500">Searching…</div> : (
                    <div className="p-2">
                      {searchResults.length===0 ? (
                        <div className="p-4 text-center">
                          <div className="text-sm text-slate-700">No results for “{searchQ}”</div>
                          <div className="text-xs text-slate-500 mt-1">Try a different keyword.</div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="px-2 py-1 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Tests</div>
                          {searchResults.map((e:any)=>(
                            <button key={e.id} onClick={()=>{ setSearchOpen(false); navigate(`/student/exams/${e.id}/instructions`)}} className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-500"/><span className="text-[13px] font-medium text-slate-900 truncate">{e.title}</span><span className="text-xs text-slate-500 ml-auto truncate">{e.subject}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-600 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden/> System live</span>
            <button onClick={()=> navigate('/student/tests')} className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 relative" aria-label="Notifications">
              <Bell className="h-4 w-4 text-slate-600" aria-hidden/>
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full border border-white" aria-hidden />
            </button>
            <div ref={profileRef} className="relative">
              <button onClick={()=> setProfileOpen(v=>!v)} className="hidden lg:flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200" aria-haspopup="menu" aria-expanded={profileOpen}>
                <GeneratedAvatar name={displayName} size={28} />
                <div className="text-left leading-tight hidden xl:block">
                  <div className="text-[13px] font-medium text-slate-900 leading-none truncate max-w-[120px]">{displayName}</div>
                  <div className="text-[11px] font-mono text-slate-500 truncate max-w-[120px]">{studentId}</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden xl:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden z-30" role="menu">
                  <div className="px-3 py-3 border-b border-slate-100 flex items-center gap-3">
                    <GeneratedAvatar name={displayName} size={36} />
                    <div className="min-w-0"><div className="text-[13px] font-medium text-slate-900 truncate">{displayName}</div><div className="text-xs font-mono text-slate-500 truncate">{studentId}</div></div>
                  </div>
                  <div className="p-1">
                    <button onClick={()=>{ setProfileOpen(false); navigate('/student/profile')}} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2" role="menuitem"><User className="h-4 w-4"/> Profile</button>
                    <button onClick={()=>{ setProfileOpen(false); navigate('/student/settings')}} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2" role="menuitem"><Settings className="h-4 w-4"/> Settings</button>
                    <a href="#" onClick={(e)=> e.preventDefault()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50" role="menuitem"><HelpCircle className="h-4 w-4"/> Help</a>
                    <div className="h-px bg-slate-100 my-1" />
                    <button onClick={async()=>{ await logout(); navigate('/student/login')}} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2" role="menuitem"><LogOut className="h-4 w-4"/> Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 lg:px-6 py-6 max-w-[1120px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
