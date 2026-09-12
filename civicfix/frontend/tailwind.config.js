/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'IBM Plex Sans'", "sans-serif"],
      },
      colors: {
        canvas: "var(--bg)",
        inknew: "var(--ink)",
        muted: "var(--muted)",
        glass: "var(--surface)",
        "glass-strong": "var(--surface-strong)",
        accent: "var(--accent)",
        violet: "var(--violet)",
        brand: "var(--primary)",
        paper: "#FFFAF2",
        ink: "#17252B",
        inksoft: "#58666A",
        primary: { DEFAULT: "#126B63", deep: "#173B43", tint: "#DCEFEB" },
        urgent: { DEFAULT: "#BD503D", tint: "#FFF1ED" },
        high: { DEFAULT: "#B77A24", tint: "#FFF7E5" },
        medium: { DEFAULT: "#7C8C3E", tint: "#EFF2E2" },
        low: { DEFAULT: "#46708A", tint: "#E4EBEF" },
        line: "#D8D5CC",
        linestrong: "#B9B8B0",
      },
      boxShadow: {
        glass: "var(--shadow)",
        glow: "0 0 28px rgba(67, 215, 202, .2)",
      },
      borderRadius: {
        panel: "20px",
      },
      keyframes: {
        "soft-rise": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 rgba(67, 215, 202, 0)" },
          "50%": { boxShadow: "0 0 24px rgba(67, 215, 202, .25)" },
        },
      },
      animation: {
        "soft-rise": "soft-rise .45s ease both",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
