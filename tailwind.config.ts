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
          50: "#f2f8ef",
          100: "#e4f1df",
          200: "#c8e3bf",
          300: "#a7d294",
          400: "#76bb63",
          500: "#54a94a",
          600: "#398536",
          700: "#2e6d28",
          800: "#235823",
          900: "#173d1c",
        },
        gold: {
          50: "#fafbe9",
          100: "#f2f5d0",
          200: "#e6ebaa",
          300: "#d5dd79",
          400: "#c1ce55",
          500: "#a8b83a",
          600: "#89972d",
          700: "#6a7626",
        },
        ink: "#1b271c",
        muted: "#5f6b60",
        line: "#e0e8dd",
        cream: "#f7faf4",
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
