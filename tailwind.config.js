/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'segro-red': '#C8191F',
        'segro-red-dark': '#9E0000',
        'segro-teal': '#73AFB6',
        'segro-teal-accent': '#00AAA5',
        'segro-charcoal': '#2B2B2B',
        'segro-midgray': '#4B4951',
        'segro-lightgray': '#EAEAEA',
        'segro-offwhite': '#F3F8FD',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
