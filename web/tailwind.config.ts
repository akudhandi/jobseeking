import type { Config } from "tailwindcss";

/**
 * Design tokens for the "command center" look: a light canvas, one floating
 * surface with hairline borders, near-black ink for display numbers, and a
 * single coral accent reserved for calls to action. Chart series colours live
 * here too so a chart and its legend can never drift apart.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Canvas behind the floating app surface, and the surface itself.
        canvas: "#ECECEE",
        surface: "#FFFFFF",
        // Text: near-black ink for numbers/titles, soft for secondary copy.
        ink: { DEFAULT: "#0B0B0D", soft: "#3C3F45" },
        // Hairlines. "line" is the card edge, "line-strong" for hover/active.
        line: { DEFAULT: "#ECECEF", strong: "#DCDCE1" },
        coral: { DEFAULT: "#E23A0E", bright: "#FF4D2E", soft: "#FFE7E0" },
        mint: { DEFAULT: "#2FB968", soft: "#DDF5E7" },
        sun: { DEFAULT: "#D89012", soft: "#FBEFD5" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 6px)",
        sm: "calc(var(--radius) - 10px)",
        card: "1.375rem",
        shell: "1.75rem",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04)",
        pill: "0 1px 2px rgba(16,24,40,0.06), 0 10px 24px -16px rgba(16,24,40,0.35)",
        pop: "0 16px 48px -18px rgba(16,24,40,0.32)",
      },
      transitionTimingFunction: {
        swift: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
