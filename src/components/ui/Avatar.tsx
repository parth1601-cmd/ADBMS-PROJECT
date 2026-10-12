import * as React from "react"
import { cn } from "@/lib/cn"
export function Avatar({src, alt, fallback, size=32, className}:{src?:string; alt?:string; fallback: string; size?: number; className?:string}) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 overflow-hidden shrink-0", className)}
      style={{width:size, height:size, fontSize: size*0.38}}
      aria-label={alt}
    >
      {src ? <img src={src} alt={alt ?? ""} className="w-full h-full object-cover" /> : fallback.slice(0,2).toUpperCase()}
    </span>
  )
}
