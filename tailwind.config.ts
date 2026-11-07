import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fbf3f3",
          100: "#f7e3e4",
          200: "#eec3c6",
          300: "#e09a9f",
          400: "#c96770",
          500: "#a93f4b",
          600: "#8f2d38",
          700: "#7a1f2b",
          800: "#651923",
          900: "#4d131a",
        },
        gold: {
          50: "#fdf9ec",
          100: "#faf0c9",
          200: "#f5df8f",
          300: "#eecb58",
          400: "#e7bf4d",
          500: "#d4a72c",
          600: "#b68b1c",
          700: "#916a17",
        },
        ink: "#1f1a17",
        muted: "#6b625c",
        line: "#e7dfd7",
        cream: "#faf7f2",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,26,23,0.04), 0 10px 30px -18px rgba(31,26,23,0.28)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
