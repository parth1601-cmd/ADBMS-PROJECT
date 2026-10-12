/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        muted: "#64748b",
        line: "#e2e8f0",
        paper: "#f8fafc",
        brand: {
          50:"#eef2ff",
          100:"#e0e7ff",
          500:"#4f46e5",
          600:"#4338ca",
          700:"#3730a3",
          900:"#1e1b4b",
        },
        amber: {
          50:"#fffbeb",
          100:"#fef3c7",
          500:"#f59e0b",
          600:"#d97706",
        },
        success: "#059669",
        warning: "#d97706",
        danger: "#dc2626",
        info: "#0284c7",
      },
      fontFamily: {
        sans: ["Inter","ui-sans-serif","system-ui","-apple-system","Segoe UI","Roboto","sans-serif"],
        display: ["Fragment Mono","ui-monospace","monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.06)",
        card: "0 1px 3px rgba(15,23,42,0.08), 0 4px 12px rgba(15,23,42,0.06)",
        subtle: "0 1px 2px rgba(15,23,42,0.05)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-in": { "0%": { transform: "translateY(4px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
      }
    },
  },
  plugins: [],
}
