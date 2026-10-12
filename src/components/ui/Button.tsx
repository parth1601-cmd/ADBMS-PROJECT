import * as React from "react"
import { cn } from "@/lib/cn"

type Variant = "primary"|"secondary"|"ghost"|"outline"|"destructive"
type Size = "sm"|"md"|"lg"|"icon"

const variantCls: Record<Variant,string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 border border-transparent shadow-subtle",
  secondary: "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 border border-slate-200 shadow-subtle",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent",
  outline: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200",
  destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-transparent shadow-subtle"
}
const sizeCls: Record<Size,string> = {
  sm: "h-8 px-3 text-[13px] font-medium rounded-lg",
  md: "h-9 px-3.5 text-[13px] font-medium rounded-lg",
  lg: "h-10 px-5 text-[14px] font-medium rounded-lg",
  icon: "h-9 w-9 p-0 rounded-lg"
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant="primary", size="md", loading, children, disabled, ...props}, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        variantCls[variant], sizeCls[size], className
      )}
      {...props}
    >
      {loading && <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />}
      {children}
    </button>
  )
)
Button.displayName = "Button"
