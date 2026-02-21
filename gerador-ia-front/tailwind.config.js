module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
        },
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(0,0,0,0.08), 0 8px 16px -6px rgba(0,0,0,0.04)",
        cardHover: "0 12px 40px -8px rgba(0,0,0,0.12), 0 8px 24px -6px rgba(0,0,0,0.06)",
        glow: "0 0 40px -8px rgba(99, 102, 241, 0.35)",
      },
    },
  },
  plugins: [],
}
