/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F8F7FF',
          100: '#EEECFE',
          500: '#6C5CE7',
          600: '#5A4BD6',
          700: '#4839C5',
        },
      },
    },
  },
  plugins: [],
};
