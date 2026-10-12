import * as React from "react"
import { cn } from "@/lib/cn"

export function Card({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-white border border-slate-200 rounded-xl shadow-subtle", className)} {...props} />
}
export function CardHeader({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-3", className)} {...props} />
}
export function CardTitle({className, ...props}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-[14px] font-semibold tracking-tight text-slate-900 leading-5", className)} {...props} />
}
export function CardDescription({className, ...props}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[13px] text-slate-600 leading-5 mt-1", className)} {...props} />
}
export function CardContent({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />
}
export function CardFooter({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0 flex items-center gap-2", className)} {...props} />
}
