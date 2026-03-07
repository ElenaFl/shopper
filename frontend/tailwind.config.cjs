//tailwind.config.cjs
/* eslint-env node */ 
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,html}"],
  theme: {
    extend: {
      spacing: {
        // '45': '11.25rem', // ~180px
        // '55': '13.75rem', // ~220px
        // '22': '5.5rem',   // ~88px
        // '47': '11.75rem', // ~188px
        // '15': '3.75rem',  // ~60px
        '4': '.25rem',  // ~4px
      },
    },
  },
  plugins: [],
}