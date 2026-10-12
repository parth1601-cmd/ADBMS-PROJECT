import * as React from "react"
import { getAvatarColor, getInitials } from "@/lib/avatar"

export function GeneratedAvatar({
  name,
  size = 40,
  className,
  showBorder = true,
  rounded = true,
}: {
  name: string
  size?: number
  className?: string
  showBorder?: boolean
  rounded?: boolean
}) {
  const { bg, fg, border } = getAvatarColor(name)
  const initials = getInitials(name)
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        borderColor: showBorder ? border : "transparent",
        fontSize: size * 0.36,
        borderRadius: rounded ? 999 : size * 0.22,
      }}
      aria-label={name}
      role="img"
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: rounded ? 999 : size * 0.22,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: showBorder ? 1 : 0,
          borderStyle: "solid",
          borderColor: showBorder ? border : "transparent",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          fontFamily: "Inter, ui-sans-serif, system-ui",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* subtle highlight for depth */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: rounded ? 999 : size * 0.22,
            background: `radial-gradient(60% 60% at 30% 28%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0) 60%)`,
            pointerEvents: "none",
          }}
        />
        <span style={{ position: "relative", lineHeight: 1 }}>{initials.slice(0, 2)}</span>
      </span>
    </span>
  )
}

// Drop-in replacement for <img src={pravatar}> — same API shape
export function PhotoAvatar({
  name,
  size = 40,
  className,
  id, // optional deterministic id for color stability
}: {
  name: string
  size?: number
  className?: string
  id?: string
}) {
  // id can be used to stabilize color when name duplicates
  const key = id ? `${name}-${id}` : name
  return <GeneratedAvatar name={key} size={size} className={className} />
}
