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
        aviation: {
          darkest: "#050811",
          dark: "#0B1120",
          card: "#0F172A",
          cardBorder: "#1E293B",
          cyan: "#38BDF8",
          blue: "#0284C7",
          amber: "#F59E0B",
          green: "#10B981",
          red: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(56, 189, 248, 0.3)",
        glowAmber: "0 0 25px -5px rgba(245, 158, 11, 0.3)",
        glowGreen: "0 0 25px -5px rgba(16, 185, 129, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;

