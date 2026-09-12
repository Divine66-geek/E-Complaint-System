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
    },
  },
  plugins: [],
};
