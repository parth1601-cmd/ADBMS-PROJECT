import { Link } from "react-router-dom"
import { Shield, Eye, FileBarChart, Clock3, Users, Lock, ArrowRight, CheckCircle2, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Alert } from "@/components/ui/Alert"
import { Logo } from "@/components/brand/Logo"
import { HeroDashboardPreview } from "@/components/brand/Illustrations"

export default function LandingPage(){
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1120px] mx-auto px-6 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold tracking-tight text-slate-900">ExamGuard</span>
            <span className="hidden sm:inline-flex ml-2 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-semibold tracking-widest uppercase">Secure • Privacy-first</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/student/login" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3">
              <GraduationCap className="h-4 w-4"/> Student Login
            </Link>
            <Link to="/teacher/login" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3">
              <Shield className="h-4 w-4"/> Teacher Login
            </Link>
            <Link to="/student/login"><Button size="sm" className="bg-[#0f172a] hover:bg-[#1e293b]">Student Portal</Button></Link>
            <Link to="/teacher/login"><Button size="sm" variant="secondary">Teacher Portal</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1120px] mx-auto px-6 pt-12 lg:pt-16 pb-10">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-700">Trusted by educators · Review-first integrity</span>
            </div>
            <h1 className="text-[34px] lg:text-[44px] font-bold tracking-tight text-slate-900 leading-[1.05] mt-5 text-balance">
              Exam Integrity,<br />
              <span className="text-indigo-700">Built for Fair Review</span>
            </h1>
            <p className="text-[15.5px] leading-7 text-slate-600 mt-4 max-w-[560px]">
              ExamGuard combines multiple exam-related behavioral signals to help educators identify unusual activity and prioritize cases for human review.
            </p>
            <Alert variant="neutral" title="Important principle" className="mt-6 max-w-[560px] bg-amber-50 border-amber-200 text-amber-900">
              ExamGuard does not automatically determine whether a student cheated. Every score is a review-priority indicator — not a verdict.
            </Alert>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link to="/student/login" className="flex-1 sm:flex-none"><Button size="lg" className="w-full sm:w-auto gap-2 bg-[#0f172a] hover:bg-[#1e293b]"><GraduationCap className="h-4 w-4"/> Student Login <ArrowRight className="h-4 w-4"/></Button></Link>
              <Link to="/teacher/login" className="flex-1 sm:flex-none"><Button variant="secondary" size="lg" className="w-full sm:w-auto gap-2"><Shield className="h-4 w-4"/> Teacher Login</Button></Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-w-[560px]">
              <Link to="/student/login" className="rounded-2xl border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 p-4 flex items-center gap-3 transition group">
                <div className="h-10 w-10 rounded-xl bg-[#0f172a] grid place-items-center text-white group-hover:scale-105 transition"><GraduationCap className="h-5 w-5"/></div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">Student Website</div>
                  <div className="text-xs text-slate-600">Separate login → /student/login</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900" />
              </Link>
              <Link to="/teacher/login" className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 p-4 flex items-center gap-3 transition group">
                <div className="h-10 w-10 rounded-xl bg-[#1e1b4b] grid place-items-center text-white group-hover:scale-105 transition"><Shield className="h-5 w-5 text-amber-300"/></div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">Teacher Website</div>
                  <div className="text-xs text-slate-600">Separate login → /teacher/login</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900" />
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/> PostgreSQL · Prisma · Secure APIs</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/> Role-based access · Audit logs</span>
            </div>
          </div>

          {/* Dashboard preview — self-generated illustration, no external photo */}
          <div className="relative">
            <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
              <div className="h-9 flex items-center justify-between px-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300"/><span className="h-2 w-2 rounded-full bg-slate-300"/><span className="h-2 w-2 rounded-full bg-slate-300"/></div>
                <span className="text-xs font-medium text-slate-600">Teacher Dashboard — Mathematics Midterm</span>
                <span className="text-xs font-semibold text-slate-700">78 / 100</span>
              </div>
              <div className="p-3">
                <HeroDashboardPreview />
              </div>
            </div>
            <div className="absolute -bottom-3 -right-2 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg hidden lg:flex items-center gap-1.5 border border-slate-800">
              <Shield className="h-3.5 w-3.5 text-white/80" aria-hidden/> Explainable scores
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1120px] mx-auto px-6 pb-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200 grid place-items-center"><Eye className="h-4 w-4 text-indigo-700"/></div>
            <h3 className="text-sm font-semibold text-slate-900 mt-3">Behavioral Signals</h3>
            <p className="text-[13px] leading-5 text-slate-600 mt-1.5">Tab changes, timing, answer revisions, clipboard events and peer synchronization — each as a neutral signal.</p>
          </Card>
          <Card className="p-5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center"><FileBarChart className="h-4 w-4 text-amber-700"/></div>
            <h3 className="text-sm font-semibold text-slate-900 mt-3">Explainable Scores</h3>
            <p className="text-[13px] leading-5 text-slate-600 mt-1.5">0–100 review-priority score with breakdown. “Why this score?” answered in plain language.</p>
          </Card>
          <Card className="p-5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center"><Users className="h-4 w-4 text-emerald-700"/></div>
            <h3 className="text-sm font-semibold text-slate-900 mt-3">Teacher Review</h3>
            <p className="text-[13px] leading-5 text-slate-600 mt-1.5">Queue, filters, timeline, comparison tables and note-taking — built for human judgment.</p>
          </Card>
          <Card className="p-5">
            <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center"><Clock3 className="h-4 w-4 text-slate-700"/></div>
            <h3 className="text-sm font-semibold text-slate-900 mt-3">Evidence Timeline</h3>
            <p className="text-[13px] leading-5 text-slate-600 mt-1.5">Chronological, filterable trail of focus, answer, clipboard and session events.</p>
          </Card>
        </div>
      </section>

      {/* Trust / footer */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-[1120px] mx-auto px-6 py-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 text-[13px] text-slate-600">
            <Lock className="h-4 w-4 text-slate-500"/> Privacy-conscious: exam-scoped signals only. No browsing history. No hidden surveillance.
          </div>
          <div className="text-xs text-slate-500">PostgreSQL · Prisma (3NF) · Server-authoritative timers · Explainable integrity signals</div>
        </div>
      </section>

      <footer className="max-w-[1120px] mx-auto px-6 py-8 text-center text-xs text-slate-500">
        ExamGuard — Secure Assessment & Integrity Platform · Built with React + TypeScript + Tailwind · PostgreSQL & Prisma
      </footer>
    </div>
  )
}
