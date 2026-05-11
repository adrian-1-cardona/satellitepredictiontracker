/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        muted: "var(--muted)",
        "bg-1": "var(--bg-1)",
        "bg-2": "var(--bg-2)",
      },
      backdropFilter: {
        none: "none",
      },
    },
  },
  plugins: [],
}
