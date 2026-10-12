import { useState, useEffect, useRef } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, FileText, Users, ShieldAlert, BarChart3, Settings, HelpCircle, Menu, X, Bell, Search, LogOut, PanelLeftClose, PanelLeftOpen, User, ChevronDown, Monitor, Radio } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/cn"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/services/api"
import { Logo } from "@/components/brand/Logo"
import { GeneratedAvatar } from "@/components/brand/GeneratedAvatar"

const teachingNav = [
  {to:"/teacher/dashboard", label:"Dashboard", icon:LayoutDashboard},
  {to:"/teacher/exams", label:"Exams", icon:FileText},
  {to:"/teacher/live-monitor", label:"Live Monitor", icon:Monitor},
  {to:"/teacher/students", label:"Students", icon:Users},
  {to:"/teacher/reviews", label:"Reviews", icon:ShieldAlert},
  {to:"/teacher/integrity-reviews", label:"Integrity Reviews", icon:ShieldAlert},
  {to:"/teacher/analytics", label:"Analytics", icon:BarChart3},
  {to:"/teacher/reports", label:"Reports", icon:BarChart3},
  {to:"/teacher/grading", label:"Grading", icon:Radio},
]

const systemNav = [
  {to:"/teacher/audit-log", label:"Audit Log", icon:FileText},
  {to:"/teacher/notifications", label:"Notifications", icon:Bell},
  {to:"/teacher/settings", label:"Settings", icon:Settings},
]

export default function TeacherLayout(){
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const loc = useLocation()
  const navHook = useNavigate()
  const {user, logout} = useAuth()
  const [notifCount,setNotifCount]=useState(0)
  const [searchQ,setSearchQ]=useState("")
  const [searchResults, setSearchResults] = useState<{exams:any[], students:any[], reviews:any[]}>({exams: [], students: [], reviews: []})
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [pendingCount,setPendingCount]=useState(0)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{
    api.get<any[]>('/notifications').then(n=> setNotifCount(n.filter(x=>!x.read).length)).catch(()=>{})
    import("@/services/apiServices").then(m=> m.reviewApi.getReviews({status:'Pending'}).then(r=> setPendingCount(r.length)).catch(()=>{}))
  },[])

  // global search debounce
  useEffect(()=>{
    if(!searchQ.trim()){ setSearchResults({exams:[], students:[], reviews:[]}); setSearchOpen(false); return }
    const id = setTimeout(async()=>{
      setSearchLoading(true)
      setSearchOpen(true)
      try{
        const [{exams: apiExams}, students, reviews] = await Promise.all([
          import("@/services/apiServices").then(m=> m.examApi.getExams({search: searchQ}).then(exams=> ({exams})).catch(()=> ({exams:[]}))),
          api.get<any[]>('/users/students').then(s=> s.filter((x:any)=> x.name.toLowerCase().includes(searchQ.toLowerCase())).slice(0,3)).catch(()=>[]),
          import("@/services/apiServices").then(m=> m.reviewApi.getReviews({search: searchQ}).then((r:any[])=> r.slice(0,3)).catch(()=> [])),
        ])
        setSearchResults({exams: (apiExams as any[]).slice(0,3), students, reviews})
      }catch{ setSearchResults({exams:[], students:[], reviews:[]}) }
      finally{ setSearchLoading(false)}
    }, 300)
    return ()=> clearTimeout(id)
  },[searchQ])

  useEffect(()=>{
    const h = (e:MouseEvent)=>{ if(searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false); if(profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)}
    document.addEventListener('mousedown', h)
    return ()=> document.removeEventListener('mousedown', h)
  },[])

  const titleMap: Record<string,string> = {
    "/teacher/dashboard":"Dashboard",
    "/teacher/exams":"Exams",
    "/teacher/reviews":"Reviews",
    "/teacher/students":"Students",
    "/teacher/reports":"Reports",
    "/teacher/settings":"Settings",
  }
  const title = titleMap[loc.pathname] || loc.pathname.split("/").filter(Boolean).pop()?.replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()) || "Teacher"

  const NavItem = ({to,label,icon:Icon, badge}:{to:string; label:string; icon:any; badge?:number}) => (
    <NavLink to={to} title={collapsed ? label : undefined} className={({isActive})=>cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors", collapsed && "justify-center px-2", isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge ? <span className="ml-auto min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-amber-500 text-white text-[11px] font-bold leading-none">{badge>99? '99+': badge}</span> : null}
      {collapsed && badge ? <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full" /> : null}
    </NavLink>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar desktop */}
      <aside className={cn("hidden lg:flex shrink-0 flex-col bg-white border-r border-slate-200 sticky top-0 h-screen transition-all duration-200", collapsed ? "w-[64px]" : "w-[256px]")}>
        <div className="h-[56px] flex items-center gap-2.5 px-3 border-b border-slate-200">
          <Logo size={28} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold tracking-tight text-slate-900 leading-none">ExamGuard</div>
              <div className="text-[10px] font-medium tracking-widest uppercase text-slate-500">Teacher</div>
            </div>
          )}
          <button onClick={()=> setCollapsed(v=>!v)} className="ml-auto h-7 w-7 grid place-items-center rounded-md hover:bg-slate-100 text-slate-500 hidden lg:grid" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen className="h-4 w-4"/> : <PanelLeftClose className="h-4 w-4"/>}</button>
        </div>

        <div className="flex-1 overflow-auto py-4 px-2 space-y-6">
          <div>
            {!collapsed && <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Teaching</div>}
            <nav className="space-y-0.5 relative" aria-label="Teaching">
              {teachingNav.map(i=>(
                <NavItem key={i.to} to={i.to} label={i.label} icon={i.icon} badge={i.label==="Reviews" && pendingCount>0 ? pendingCount : undefined} />
              ))}
            </nav>
          </div>
          <div>
            {!collapsed && <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-slate-400">System</div>}
            <nav className="space-y-0.5" aria-label="System">
              {systemNav.map(i=> <NavItem key={i.to} to={i.to} label={i.label} icon={i.icon} />)}
              {!collapsed && <a href="#" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"><HelpCircle className="h-4 w-4" aria-hidden/> Help</a>}
              {collapsed && <a href="#" title="Help" className="flex items-center justify-center px-2 py-2 rounded-lg text-slate-600 hover:bg-slate-100"><HelpCircle className="h-4 w-4"/></a>}
            </nav>
          </div>
        </div>

        <div className="p-2 border-t border-slate-200">
          {!collapsed ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <GeneratedAvatar name={user?.name || 'Teacher'} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-slate-900 leading-none truncate">{user?.name || 'Teacher'}</div>
                <div className="text-xs text-slate-500 truncate">{user?.email || ''}</div>
              </div>
              <button onClick={async()=>{ await logout(); navHook('/teacher/login')}} className="h-7 w-7 grid place-items-center rounded-md hover:bg-slate-100 text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Log out"><LogOut className="h-4 w-4" aria-hidden /></button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <GeneratedAvatar name={user?.name || 'Teacher'} size={32} />
              <button onClick={async()=>{ await logout(); navHook('/teacher/login')}} className="h-7 w-7 grid place-items-center rounded-md hover:bg-slate-100 text-slate-500" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/30" onClick={()=>setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white border-r border-slate-200 flex flex-col">
            <div className="h-[56px] flex items-center justify-between px-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5"><Logo size={28} /><span className="text-[13px] font-semibold">ExamGuard</span><span className="text-[10px] tracking-widest uppercase text-slate-500 ml-1">Teacher</span></div>
              <button onClick={()=>setMobileOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100" aria-label="Close navigation"><X className="h-4 w-4" aria-hidden/></button>
            </div>
            <nav className="flex-1 py-4 px-3 space-y-6 overflow-auto">
              <div>
                <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Teaching</div>
                <div className="space-y-1">
                  {teachingNav.map(i=>{
                    const Icon=i.icon
                    return <NavLink key={i.to} to={i.to} onClick={()=>setMobileOpen(false)} className={({isActive})=>cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium", isActive? "bg-slate-900 text-white":"text-slate-600 hover:bg-slate-100")}>
                      <Icon className="h-4 w-4"/>{i.label}
                    </NavLink>
                  })}
                </div>
              </div>
              <div>
                <div className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest uppercase text-slate-400">System</div>
                <div className="space-y-1">
                  {systemNav.map(i=>{
                    const Icon=i.icon
                    return <NavLink key={i.to} to={i.to} onClick={()=>setMobileOpen(false)} className={({isActive})=>cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium", isActive? "bg-slate-900 text-white":"text-slate-600 hover:bg-slate-100")}>
                      <Icon className="h-4 w-4"/>{i.label}
                    </NavLink>
                  })}
                </div>
              </div>
            </nav>
            <div className="p-3 border-t border-slate-200 flex items-center gap-3">
              <GeneratedAvatar name={user?.name || 'Teacher'} size={32} />
              <div className="min-w-0 flex-1"><div className="text-[13px] font-medium truncate">{user?.name}</div><div className="text-xs text-slate-500 truncate">{user?.email}</div></div>
              <button onClick={async()=>{ await logout(); navHook('/teacher/login')}} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-[56px] bg-white border-b border-slate-200 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
          <Button variant="ghost" size="icon" className="lg:hidden -ml-1" onClick={()=>setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" aria-hidden/></Button>
          <div className="hidden lg:block text-[14px] font-semibold text-slate-900 min-w-0 truncate">{title}</div>
          <div className="flex-1 flex justify-center lg:justify-end">
            <div ref={searchRef} className="hidden md:flex items-center w-full max-w-[420px] relative">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
                <input value={searchQ} onChange={e=> setSearchQ(e.target.value)} onFocus={()=> searchQ && setSearchOpen(true)} onKeyDown={e=>{ if(e.key==='Enter' && searchQ){ navHook(`/teacher/exams?search=${encodeURIComponent(searchQ)}`); setSearchOpen(false) }}} placeholder="Search exams, students, reviews…" className="w-full h-8 pl-9 pr-9 rounded-lg border border-slate-300 bg-slate-50 text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white" aria-label="Search" />
                {searchQ && <button onClick={()=>{ setSearchQ(""); setSearchOpen(false)}} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-md hover:bg-slate-100 text-slate-500" aria-label="Clear search"><X className="h-3.5 w-3.5"/></button>}
              </div>
              {searchOpen && (
                <div className="absolute top-10 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden z-30 max-h-[420px] overflow-auto">
                  {searchLoading ? (
                    <div className="p-4 text-center text-sm text-slate-500">Searching…</div>
                  ) : (
                    <div className="p-2 space-y-3">
                      {searchResults.exams.length===0 && searchResults.students.length===0 && searchResults.reviews.length===0 ? (
                        <div className="p-6 text-center">
                          <div className="text-sm text-slate-700">No results for “{searchQ}”</div>
                          <div className="text-xs text-slate-500 mt-1">Try another keyword or check filters.</div>
                        </div>
                      ) : (
                        <>
                          {searchResults.exams.length>0 && (
                            <div>
                              <div className="px-2 py-1 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Exams</div>
                              {searchResults.exams.map((e:any)=> (
                                <button key={e.id} onClick={()=>{ setSearchOpen(false); navHook(`/teacher/exams/${e.id}`)}} className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-slate-500"/><span className="text-[13px] font-medium text-slate-900 truncate">{e.title}</span><span className="text-xs text-slate-500 ml-auto truncate">{e.subject}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchResults.students.length>0 && (
                            <div>
                              <div className="px-2 py-1 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Students</div>
                              {searchResults.students.map((s:any)=> (
                                <button key={s.id} onClick={()=>{ setSearchOpen(false); navHook(`/teacher/students`)}} className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                                  <GeneratedAvatar name={s.name} size={24}/><span className="text-[13px] text-slate-900 truncate">{s.name}</span><span className="text-xs text-slate-500 ml-auto truncate">{s.email}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {searchResults.reviews.length>0 && (
                            <div>
                              <div className="px-2 py-1 text-[11px] font-semibold tracking-widest uppercase text-slate-400">Integrity reviews</div>
                              {searchResults.reviews.map((r:any)=> (
                                <button key={r.id} onClick={()=>{ setSearchOpen(false); navHook(`/teacher/integrity-reviews/${r.id}`)}} className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2">
                                  <ShieldAlert className="h-4 w-4 text-amber-600"/><span className="text-[13px] text-slate-900 truncate">{r.student?.name || r.studentId}</span><span className="text-xs text-slate-500 ml-auto">{r.score}/100</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <div className="border-t border-slate-100 pt-2 flex justify-center">
                        <button onClick={()=>{ setSearchOpen(false); navHook(`/teacher/exams?search=${encodeURIComponent(searchQ)}`); setSearchQ("")}} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all results →</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={()=> navHook('/teacher/notifications')} className="relative h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={notifCount>0 ? `${notifCount} unread notifications` : "No new notifications"}><Bell className="h-4 w-4 text-slate-600" aria-hidden/>{notifCount>0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 grid place-items-center bg-red-600 text-white text-[10px] font-bold rounded-full leading-none">{notifCount>9? '9+': notifCount}</span>}</button>
            <div ref={profileRef} className="relative">
              <button onClick={()=> setProfileOpen(v=>!v)} className="hidden sm:flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-haspopup="menu" aria-expanded={profileOpen}>
                <GeneratedAvatar name={user?.name || 'Teacher'} size={28} />
                <div className="hidden lg:block text-left leading-tight">
                  <div className="text-[13px] font-medium text-slate-900 leading-none truncate max-w-[140px]">{user?.name || 'Teacher'}</div>
                  <div className="text-[11px] text-slate-500">Teacher</div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden lg:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden z-30" role="menu">
                  <div className="px-3 py-3 border-b border-slate-100 flex items-center gap-3">
                    <GeneratedAvatar name={user?.name || 'Teacher'} size={36} />
                    <div className="min-w-0"><div className="text-[13px] font-medium text-slate-900 truncate">{user?.name}</div><div className="text-xs text-slate-500 truncate">{user?.email}</div></div>
                  </div>
                  <div className="p-1">
                    <button onClick={()=>{ setProfileOpen(false); navHook('/teacher/settings')}} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2" role="menuitem"><User className="h-4 w-4"/> Profile</button>
                    <button onClick={()=>{ setProfileOpen(false); navHook('/teacher/settings')}} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-2" role="menuitem"><Settings className="h-4 w-4"/> Settings</button>
                    <a href="#" onClick={(e)=> e.preventDefault()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50" role="menuitem"><HelpCircle className="h-4 w-4"/> Help</a>
                    <div className="h-px bg-slate-100 my-1" />
                    <button onClick={async()=>{ await logout(); navHook('/teacher/login')}} className="w-full text-left px-3 py-2 rounded-lg text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-2" role="menuitem"><LogOut className="h-4 w-4"/> Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-6 py-6 max-w-[1280px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
