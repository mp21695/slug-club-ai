/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slytherin: {
          darkest: '#040906',
          dungeon: '#08120C',
          panel: '#0D1C13',
          border: 'rgba(16, 185, 129, 0.2)',
          emerald: '#10B981',
          emeraldDark: '#059669',
          emeraldDeep: '#02401B',
          silver: '#C8D1CC',
          silverLight: '#E8ECE9',
          silverMuted: '#84938A',
          gold: '#D4AF37',
          goldWarm: '#F59E0B',
          ruby: '#EF4444'
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
