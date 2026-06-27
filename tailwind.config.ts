import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // iOS-inspired semantic palette driven by CSS variables
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-2": "rgb(var(--ink-2) / <alpha-value>)",
        "ink-3": "rgb(var(--ink-3) / <alpha-value>)",
        tint: "rgb(var(--tint) / <alpha-value>)",
        // Calm area palette
        spiritual: "#8B7FD6",
        wealth: "#3E9B7A",
        health: "#E08A5B",
        relationship: "#D97291",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        ios: "1.25rem",
        "ios-lg": "1.75rem",
      },
      boxShadow: {
        ios: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        "ios-lg": "0 4px 12px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.10)",
        sheet: "0 -8px 40px rgba(0,0,0,0.18)",
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pop": {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 0.36s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 0.25s ease-out",
        "scale-in": "scale-in 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
        "pop": "pop 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
