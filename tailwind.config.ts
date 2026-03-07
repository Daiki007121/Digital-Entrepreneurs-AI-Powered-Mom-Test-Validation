import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6366F1",
          light: "#818CF8",
          dark: "#4F46E5",
        },
        cta: {
          DEFAULT: "#10B981",
          light: "#34D399",
          dark: "#059669",
        },
        surface: {
          light: "#F5F3FF",
          DEFAULT: "#FFFFFF",
          dark: "#1E1B4B",
        },
        text: {
          DEFAULT: "#1E1B4B",
          muted: "#64748B",
          inverted: "#F8FAFC",
        },
      },
      fontFamily: {
        heading: ["Fira Code", "monospace"],
        body: ["Fira Sans", "sans-serif"],
      },
      backdropBlur: {
        glass: "16px",
      },
      boxShadow: {
        glass: "0 4px 30px rgba(0, 0, 0, 0.08)",
        "glass-lg": "0 8px 32px rgba(0, 0, 0, 0.12)",
        aurora: "0 0 80px rgba(99, 102, 241, 0.15), 0 0 160px rgba(16, 185, 129, 0.1)",
      },
      borderRadius: {
        glass: "16px",
      },
      animation: {
        "aurora-shift": "auroraShift 8s ease-in-out infinite",
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 300ms ease-out",
        "spin-slow": "spin 1.5s linear infinite",
      },
      keyframes: {
        auroraShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
