export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /(bg|text|border|ring|backdrop|data)-.*/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
