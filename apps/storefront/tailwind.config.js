/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-satoshi)', 'sans-serif'],
        display: ['var(--font-cabinet)', 'sans-serif'],
        serif: ['var(--font-bodoni-moda)', 'serif'],
      },
      colors: {
        brand: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#b08968', // Base Warm Earth
          600: '#9d7a5c',
          700: '#7f624b',
          800: '#6c5340',
          900: '#4b3a2d',
        },
        stone: {
          850: '#1c1917',
          950: '#0c0a09',
        }
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      animation: {
        'slow-pan': 'pan 30s linear infinite',
      },
      keyframes: {
        pan: {
          '0%': { transform: 'scale(1.1) translateX(0)' },
          '100%': { transform: 'scale(1.1) translateX(-5%)' },
        }
      }
    },
  },
  plugins: [],
}
