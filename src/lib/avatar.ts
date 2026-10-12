// Deterministic avatar color + initials — generated locally, no external images
const PALETTE = [
  { bg: "#E0E7FF", fg: "#3730A3", border: "#C7D2FE" }, // indigo
  { bg: "#DBEAFE", fg: "#1E40AF", border: "#BFDBFE" }, // blue
  { bg: "#D1FAE5", fg: "#065F46", border: "#A7F3D0" }, // emerald
  { bg: "#FEF3C7", fg: "#92400E", border: "#FDE68A" }, // amber
  { bg: "#FCE7F3", fg: "#9D174D", border: "#FBCFE8" }, // pink
  { bg: "#E0F2FE", fg: "#0C4A6E", border: "#BAE6FD" }, // sky
  { bg: "#EDE9FE", fg: "#5B21B6", border: "#DDD6FE" }, // violet
  { bg: "#F3F4F6", fg: "#1F2937", border: "#E5E7EB" }, // slate
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function getAvatarColor(key: string) {
  const idx = hashString(key) % PALETTE.length
  return PALETTE[idx]
}

export function getInitials(name: string, fallback = "EG"): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Generates a data-URI SVG avatar — usable as <img src>
export function generateAvatarDataUri(name: string, size = 80): string {
  const initials = getInitials(name)
  const { bg, fg, border } = getAvatarColor(name)
  // subtle dot pattern for texture, no external asset
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${name}">
  <rect width="${size}" height="${size}" rx="${size / 2}" fill="${bg}" stroke="${border}" stroke-width="${Math.max(1, size * 0.02)}"/>
  <!-- subtle radial highlight -->
  <circle cx="${size * 0.35}" cy="${size * 0.28}" r="${size * 0.42}" fill="white" opacity="0.18"/>
  <!-- initials -->
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui" font-weight="600" font-size="${size * 0.36}" fill="${fg}" letter-spacing="-0.02em">${initials.slice(0, 2)}</text>
</svg>`.trim()
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

// For use with <GeneratedAvatar /> component
export function avatarProps(name: string) {
  const { bg, fg, border } = getAvatarColor(name)
  return { initials: getInitials(name), bg, fg, border }
}
