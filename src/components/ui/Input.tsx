import * as React from "react"
import { cn } from "@/lib/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string }
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({className, label, hint, error, id, ...props}, ref) => {
  const autoId = React.useId()
  const inputId = id || autoId
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="text-[13px] font-medium text-slate-700">{label} {props.required && <span className="text-red-600" aria-hidden>*</span>}</label>}
      <input
        id={inputId}
        ref={ref}
        className={cn("w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition", error && "border-red-300 focus:border-red-500 focus:ring-red-500/20", className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error ? <p id={`${inputId}-error`} className="text-xs text-red-600 leading-4" role="alert">{error}</p> : hint ? <p id={`${inputId}-hint`} className="text-xs text-slate-500 leading-4">{hint}</p> : null}
    </div>
  )
})
Input.displayName="Input"

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & {label?:string; error?:string; hint?:string}>(({className, label, error, hint, id, ...props}, ref)=>{
  const autoId = React.useId()
  const inputId = id || autoId
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="text-[13px] font-medium text-slate-700">{label} {props.required && <span className="text-red-600">*</span>}</label>}
      <textarea ref={ref} id={inputId} className={cn("w-full min-h-[96px] rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20", error && "border-red-300 focus:border-red-500 focus:ring-red-500/20", className)} {...props} />
      {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
})
Textarea.displayName="Textarea"

export function Select({label, error, hint, children, className, ...props}: React.SelectHTMLAttributes<HTMLSelectElement> & {label?:string; error?:string; hint?:string}) {
  const autoId = React.useId()
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={autoId} className="text-[13px] font-medium text-slate-700">{label} {props.required && <span className="text-red-600">*</span>}</label>}
      <select id={autoId} className={cn("w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-[14px] text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20", error && "border-red-300", className)} {...props}>{children}</select>
      {error ? <p className="text-xs text-red-600" role="alert">{error}</p> : hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function SearchInput({value, onChange, placeholder="Search..."}:{value:string; onChange:(v:string)=>void; placeholder?:string}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-[14px] placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
    </div>
  )
}
