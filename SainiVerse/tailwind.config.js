/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '440px',
      },
      colors: {
        pastel: {
          pink: '#FFF1F2',
          rose: '#FDF2F8',
          blush: '#FCE7F3',
          card: 'rgba(255, 255, 255, 0.85)',
          border: 'rgba(244, 63, 94, 0.15)',
        },
        rose: {
          50: '#fff1f3',
          100: '#ffe4e8',
          200: '#fecdd6',
          300: '#fda4b4',
          400: '#fb718e',
          500: '#f43f6e',
          600: '#e11d58',
          700: '#be1249',
          800: '#9f1240',
          900: '#88133b',
          950: '#4c051d',
        },
        vault: {
          dark: '#0d0d11',
          card: '#16161f',
          surface: '#1c1c28',
          border: '#2a2a3c',
          muted: '#8e8ea0',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        arizonia: ['"Arizonia"', 'cursive'],
        berkshire: ['"Berkshire Swash"', 'cursive'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'heartbeat': 'heartbeat 1.8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.12)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.08)' },
          '70%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
