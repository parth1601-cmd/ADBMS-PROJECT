import * as React from "react"

// All illustrations are self-generated SVGs — no external images, consistent with design system

export function HeroDashboardPreview({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="space-y-3">
        {/* Stats row - realistic */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <div className="text-[9px] font-semibold tracking-widest uppercase text-slate-500">Active exams</div>
            <div className="text-[16px] font-bold text-slate-900 leading-none mt-1">4</div>
            <div className="text-[10px] text-slate-500">Live & scheduled</div>
            <div className="mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden"><div className="h-full w-[70%] bg-slate-900 rounded-full"/></div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5">
            <div className="text-[9px] font-semibold tracking-widest uppercase text-slate-500">Students</div>
            <div className="text-[16px] font-bold text-slate-900 leading-none mt-1">142</div>
            <div className="text-[10px] text-slate-500">Total enrolled</div>
            <div className="flex -space-x-1 mt-1.5"><span className="h-5 w-5 rounded-full bg-indigo-100 border border-white grid place-items-center text-[9px] font-bold text-indigo-700">A</span><span className="h-5 w-5 rounded-full bg-amber-100 border border-white grid place-items-center text-[9px] font-bold text-amber-700">R</span><span className="h-5 w-5 rounded-full bg-emerald-100 border border-white grid place-items-center text-[9px] font-bold text-emerald-700">S</span><span className="h-5 w-5 rounded-full bg-slate-900 text-white border border-white grid place-items-center text-[8px]">+139</span></div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <div className="text-[9px] font-semibold tracking-widest uppercase text-amber-700">Needs review</div>
            <div className="text-[16px] font-bold text-amber-900 leading-none mt-1">5</div>
            <div className="text-[10px] text-amber-700">Awaiting decision</div>
            <div className="mt-1.5 inline-flex px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-bold">High priority: 2</div>
          </div>
        </div>
        {/* Review distribution + score */}
        <div className="grid grid-cols-[1.1fr_0.9fr] gap-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-semibold text-slate-900">Review distribution</div>
            <div className="flex items-end gap-1 mt-2 h-[48px]">
              <div className="flex-1 bg-emerald-100 border border-emerald-200 rounded-t flex flex-col justify-end items-center pb-1" style={{height:'32%'}}><span className="text-[9px] font-bold text-emerald-700">1</span></div>
              <div className="flex-1 bg-sky-100 border border-sky-200 rounded-t flex flex-col justify-end items-center pb-1" style={{height:'45%'}}><span className="text-[9px] font-bold text-sky-700">2</span></div>
              <div className="flex-1 bg-amber-100 border border-amber-200 rounded-t flex flex-col justify-end items-center pb-1" style={{height:'75%'}}><span className="text-[9px] font-bold text-amber-700">3</span></div>
              <div className="flex-1 bg-red-100 border border-red-200 rounded-t flex flex-col justify-end items-center pb-1" style={{height:'58%'}}><span className="text-[9px] font-bold text-red-700">2</span></div>
            </div>
            <div className="flex justify-between mt-1 text-[8px] font-medium text-slate-500"><span>Normal</span><span>Low</span><span>Review</span><span>High</span></div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col items-center justify-center text-center">
            <div className="relative h-14 w-14">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90"><circle cx="18" cy="18" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3.5"/><circle cx="18" cy="18" r="14" fill="none" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="68 22" /></svg>
              <div className="absolute inset-0 grid place-items-center"><span className="text-[12px] font-bold text-slate-900">78</span></div>
            </div>
            <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-500 mt-1">Integrity score</div>
            <div className="mt-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold">Requires Review</div>
          </div>
        </div>
        {/* Recent activity */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between"><div className="text-[11px] font-semibold text-slate-900">Recent activity</div><span className="text-[9px] text-slate-500">Today</span></div>
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-2 items-center"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/><span className="text-[10px] font-medium text-slate-700">Aarav Sharma submitted</span><span className="ml-auto text-[9px] text-slate-500">09:58</span></div>
            <div className="flex gap-2 items-center"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"/><span className="text-[10px] font-medium text-slate-700">New review — Ananya Patel</span><span className="ml-auto text-[9px] text-slate-500">09:55</span></div>
            <div className="flex gap-2 items-center"><span className="h-1.5 w-1.5 rounded-full bg-slate-300"/><span className="text-[10px] font-medium text-slate-700">Exam published — Mathematics</span><span className="ml-auto text-[9px] text-slate-500">Yesterday</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EmptyExamsIllustration({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="No exams">
        <rect x="40" y="18" width="160" height="104" rx="12" fill="white" stroke="#E2E8F0" />
        <rect x="56" y="36" width="112" height="8" rx="4" fill="#F1F5F9" />
        <rect x="56" y="52" width="80" height="6" rx="3" fill="#E2E8F0" />
        <rect x="56" y="68" width="128" height="28" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
        <circle cx="120" cy="98" r="14" fill="none" stroke="#CBD5E1" strokeWidth="1.2" strokeDasharray="3 3" />
        <path d="M114 98 L118 102 L126 92" stroke="#64748B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  )
}

export function EmptyReviewsIllustration({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg">
        <rect x="48" y="22" width="144" height="96" rx="12" fill="white" stroke="#E2E8F0" />
        {/* shield */}
        <path d="M120 38 L138 46 V62 C138 72 132 80 120 86 C108 80 102 72 102 62 V46 L120 38Z" fill="none" stroke="#CBD5E1" strokeWidth="1.3" />
        <path d="M112 62 L117 67 L128 56" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="72" y="96" width="96" height="6" rx="3" fill="#F1F5F9" />
        <rect x="84" y="106" width="72" height="6" rx="3" fill="#E2E8F0" />
      </svg>
    </div>
  )
}

export function StudentHeroPattern({ className }: { className?: string }) {
  // Subtle grid + document icons for StudentLogin left panel — replaces heavy gradients
  return (
    <svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="600" height="600" fill="url(#grid)" />
      <g opacity="0.14">
        <rect x="80" y="80" width="120" height="84" rx="10" fill="white" />
        <rect x="320" y="120" width="120" height="84" rx="10" fill="white" />
        <rect x="140" y="260" width="120" height="84" rx="10" fill="white" />
      </g>
      <circle cx="480" cy="480" r="120" fill="none" stroke="white" strokeOpacity="0.07" strokeWidth="1" />
      <circle cx="480" cy="480" r="84" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
    </svg>
  )
}

export function TeacherHeroPattern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <pattern id="tgrid" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" fill="white" opacity="0.07" />
        </pattern>
      </defs>
      <rect width="600" height="600" fill="url(#tgrid)" />
      <g opacity="0.12">
        <rect x="90" y="90" width="440" height="1" fill="white" />
        <rect x="90" y="140" width="440" height="1" fill="white" opacity="0.6" />
        <rect x="90" y="190" width="440" height="1" fill="white" opacity="0.3" />
      </g>
      <circle cx="120" cy="500" r="90" fill="none" stroke="white" strokeOpacity="0.06" />
    </svg>
  )
}
