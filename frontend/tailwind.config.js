module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#f8f9f8",
          100: "#f2f3f2",
          200: "#dde0de",
          300: "#c6cac7",
          400: "#b4b7b5",
          500: "#858987",
          600: "#6b706d",
          700: "#2b2e2c",
          800: "#1e293b",
          900: "#242725",
          950: "#1D201F",
        },
        app: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#b9ccff",
          300: "#8aa9ff",
          400: "#5b82ff",
          500: "#345cff",
          600: "#2445db",
          700: "#1f39b3",
          800: "#1e3490",
          900: "#1d2f75",
        },
      },
      boxShadow: {
        soft: "0 20px 60px rgba(0, 0, 0, 0.28)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
